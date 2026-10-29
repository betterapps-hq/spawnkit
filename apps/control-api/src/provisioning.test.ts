import { afterEach, expect, it, vi } from "vitest"
import { communityFixture } from "./community-fixture"
import { provisionProjectDomain } from "./provisioning"
afterEach(() => vi.unstubAllGlobals())

it("provisions only the assigned project, waits for wildcard certificates, and never takes another service's domain", async () => {
  const { env, db } = communityFixture()
  env.HOSTING_API_TOKEN = "test-only"
  env.HOSTING_TEST = "true"
  db.exec("INSERT INTO project_hostnames(project_id,slug) VALUES('p','ember')")
  let domains: { hostname: string; service: string; zone_id: string }[] = []
  let active = false
  const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(
    async (input, init) => {
      const url = String(input)
      expect(url.startsWith("https://api.cloudflare.com/client/v4/")).toBe(true)
      if (url.includes("certificate_packs"))
        return Response.json({
          success: true,
          result: [{ status: active ? "active" : "pending_validation", hosts: ["*.ember.staging.spawnkit.games"] }]
        })
      if (url.includes("workers/domains") && !init?.body) return Response.json({ success: true, result: domains })
      return Response.json({ success: true, result: init?.body ? {} : [] })
    }
  )
  vi.stubGlobal("fetch", fetcher)
  expect(await provisionProjectDomain(env, "p", "ember")).toBe(false)
  expect(db.prepare("SELECT ready FROM project_hostnames").get()?.ready).toBe(0)
  const put = fetcher.mock.calls.find((call) => call[1]?.method === "PUT")!
  expect(JSON.parse(String(put[1]?.body))).toMatchObject({
    hostname: "ember.staging.spawnkit.games",
    service: "spawnkit-games-staging",
    previews_enabled: false
  })
  active = true
  expect(await provisionProjectDomain(env, "p", "ember")).toBe(true)
  expect(db.prepare("SELECT ready FROM project_hostnames").get()?.ready).toBe(1)
  domains = [
    {
      hostname: "ember.staging.spawnkit.games",
      service: "unrelated-worker",
      zone_id: "b0f105530cc52d9f3a95ee4fd5592531"
    }
  ]
  await expect(provisionProjectDomain(env, "p", "ember")).rejects.toThrow("another service")
  db.close()
})
