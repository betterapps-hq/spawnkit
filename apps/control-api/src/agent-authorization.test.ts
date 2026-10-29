import { afterEach, beforeEach, expect, it, vi } from "vitest"
const users = vi.hoisted(() => ({
  getUser:
    vi.fn<(id: string) => Promise<{ emailAddresses: { emailAddress: string; verification: { status: string } }[] }>>()
}))
vi.mock("@clerk/backend", () => ({ createClerkClient: () => ({ users }) }))
import { agentAccountRoute, agentAuthorizationRoute } from "./agent-authorization"
import { assertionGrant, authenticateAgent, claimGrant, hashCredential } from "./agent-credentials"
import { communityFixture } from "./community-fixture"

let fixture: ReturnType<typeof communityFixture>
type PendingClaim = {
  registration_id: string
  claim_token: string
  identity_assertion?: string
  claim: { user_code: string; verification_uri: string }
}
type Token = { access_token: string; identity_assertion: string; scope: string; expires_in: number }
beforeEach(() => {
  fixture = communityFixture()
  Object.assign(fixture.env, {
    DASHBOARD_URL: "https://spawnkit.cloud",
    AGENT_AUTH_SIGNING_KEY: "test-only-".repeat(8)
  })
  users.getUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: "creator@example.com", verification: { status: "verified" } }]
  })
})
afterEach(() => {
  fixture.db.close()
  vi.useRealTimers()
  vi.resetAllMocks()
})
const publicRequest = (path: string, body: unknown, form = false) =>
  agentAuthorizationRoute(
    new Request(`https://api.spawnkit.cloud${path}`, {
      method: "POST",
      headers: {
        "content-type": form ? "application/x-www-form-urlencoded" : "application/json",
        "cf-connecting-ip": "192.0.2.1"
      },
      body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body)
    }),
    fixture.env
  )
async function register(extra = {}) {
  const response = await publicRequest("/agent/identity", {
    type: "service_auth",
    login_hint: "creator@example.com",
    project_id: "p",
    ...extra
  })
  expect(response?.status).toBe(201)
  return response!.json<PendingClaim>()
}
async function claim(
  registration: Awaited<ReturnType<typeof register>>,
  decision = "approve",
  code = registration.claim.user_code,
  owner = "creator"
) {
  return agentAccountRoute(
    new Request("https://api.spawnkit.cloud/api/platform/v1/agent/claim", {
      method: "POST",
      body: JSON.stringify({
        claim_attempt_token: new URL(registration.claim.verification_uri).searchParams.get("claim_attempt_token"),
        decision,
        user_code: code
      })
    }),
    fixture.env,
    owner
  )
}
async function poll(registration: Awaited<ReturnType<typeof register>>) {
  return publicRequest("/oauth2/token", { grant_type: claimGrant, claim_token: registration.claim_token }, true)
}
async function approved(extra = {}) {
  const registration = await register(extra)
  expect((await claim(registration))?.status).toBe(200)
  const response = await poll(registration)
  expect(response?.status).toBe(200)
  return { registration, token: await response!.json<Token>() }
}
function api(token: string, path = "/projects/p", method = "GET") {
  return authenticateAgent(
    new Request(`https://api.spawnkit.cloud/api/platform/v1${path}`, { method }),
    fixture.env,
    token
  )
}
it("issues project-bound access only after human approval and stores hashes rather than credentials", async () => {
  const { registration, token } = await approved()
  expect(registration.identity_assertion).toBeUndefined()
  expect(token.expires_in).toBe(900)
  expect(token.scope).toBe("projects:read deployments:write")
  expect(await api(token.access_token)).toBe("creator")
  expect(await api(token.access_token, "/projects/p/deployments", "POST")).toBe("creator")
  const stored = fixture.db.prepare("SELECT * FROM agent_registrations").get()!
  expect(stored.claim_hash).toBe(hashCredential(registration.claim_token))
  expect(stored.code_hash).toBe(hashCredential(registration.claim.user_code))
  expect(JSON.stringify(fixture.db.prepare("SELECT * FROM agent_access_tokens").all())).not.toContain(
    token.access_token
  )
})

it("prevents approval replay", async () => {
  const { registration } = await approved()
  await expect(claim(registration)).rejects.toMatchObject({ status: 410 })
})
it.each([
  ["/projects/other", "GET"],
  ["/projects/p-other", "GET"],
  ["/projects", "GET"],
  ["/projects", "POST"],
  ["/projects/p", "DELETE"],
  ["/projects/p", "PATCH"],
  ["/projects/p/telemetry", "GET"],
  ["/admin/creator-metrics", "GET"],
  ["/agent/claim", "POST"],
  ["/agent/grants", "DELETE"],
  ["/projects/p/github/connect", "POST"],
  ["/projects/p/uploads/id/extra", "PUT"]
])("rejects unapproved operation %s %s", async (path, method) => {
  const { token } = await approved()
  await expect(api(token.access_token, path, method)).rejects.toMatchObject({ status: 403 })
})
it("enforces a read-only grant", async () => {
  const { token } = await approved({ scope: "projects:read" })
  expect(await api(token.access_token)).toBe("creator")
  await expect(api(token.access_token, "/projects/p/uploads", "POST")).rejects.toMatchObject({ status: 403 })
})
it("waits for approval and slows down early polling", async () => {
  const registration = await register()
  expect(await (await poll(registration))!.json()).toMatchObject({ error: "authorization_pending" })
  expect(await (await poll(registration))!.json()).toMatchObject({ error: "slow_down" })
  expect(fixture.db.prepare("SELECT poll_interval FROM agent_registrations").get()?.poll_interval).toBe(10)
})
it("denies requests and expires unused codes", async () => {
  const registration = await register()
  await claim(registration, "deny")
  expect(await (await poll(registration))!.json()).toMatchObject({ error: "access_denied" })
  const expired = await register()
  fixture.db.exec("UPDATE agent_registrations SET claim_expires_at=1")
  expect(await (await poll(expired))!.json()).toMatchObject({ error: "expired_token" })
  await expect(claim(expired)).rejects.toMatchObject({ status: 410 })
})
it("requires matching verified email and project ownership", async () => {
  const registration = await register()
  users.getUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: "other@example.com", verification: { status: "verified" } }]
  })
  await expect(claim(registration)).rejects.toMatchObject({ status: 403 })
  users.getUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: "creator@example.com", verification: { status: "unverified" } }]
  })
  await expect(claim(registration)).rejects.toMatchObject({ status: 403 })
  users.getUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: "creator@example.com", verification: { status: "verified" } }]
  })
  await expect(claim(registration, "approve", registration.claim.user_code, "another")).rejects.toMatchObject({
    status: 403
  })
})
it("locks a claim after five incorrect codes", async () => {
  const registration = await register()
  const wrong = registration.claim.user_code === "000000" ? "111111" : "000000"
  for (let i = 0; i < 5; i++) await expect(claim(registration, "approve", wrong)).rejects.toMatchObject({ status: 400 })
  await expect(claim(registration)).rejects.toMatchObject({ status: 410 })
})
it("refreshes a valid assertion and revokes an individual access token idempotently", async () => {
  const { token } = await approved()
  const revoke = { token: token.access_token, token_type_hint: "access_token" }
  expect((await publicRequest("/oauth2/revoke", revoke, true))?.status).toBe(200)
  expect((await publicRequest("/oauth2/revoke", revoke, true))?.status).toBe(200)
  await expect(api(token.access_token)).rejects.toMatchObject({ status: 401 })
  const refresh = await publicRequest(
    "/oauth2/token",
    { grant_type: assertionGrant, assertion: token.identity_assertion },
    true
  )
  expect(refresh?.status).toBe(200)
  expect(await api((await refresh!.json<Token>()).access_token)).toBe("creator")
})
it("revokes the entire grant so every token and assertion stops working", async () => {
  const { token } = await approved()
  expect(
    (
      await publicRequest(
        "/oauth2/revoke",
        { token: token.identity_assertion, token_type_hint: "identity_assertion" },
        true
      )
    )?.status
  ).toBe(200)
  await expect(api(token.access_token)).rejects.toMatchObject({ status: 401 })
  const refresh = await publicRequest(
    "/oauth2/token",
    { grant_type: assertionGrant, assertion: token.identity_assertion },
    true
  )
  expect(await refresh!.json()).toMatchObject({ error: "invalid_grant" })
})
it("revokes only the account's grants and supports bulk revocation", async () => {
  const { token, registration } = await approved()
  const revoke = new Request(
    `https://api.spawnkit.cloud/api/platform/v1/agent/grants/${registration.registration_id}`,
    { method: "DELETE" }
  )
  expect(await (await agentAccountRoute(revoke, fixture.env, "another"))!.json()).toEqual({ revoked: 0 })
  expect(await api(token.access_token)).toBe("creator")
  expect(
    await (await agentAccountRoute(
      new Request("https://api.spawnkit.cloud/api/platform/v1/agent/grants", { method: "DELETE" }),
      fixture.env,
      "creator"
    ))!.json()
  ).toEqual({ revoked: 1 })
  await expect(api(token.access_token)).rejects.toMatchObject({ status: 401 })
})
it("rejects token expiry, grant expiry, tampered assertions and a different resource", async () => {
  const { token } = await approved()
  fixture.db.exec("UPDATE agent_access_tokens SET expires_at=1")
  await expect(api(token.access_token)).rejects.toMatchObject({ status: 401 })
  const invalid = await publicRequest(
    "/oauth2/token",
    { grant_type: assertionGrant, assertion: `${token.identity_assertion}x` },
    true
  )
  expect(await invalid!.json()).toMatchObject({ error: "invalid_grant" })
  const wrongResource = await publicRequest(
    "/oauth2/token",
    { grant_type: assertionGrant, assertion: token.identity_assertion, resource: "https://evil.example" },
    true
  )
  expect(await wrongResource!.json()).toMatchObject({ error: "invalid_target" })
  fixture.db.exec("UPDATE agent_registrations SET grant_expires_at=1")
  expect(
    await (await publicRequest(
      "/oauth2/token",
      { grant_type: assertionGrant, assertion: token.identity_assertion },
      true
    ))!.json()
  ).toMatchObject({ error: "invalid_grant" })
})
it("advertises only implemented identity types and rate limits registration", async () => {
  const metadata = await agentAuthorizationRoute(
    new Request("https://api.spawnkit.cloud/.well-known/oauth-authorization-server"),
    fixture.env
  )
  expect(
    (await metadata!.json<{ agent_auth: { identity_types_supported: string[] } }>()).agent_auth.identity_types_supported
  ).toEqual(["service_auth"])
  for (let i = 0; i < 10; i++) await register()
  const limited = await publicRequest("/agent/identity", {
    type: "service_auth",
    login_hint: "creator@example.com",
    project_id: "p"
  })
  expect(limited?.status).toBe(429)
})
it.each([{ type: "anonymous" }, { scope: "admin" }, { project_id: "../other" }, { login_hint: "invalid" }])(
  "rejects invalid registration %j",
  async (extra) => {
    expect(
      (
        await publicRequest("/agent/identity", {
          type: "service_auth",
          login_hint: "creator@example.com",
          project_id: "p",
          ...extra
        })
      )?.status
    ).toBe(400)
  }
)
