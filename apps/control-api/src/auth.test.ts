import { beforeEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  session: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  oauth: vi.fn<(...args: unknown[]) => Promise<unknown>>()
}))
vi.mock("@clerk/backend", () => ({
  verifyToken: mocks.session,
  createClerkClient: () => ({ idPOAuthAccessToken: { verify: mocks.oauth } })
}))
import { authenticate } from "./auth"
const env = {
  CLERK_SECRET_KEY: "test",
  CLERK_OAUTH_CLIENT_ID: "spawn-client",
  DASHBOARD_ORIGINS: "https://spawnkit.cloud,https://staging.spawnkit.cloud"
} as Env
const request = (token = "token") =>
  new Request("https://api.spawnkit.cloud", { headers: { authorization: `Bearer ${token}` } })
beforeEach(() => {
  vi.resetAllMocks()
  mocks.session.mockRejectedValue(new Error("invalid"))
  mocks.oauth.mockRejectedValue(new Error("invalid"))
})
it("binds browser sessions to configured authorized parties", async () => {
  mocks.session.mockResolvedValue({ sid: "sess_1", sub: "user_one" })
  expect(await authenticate(request(), env)).toBe("user_one")
  expect(mocks.session).toHaveBeenCalledWith("token", {
    secretKey: "test",
    authorizedParties: ["https://spawnkit.cloud", "https://staging.spawnkit.cloud"]
  })
  expect(mocks.oauth).not.toHaveBeenCalled()
})
it("rejects missing or invalid credentials", async () => {
  await expect(authenticate(new Request("https://api.spawnkit.cloud"), env)).rejects.toMatchObject({ status: 401 })
  await expect(authenticate(request(), env)).rejects.toMatchObject({ status: 401 })
})
it.each([
  { clientId: "another-app" },
  { revoked: true },
  { expired: true },
  { expiration: 1 },
  { expiration: null },
  { subject: "org_one" }
])("rejects invalid OAuth claims %j", async (claims) => {
  mocks.oauth.mockResolvedValue({
    clientId: "spawn-client",
    subject: "user_one",
    expiration: Date.now() / 1000 + 1000,
    revoked: false,
    expired: false,
    ...claims
  })
  await expect(authenticate(request(), env)).rejects.toMatchObject({ status: 401 })
})
it("does not let an OAuth-shaped JWT bypass OAuth revocation/client checks", async () => {
  mocks.session.mockResolvedValue({ sid: "sess_1", sub: "user_one", client_id: "spawn-client" })
  await expect(authenticate(request(), env)).rejects.toMatchObject({ status: 401 })
  expect(mocks.oauth).toHaveBeenCalledWith("token")
})
it("accepts a current CLI access token only for our client", async () => {
  mocks.oauth.mockResolvedValue({
    clientId: "spawn-client",
    subject: "user_one",
    expiration: Date.now() / 1000 + 1000,
    revoked: false,
    expired: false
  })
  expect(await authenticate(request(), env)).toBe("user_one")
})
