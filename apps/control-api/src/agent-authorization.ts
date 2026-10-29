import { randomInt, timingSafeEqual } from "node:crypto"
import { createClerkClient } from "@clerk/backend"
import {
  agentAudit,
  agentIssuer,
  agentScopes,
  agentSecret,
  assertionGrant,
  assertionRegistration,
  claimGrant,
  createAssertion,
  hashCredential,
  nowSeconds,
  type Registration
} from "./agent-credentials"
import { boundedBody, HttpError, jsonBody, requireValue } from "./http"

const response = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "cache-control": "no-store", pragma: "no-cache" }
  })

async function rateLimit(env: Env, key: string, maximum: number, seconds: number) {
  const now = nowSeconds()
  const counter = await env.DATABASE.prepare(`INSERT INTO agent_auth_limits(key,count,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
    expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count`)
    .bind(key, now + seconds, now, now)
    .first<{ count: number }>()
  if (!counter || counter.count > maximum)
    throw new HttpError(429, "rate_limited", "Too many authorization requests. Try again later.")
}

async function formBody(request: Request) {
  requireValue(
    request.headers.get("content-type")?.split(";")[0] === "application/x-www-form-urlencoded",
    "Use a form-encoded request."
  )
  const form = new URLSearchParams(new TextDecoder().decode(await boundedBody(request, 8192)))
  for (const key of form.keys()) requireValue(form.getAll(key).length === 1, "Duplicate form field.")
  return form
}

async function issueToken(env: Env, grant: Registration, assertion: boolean) {
  const now = nowSeconds()
  if (grant.status !== "claimed" || !grant.owner_id || !grant.grant_expires_at || grant.grant_expires_at <= now)
    throw new HttpError(400, "invalid_grant", "Authorization is expired or revoked. Start again.")
  const accessToken = agentSecret("sat_")
  const expires = Math.min(now + 900, grant.grant_expires_at)
  await env.DATABASE.prepare("INSERT INTO agent_access_tokens VALUES(?,?,?,0)")
    .bind(hashCredential(accessToken), grant.id, expires)
    .run()
  await agentAudit(env, grant.id, "token.issued")
  return response({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expires - now,
    scope: grant.scopes,
    ...(assertion
      ? {
          identity_assertion: createAssertion(env, grant),
          assertion_expires: new Date(grant.grant_expires_at * 1000).toISOString(),
          registration_id: grant.id
        }
      : {})
  })
}

export async function agentAuthorizationRoute(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname
  if (
    ![
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-authorization-server",
      "/agent/identity",
      "/oauth2/token",
      "/oauth2/revoke"
    ].includes(path)
  )
    return null
  const issuer = agentIssuer(env)
  const resource = `${new URL(env.DASHBOARD_URL).origin}/api/platform/v1`
  if (request.method === "GET" && path === "/.well-known/oauth-protected-resource")
    return response({
      resource,
      resource_name: "SpawnKit projects",
      authorization_servers: [issuer],
      scopes_supported: agentScopes,
      bearer_methods_supported: ["header"]
    })
  if (request.method === "GET" && path === "/.well-known/oauth-authorization-server")
    return response({
      issuer,
      token_endpoint: `${issuer}/oauth2/token`,
      revocation_endpoint: `${issuer}/oauth2/revoke`,
      grant_types_supported: [claimGrant, assertionGrant],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: agentScopes,
      agent_auth: {
        skill: `${new URL(env.DASHBOARD_URL).origin}/auth.md`,
        identity_endpoint: `${issuer}/agent/identity`,
        identity_types_supported: ["service_auth"]
      }
    })
  if (!["/agent/identity", "/oauth2/token", "/oauth2/revoke"].includes(path)) return null
  try {
    requireValue(request.method === "POST", "Use POST for this endpoint.")
    if (!env.AGENT_AUTH_SIGNING_KEY || env.AGENT_AUTH_SIGNING_KEY.length < 43)
      throw new HttpError(503, "temporarily_unavailable", "Agent authorization is not configured.")
    await rateLimit(env, `request:${hashCredential(request.headers.get("cf-connecting-ip") ?? "unknown")}`, 120, 60)
    if (path === "/agent/identity") {
      await rateLimit(
        env,
        `registration:${hashCredential(request.headers.get("cf-connecting-ip") ?? "unknown")}`,
        10,
        3600
      )
      await rateLimit(env, "registrations", 100, 3600)
      const body = await jsonBody(request)
      requireValue(body.type === "service_auth", "Only service_auth registration is supported.")
      requireValue(
        typeof body.login_hint === "string" &&
          body.login_hint.length <= 254 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.login_hint),
        "Provide your account email as login_hint."
      )
      requireValue(
        typeof body.project_id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(body.project_id),
        "Provide the existing project_id to authorize."
      )
      const scope = body.scope ?? agentScopes.join(" ")
      requireValue(typeof scope === "string", "Invalid scope.")
      const scopes = [...new Set(scope.split(" ").filter(Boolean))]
      requireValue(
        scopes.length > 0 &&
          scopes.every((s) => (agentScopes as readonly string[]).includes(s)) &&
          scopes.includes("projects:read"),
        "Choose projects:read and optionally deployments:write."
      )
      const claim = agentSecret("clm_")
      const attempt = agentSecret("cla_")
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
      const id = `reg_${crypto.randomUUID()}`
      const now = nowSeconds()
      await env.DATABASE.prepare(
        `INSERT INTO agent_registrations(id,email,project_id,scopes,claim_hash,attempt_hash,code_hash,created_at,claim_expires_at) VALUES(?,?,?,?,?,?,?,?,?)`
      )
        .bind(
          id,
          body.login_hint.toLowerCase(),
          body.project_id,
          scopes.join(" "),
          hashCredential(claim),
          hashCredential(attempt),
          hashCredential(code),
          now,
          now + 600
        )
        .run()
      await agentAudit(env, id, "registration.created")
      return response(
        {
          registration_id: id,
          registration_type: "service_auth",
          claim_token: claim,
          claim_token_expires: new Date((now + 600) * 1000).toISOString(),
          post_claim_scopes: scopes,
          claim: {
            user_code: code,
            expires_in: 600,
            interval: 5,
            verification_uri: `${new URL(env.DASHBOARD_URL).origin}/cli/claim?claim_attempt_token=${attempt}`
          }
        },
        201
      )
    }
    const form = await formBody(request)
    if (path === "/oauth2/revoke") {
      const token = form.get("token")
      requireValue(token && token.length <= 4096, "Provide token.")
      if (form.get("token_type_hint") === "identity_assertion") {
        try {
          const id = assertionRegistration(env, token)
          const revoked = await env.DATABASE.prepare(
            "UPDATE agent_registrations SET status='revoked' WHERE id=? AND status='claimed' RETURNING id"
          )
            .bind(id)
            .first<{ id: string }>()
          if (revoked) await agentAudit(env, revoked.id, "registration.revoked")
        } catch (error) {
          if (!(error instanceof HttpError && error.code === "invalid_grant")) throw error
        }
        return new Response(null, { status: 200, headers: { "cache-control": "no-store" } })
      }
      const revoked = await env.DATABASE.prepare(
        "UPDATE agent_access_tokens SET revoked=1 WHERE hash=? AND revoked=0 RETURNING registration_id"
      )
        .bind(hashCredential(token))
        .first<{ registration_id: string }>()
      if (revoked) await agentAudit(env, revoked.registration_id, "token.revoked")
      return new Response(null, { status: 200, headers: { "cache-control": "no-store" } })
    }
    if (form.get("grant_type") === claimGrant) {
      const claim = form.get("claim_token") ?? ""
      const grant = await env.DATABASE.prepare("SELECT * FROM agent_registrations WHERE claim_hash=?")
        .bind(hashCredential(claim))
        .first<Registration>()
      if (!grant || grant.claim_expires_at <= nowSeconds())
        throw new HttpError(400, "expired_token", "This claim has expired. Start again.")
      if (grant.status === "denied" || grant.status === "revoked")
        throw new HttpError(400, "access_denied", "Authorization was denied or revoked.")
      const poll = await env.DATABASE.prepare(
        "UPDATE agent_registrations SET next_poll_at=?+poll_interval WHERE id=? AND next_poll_at<=? RETURNING id"
      )
        .bind(nowSeconds(), grant.id, nowSeconds())
        .first()
      if (!poll) {
        await env.DATABASE.prepare(
          "UPDATE agent_registrations SET poll_interval=MIN(poll_interval+5,60),next_poll_at=?+MIN(poll_interval+5,60) WHERE id=?"
        )
          .bind(nowSeconds(), grant.id)
          .run()
        throw new HttpError(400, "slow_down", "Increase your polling interval by five seconds.")
      }
      if (grant.status === "pending") throw new HttpError(400, "authorization_pending", "Waiting for your approval.")
      return await issueToken(env, grant, true)
    }
    if (form.get("grant_type") !== assertionGrant)
      throw new HttpError(400, "unsupported_grant_type", "Unsupported grant type.")
    if (form.has("resource") && form.get("resource") !== resource)
      throw new HttpError(400, "invalid_target", "Invalid resource.")
    const id = assertionRegistration(env, form.get("assertion") ?? "")
    const grant = await env.DATABASE.prepare("SELECT * FROM agent_registrations WHERE id=?")
      .bind(id)
      .first<Registration>()
    if (!grant) throw new HttpError(400, "invalid_grant", "Authorization not found.")
    await rateLimit(env, `exchange:${id}`, 12, 60)
    return await issueToken(env, grant, false)
  } catch (error) {
    if (!(error instanceof HttpError)) throw error
    return response({ error: error.code, error_description: error.message }, error.status)
  }
}

/** Human account authentication is required before this handler is reached. */
export async function agentAccountRoute(request: Request, env: Env, ownerId: string): Promise<Response | null> {
  const path = new URL(request.url).pathname
  if (path === "/api/platform/v1/agent/claim") {
    requireValue(["GET", "POST"].includes(request.method), "Use GET or POST.")
    const body =
      request.method === "POST" ? await jsonBody(request) : Object.fromEntries(new URL(request.url).searchParams)
    requireValue(typeof body.claim_attempt_token === "string", "Missing claim request.")
    const grant = await env.DATABASE.prepare("SELECT * FROM agent_registrations WHERE attempt_hash=?")
      .bind(hashCredential(body.claim_attempt_token))
      .first<Registration>()
    if (!grant || grant.status !== "pending" || grant.claim_expires_at <= nowSeconds() || grant.attempts >= 5)
      throw new HttpError(410, "claim_expired", "This request is finished or expired. Start again from your agent.")
    const user = await createClerkClient({ secretKey: env.CLERK_SECRET_KEY }).users.getUser(ownerId)
    if (
      !user.emailAddresses.some(
        (email) => email.verification?.status === "verified" && email.emailAddress.toLowerCase() === grant.email
      )
    )
      throw new HttpError(403, "account_mismatch", "Sign in with the verified email used to start this request.")
    const project = await env.DATABASE.prepare(
      "SELECT name FROM projects WHERE id=? AND owner_id=? AND lifecycle='active'"
    )
      .bind(grant.project_id, ownerId)
      .first<{ name: string }>()
    if (!project) throw new HttpError(403, "project_unavailable", "This account does not own the requested project.")
    if (request.method === "GET")
      return response({
        projectId: grant.project_id,
        projectName: project.name,
        scopes: grant.scopes.split(" "),
        expiresAt: grant.claim_expires_at,
        durationSeconds: 3600
      })
    requireValue(body.decision === "approve" || body.decision === "deny", "Choose approve or deny.")
    if (body.decision === "approve") {
      const attempt = await env.DATABASE.prepare(
        "UPDATE agent_registrations SET attempts=attempts+1 WHERE id=? AND status='pending' AND attempts<5 AND claim_expires_at>? RETURNING id"
      )
        .bind(grant.id, nowSeconds())
        .first()
      if (!attempt) throw new HttpError(410, "claim_expired", "This request has expired.")
      requireValue(
        typeof body.user_code === "string" &&
          /^\d{6}$/.test(body.user_code) &&
          timingSafeEqual(Buffer.from(hashCredential(body.user_code)), Buffer.from(grant.code_hash)),
        "The code does not match. Check the code shown by your agent."
      )
    }
    const updated = await env.DATABASE.prepare(
      "UPDATE agent_registrations SET owner_id=?,status=?,grant_expires_at=? WHERE id=? AND status='pending' AND claim_expires_at>? RETURNING id"
    )
      .bind(ownerId, body.decision === "approve" ? "claimed" : "denied", nowSeconds() + 3600, grant.id, nowSeconds())
      .first()
    if (!updated) throw new HttpError(409, "claim_complete", "This request has already been handled.")
    await agentAudit(env, grant.id, body.decision === "approve" ? "claim.confirmed" : "claim.denied", ownerId)
    return response({ status: body.decision === "approve" ? "approved" : "denied" })
  }
  const grants = /^\/api\/platform\/v1\/agent\/grants(?:\/(reg_[a-f0-9-]{36}))?$/.exec(path)
  if (!grants) return null
  if (request.method === "GET" && !grants[1]) {
    const rows = await env.DATABASE.prepare(
      "SELECT id,project_id AS projectId,scopes,grant_expires_at AS expiresAt FROM agent_registrations WHERE owner_id=? AND status='claimed' AND grant_expires_at>? ORDER BY created_at DESC LIMIT 100"
    )
      .bind(ownerId, nowSeconds())
      .all()
    return response({ grants: rows.results })
  }
  requireValue(request.method === "DELETE", "Use GET or DELETE.")
  const revoked = await env.DATABASE.prepare(
    `UPDATE agent_registrations SET status='revoked' WHERE owner_id=? AND status='claimed'${grants[1] ? " AND id=?" : ""} RETURNING id`
  )
    .bind(ownerId, ...(grants[1] ? [grants[1]] : []))
    .all<{ id: string }>()
  for (const grant of revoked.results) await agentAudit(env, grant.id, "registration.revoked", ownerId)
  return response({ revoked: revoked.results.length })
}

export async function maintainAgentAuthorization(env: Env) {
  const now = nowSeconds()
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      "DELETE FROM agent_access_tokens WHERE hash IN (SELECT hash FROM agent_access_tokens WHERE expires_at<? LIMIT 500)"
    ).bind(now - 86400),
    env.DATABASE.prepare(
      "DELETE FROM agent_registrations WHERE id IN (SELECT id FROM agent_registrations WHERE COALESCE(grant_expires_at,claim_expires_at)<? LIMIT 500)"
    ).bind(now - 7 * 86400),
    env.DATABASE.prepare(
      "DELETE FROM agent_auth_limits WHERE key IN (SELECT key FROM agent_auth_limits WHERE expires_at<? LIMIT 500)"
    ).bind(now),
    env.DATABASE.prepare(
      "DELETE FROM agent_auth_audit WHERE id IN (SELECT id FROM agent_auth_audit WHERE created_at<? LIMIT 500)"
    ).bind(now - 90 * 86400)
  ])
}
