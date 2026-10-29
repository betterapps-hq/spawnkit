import { afterEach, expect, it, vi } from "vitest"
import { blockedBuildRequest, dependencyRequest } from "./build-network"
afterEach(() => vi.unstubAllGlobals())
it.each([
  ["https://example.com/package", "GET"],
  ["http://registry.npmjs.org/vite", "GET"],
  ["https://registry.npmjs.org.evil.example/vite", "GET"],
  ["https://127.0.0.1/package", "GET"],
  ["https://169.254.169.254/latest/meta-data/", "GET"],
  ["https://registry.npmjs.org:8443/vite", "GET"],
  ["https://registry.npmjs.org/vite", "POST"],
  ["https://registry.npmjs.org/vite?token=secret", "GET"],
  ["https://registry.npmjs.org/-/npm/v1/security/audits", "GET"]
])("denies package proxy bypass %s %s", async (url, method) => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  vi.stubGlobal("fetch", fetch)
  expect((await dependencyRequest(new Request(url, { method }))).status).toBe(403)
  expect(fetch).not.toHaveBeenCalled()
})
it("downloads npm packages without forwarding credentials or accepting redirects", async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(new Response("package"))
    .mockResolvedValueOnce(Response.redirect("https://evil.example", 302))
  vi.stubGlobal("fetch", fetch)
  const request = new Request("https://registry.npmjs.org/@scope/package/-/package-1.0.0.tgz", {
    headers: { authorization: "Bearer never-forward", cookie: "secret", "x-custom": "secret" }
  })
  expect(await (await dependencyRequest(request)).text()).toBe("package")
  expect(fetch.mock.calls[0]?.[1]).toMatchObject({
    redirect: "manual",
    headers: { accept: "application/json, application/octet-stream" }
  })
  expect(JSON.stringify(fetch.mock.calls)).not.toContain("secret")
  expect((await dependencyRequest(request)).status).toBe(403)
  expect(blockedBuildRequest().status).toBe(403)
})
