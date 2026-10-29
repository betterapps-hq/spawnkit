import { listingTemplate } from "@spawn/templates/listing"
import { gunzipSync, strFromU8, strToU8, zipSync } from "fflate"
import { afterEach, expect, it, vi } from "vitest"
import { gamePublisher, prepareGameUpload, type UploadInput } from "./game-upload"
const input = (): UploadInput => ({
  archive: new File([new Uint8Array(zipSync({ "index.html": strToU8("<h1>Game</h1>") }))], "game.zip"),
  config: listingTemplate,
  cover: { name: listingTemplate.coverPath, url: "blob:cover" },
  video: null
})
afterEach(() => vi.unstubAllGlobals())
it("packages a ready-built game and dashboard metadata for the existing validated build pipeline", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
  )
  const { source, digest } = await prepareGameUpload(input())
  const document = JSON.parse(strFromU8(gunzipSync(source)))
  expect(digest).toMatch(/^[a-f0-9]{64}$/)
  expect(document.files.map((file: { path: string }) => file.path)).toContain("game/index.html")
  const listing = document.files.find((file: { path: string }) => file.path === "game/spawnkit.config.json")
  expect(JSON.parse(atob(listing.content))).toEqual(listingTemplate)
  expect(document.files.some((file: { path: string }) => file.path === "pnpm-lock.yaml")).toBe(true)
})
it("rejects oversized expanded archives before publishing", async () => {
  const value = input()
  value.archive = new File([new Uint8Array(zipSync({ "index.html": new Uint8Array(21 * 1024 * 1024) }))], "game.zip")
  await expect(prepareGameUpload(value)).rejects.toThrow("20 MB")
})
it("retries a lost project response with the same project ID and uses the assigned game URL", async () => {
  const projects: string[] = []
  let loseResponse = true
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init?: RequestInit) => {
      if (path === "blob:cover") return new Response(new Uint8Array([1]))
      if (path.endsWith("/projects")) {
        projects.push(JSON.parse(String(init?.body)).id)
        if (loseResponse) {
          loseResponse = false
          throw new Error("Network interrupted")
        }
        return Response.json({ id: projects[0] })
      }
      if (path.endsWith("/state")) return Response.json({ capabilities: { builds: true } })
      if (path.endsWith("/uploads")) return Response.json({ id: "upload" })
      if (path.endsWith("/uploads/upload")) return Response.json({})
      if (path.endsWith("/deployments")) return Response.json({ id: "deployment" })
      return Response.json({ status: "succeeded", url: "https://assigned-game.spawnkit.games" })
    })
  )
  const publish = gamePublisher()
  await expect(publish(input(), () => {})).rejects.toThrow(
    "Connection interrupted. Check your connection and try again."
  )
  expect(await publish(input(), () => {})).toEqual({
    url: "https://assigned-game.spawnkit.games",
    dashboardUrl: `/dashboard/projects/${projects[0]}`
  })
  expect(projects[0]).toBe(projects[1])
})

it("reads selected media directly without fetching blob URLs under production CSP", async () => {
  const fetch = vi.fn<() => never>(() => {
    throw new Error("Blocked by CSP")
  })
  vi.stubGlobal("fetch", fetch)
  const value = input()
  value.cover.blob = new Blob([new Uint8Array([1, 2, 3])])
  await prepareGameUpload(value)
  expect(fetch).not.toHaveBeenCalled()
})
