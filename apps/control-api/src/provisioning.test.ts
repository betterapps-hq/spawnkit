import { afterEach, expect, it, vi } from "vitest"
import { provisionProjectDomain } from "./provisioning"
afterEach(() => vi.unstubAllGlobals())

it("provisions only the assigned project, waits for wildcard certificates, and never takes another service's domain", async () => {
  const run = vi.fn<() => Promise<object>>(async () => ({}))
  const bind = vi.fn<(...args: unknown[]) => { run: typeof run }>(() => ({ run }))
  const env = {
    HOSTING_API_TOKEN: "test-only",
    HOSTING_TEST: "true",
    DATABASE: { prepare: () => ({ bind }) }
  } as unknown as Env
  let domains: { hostname: string; service: string; zone_id: string }[] = []
  let active = false
  const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(
    async (input, init) => {
      const url = String(input)
      expect(url.startsWith("https://api.cloudflare.com/client/v4/")).toBe(true)
      if (url.includes("certificate_packs"))
        return Response.json({
          success: true,
          result: [{ status: active ? "active" : "pending_validation", hosts: ["*.ember.staging.spawnkit.cloud"] }]
        })
      if (url.includes("workers/domains") && !init?.body) return Response.json({ success: true, result: domains })
      return Response.json({ success: true, result: init?.body ? {} : [] })
    }
  )
  vi.stubGlobal("fetch", fetcher)
  expect(await provisionProjectDomain(env, "project-id", "ember")).toBe(false)
  expect(run).not.toHaveBeenCalled()
  const put = fetcher.mock.calls.find((call) => call[1]?.method === "PUT")!
  expect(JSON.parse(String(put[1]?.body))).toMatchObject({
    hostname: "ember.staging.spawnkit.cloud",
    service: "spawnkit-games-staging",
    previews_enabled: false
  })
  active = true
  expect(await provisionProjectDomain(env, "project-id", "ember")).toBe(true)
  expect(bind).toHaveBeenCalledWith("project-id", "ember")
  domains = [
    {
      hostname: "ember.staging.spawnkit.cloud",
      service: "unrelated-worker",
      zone_id: "2a8126a122d81d58aafe2535a2219e7c"
    }
  ]
  await expect(provisionProjectDomain(env, "project-id", "ember")).rejects.toThrow("another service")
})
