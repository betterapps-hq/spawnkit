import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { HttpError } from "./http"

export const agentScopes = ["projects:read", "deployments:write"] as const
export const claimGrant = "urn:workos:agent-auth:grant-type:claim"
export const assertionGrant = "urn:ietf:params:oauth:grant-type:jwt-bearer"
export const hashCredential = (value: string) => createHash("sha256").update(value).digest("hex")
export const agentSecret = (prefix: string) => prefix + randomBytes(32).toString("base64url")
export const nowSeconds = () => Math.floor(Date.now() / 1000)
export type Registration = {
  id: string
  email: string
  project_id: string
  scopes: string
  claim_hash: string
  attempt_hash: string
  code_hash: string
  owner_id: string | null
  status: "pending" | "claimed" | "denied" | "revoked"
  claim_expires_at: number
  grant_expires_at: number | null
  next_poll_at: number
  poll_interval: number
  attempts: number
}

export function agentIssuer(env: Env) {
  const url = new URL(env.DASHBOARD_URL)
  url.hostname = `api.${url.hostname}`
  return url.origin
}

function signingKey(env: Env) {
  if (!env.AGENT_AUTH_SIGNING_KEY || env.AGENT_AUTH_SIGNING_KEY.length < 43)
    throw new HttpError(503, "unavailable", "Agent authorization is not configured.")
  return env.AGENT_AUTH_SIGNING_KEY
}

export function createAssertion(env: Env, registration: Registration) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "oauth-id-jag+jwt" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({
      iss: agentIssuer(env),
      aud: agentIssuer(env),
      sub: registration.id,
      iat: nowSeconds(),
      exp: registration.grant_expires_at,
      jti: crypto.randomUUID()
    })
  ).toString("base64url")
  const signed = `${header}.${payload}`
  return `${signed}.${createHmac("sha256", signingKey(env)).update(signed).digest("base64url")}`
}

export function assertionRegistration(env: Env, assertion: string) {
  try {
    if (assertion.length > 4096) throw new Error("Too long")
    const parts = assertion.split(".")
    if (parts.length !== 3) throw new Error("Malformed")
    const [header, payload, signature] = parts as [string, string, string]
    const expected = createHmac("sha256", signingKey(env)).update(`${header}.${payload}`).digest()
    const actual = Buffer.from(signature, "base64url")
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("Signature")
    const metadata = JSON.parse(Buffer.from(header, "base64url").toString())
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (
      metadata.alg !== "HS256" ||
      metadata.typ !== "oauth-id-jag+jwt" ||
      claims.iss !== agentIssuer(env) ||
      claims.aud !== agentIssuer(env) ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= nowSeconds() ||
      !Number.isInteger(claims.iat) ||
      claims.iat > nowSeconds() + 30 ||
      typeof claims.sub !== "string" ||
      !/^reg_[a-f0-9-]{36}$/.test(claims.sub)
    )
      throw new Error("Claims")
    return claims.sub as string
  } catch {
    throw new HttpError(400, "invalid_grant", "The assertion is invalid or expired. Start authorization again.")
  }
}

export async function agentAudit(env: Env, registration: string, event: string, actor: string | null = null) {
  await env.DATABASE.prepare("INSERT INTO agent_auth_audit VALUES(?,?,?,?,?)")
    .bind(crypto.randomUUID(), registration, event, actor, nowSeconds())
    .run()
}

/** Every remote credential is checked against authoritative D1 state, including revocation. */
export async function authenticateAgent(request: Request, env: Env, token: string): Promise<string> {
  const grant = await env.DATABASE.prepare(`SELECT r.* FROM agent_access_tokens t
    JOIN agent_registrations r ON r.id=t.registration_id
    WHERE t.hash=? AND t.revoked=0 AND t.expires_at>? AND r.status='claimed' AND r.grant_expires_at>?`)
    .bind(hashCredential(token), nowSeconds(), nowSeconds())
    .first<Registration>()
  if (!grant?.owner_id) throw new HttpError(401, "unauthorized", "Agent access is expired or revoked.")
  const path = new URL(request.url).pathname
  const self = `/api/platform/v1/agent/grants/${grant.id}`
  if (path === self && request.method === "DELETE") return grant.owner_id
  const prefix = `/api/platform/v1/projects/${grant.project_id}`
  const suffix = path.startsWith(prefix + "/") ? path.slice(prefix.length) : path === prefix ? "" : null
  const scopes = grant.scopes.split(" ")
  const read =
    request.method === "GET" &&
    scopes.includes("projects:read") &&
    suffix !== null &&
    /^(?:|\/releases|\/deployments\/[A-Za-z0-9_-]{1,128}(?:\/logs)?)$/.test(suffix)
  const write =
    scopes.includes("deployments:write") &&
    suffix !== null &&
    ((request.method === "POST" && /^\/(uploads|deployments|promotions|rollbacks)$/.test(suffix)) ||
      (request.method === "PUT" && /^\/uploads\/[A-Za-z0-9_-]{1,128}$/.test(suffix)))
  if (!read && !write)
    throw new HttpError(403, "insufficient_scope", "This agent is not authorized for that operation or project.")
  return grant.owner_id
}
