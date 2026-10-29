import { expect, it, vi } from "vitest"
const service = vi.hoisted(() => ({ fetch: vi.fn<(request: Request) => Promise<Response>>() }))
vi.mock("cloudflare:workers", () => ({ env: { CREATOR_METRICS: service } }))
import { prepareKitAttribution } from "./kit-attribution"
it("honors privacy signals, returns only validated IDs and keeps downloads available on failure", async () => {
  service.fetch.mockReset()
  for (const header of ["sec-gpc", "dnt"])
    expect(
      await prepareKitAttribution(new Request("https://spawnkit.cloud", { headers: { [header]: "1" } }), "pixi")
    ).toBeNull()
  expect(service.fetch).not.toHaveBeenCalled()
  const data = { schemaVersion: 1, kitId: "pixi", downloadId: crypto.randomUUID(), consent: true }
  service.fetch.mockResolvedValueOnce(Response.json(data))
  expect(JSON.parse((await prepareKitAttribution(new Request("https://spawnkit.cloud"), "pixi"))!)).toEqual(data)
  service.fetch.mockResolvedValueOnce(Response.json({ ...data, kitId: "phaser" }))
  expect(await prepareKitAttribution(new Request("https://spawnkit.cloud"), "pixi")).toBeNull()
  service.fetch.mockRejectedValueOnce(new Error("offline"))
  expect(await prepareKitAttribution(new Request("https://spawnkit.cloud"), "pixi")).toBeNull()
})
