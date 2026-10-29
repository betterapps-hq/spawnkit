import { expect, it, vi } from "vitest"
import { proxyGameActivity } from "./game-activity-proxy"

function request(origin = "https://spawnkit.cloud") {
  return new Request("https://spawnkit.cloud/api/platform/v1/games/game-1/activity", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "cf-connecting-ip": "192.0.2.1",
      "x-spawn-client-ip": "forged",
      authorization: "Bearer ignored"
    },
    body: JSON.stringify({ kind: "view", visitorId: "12345678-1234-4234-8234-123456789abc" })
  })
}
it("allows anonymous same-origin activity only through the private binding", async () => {
  const send = vi.fn<(upstream: Request) => Promise<Response>>(async (upstream: Request) => {
    expect(upstream.url).toBe("https://activity.internal/api/platform/v1/games/game-1/activity")
    expect(upstream.headers.get("x-spawn-client-ip")).toBe("192.0.2.1")
    expect(upstream.headers.has("authorization")).toBe(false)
    expect(await upstream.json()).toMatchObject({ kind: "view" })
    return Response.json({ counted: true, views: 1, plays: 0 })
  })
  expect((await proxyGameActivity(request(), send)).status).toBe(200)
  for (const origin of ["https://evil.example", "null", ""]) {
    expect((await proxyGameActivity(request(origin), send)).status).toBe(403)
  }
  expect(send).toHaveBeenCalledTimes(1)
})
it("fails without fabricating a count when the activity service is unavailable", async () => {
  const result = await proxyGameActivity(request(), async () => {
    throw new Error("offline")
  })
  expect(result.status).toBe(503)
  expect(await result.json()).toEqual({ error: { code: "unavailable" } })
})
