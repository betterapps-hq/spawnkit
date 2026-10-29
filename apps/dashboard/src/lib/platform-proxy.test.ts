import { afterEach, expect, it, vi } from "vitest"
import { proxyPlatform } from "./platform-proxy"
const { auth } = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ userId: string; getToken: () => Promise<string> }>>(async () => ({
    userId: "admin",
    getToken: async () => "session-token"
  }))
}))
vi.mock("@clerk/tanstack-react-start/server", () => ({ auth }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
it.each(["admin/manage/decisions", "team/invitations/accept", "games/p/reports", "projects/p/listing"])(
  "requires same-origin cookie writes for %s and permits explicit bearer clients",
  async (path) => {
    vi.stubEnv("SPAWN_CONTROL_API_URL", "https://api.spawnkit.cloud")
    const upstream = vi.fn<typeof fetch>(async () => Response.json({ ok: true }))
    vi.stubGlobal("fetch", upstream)
    const request = (headers: Record<string, string>) =>
      new Request(`https://spawnkit.cloud/api/platform/v1/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: "{}"
      })
    expect((await proxyPlatform(request({}))).status).toBe(403)
    expect((await proxyPlatform(request({ origin: "https://malicious.spawnkit.games" }))).status).toBe(403)
    expect(auth).not.toHaveBeenCalled()
    expect(upstream).not.toHaveBeenCalled()
    expect((await proxyPlatform(request({ origin: "https://spawnkit.cloud" }))).status).toBe(200)
    expect(auth).toHaveBeenCalledOnce()
    expect(upstream.mock.calls[0]?.[1]?.headers).toBeInstanceOf(Headers)
    expect(new Headers(upstream.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer session-token")
    expect((await proxyPlatform(request({ authorization: "Bearer cli-token" }))).status).toBe(200)
    expect(auth).toHaveBeenCalledOnce()
    expect(new Headers(upstream.mock.calls[1]?.[1]?.headers).get("authorization")).toBe("Bearer cli-token")
  }
)
it("accepts the configured HTTPS origin behind the local proxy without trusting forwarded headers", async () => {
  vi.stubEnv("SPAWN_CONTROL_API_URL", "https://api.staging.spawnkit.cloud")
  vi.stubEnv("SPAWN_SITE_URL", "https://local.spawnkit.cloud")
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ ok: true }))
  )
  const request = (origin: string) =>
    new Request("http://localhost:5173/api/platform/v1/projects", {
      method: "POST",
      headers: { origin, "x-forwarded-host": "attacker.example" },
      body: "{}"
    })
  expect((await proxyPlatform(request("https://local.spawnkit.cloud"))).status).toBe(200)
  expect((await proxyPlatform(request("https://attacker.example"))).status).toBe(403)
})
