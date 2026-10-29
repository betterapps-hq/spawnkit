import { mkdtemp, writeFile, mkdir, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, it } from "vitest"
import { checkListingMedia } from "./media-preflight"
import { createSourceArchive } from "./source"

const listing = {
  title: "Test game",
  description: "A game for testing",
  genre: "Arcade",
  dimension: "2D",
  coverPath: "media/cover.svg",
  trailerPath: "media/preview.mp4"
}
it.each(["typed", "json"])("validates media limits for %s listings without running project code", async (format) => {
  const path = format === "typed" ? "spawnkit.config.ts" : "spawnkit.config.json"
  const source =
    format === "typed"
      ? `import { defineConfig } from './untrusted-module'; throw new Error('MUST NOT RUN'); export default defineConfig(${JSON.stringify(listing)})`
      : JSON.stringify(listing)
  const files = [
    { path, size: source.length },
    { path: "public/media/cover.svg", size: 1024 * 1024 },
    { path: "public/media/preview.mp4", size: 2 * 1024 * 1024 }
  ]
  expect(await checkListingMedia(files, async () => source)).toEqual([])
  files[1]!.size++
  await expect(checkListingMedia(files, async () => source)).rejects.toThrow("limit 1 MiB")
  files[1]!.size = 1
  files[2]!.size++
  await expect(checkListingMedia(files, async () => source)).rejects.toThrow("limit 2 MiB")
})
it("defers computed fields honestly and rejects ambiguous or unsafe paths", async () => {
  const typed = [{ path: "spawnkit.config.ts", size: 100 }]
  expect(await checkListingMedia(typed, async () => "export default makeConfig()")).toEqual([
    expect.stringContaining("Dynamic")
  ])
  expect(await checkListingMedia(typed, async () => "export default defineConfig({ coverPath: getCover() })")).toEqual([
    expect.stringContaining("dynamic")
  ])
  expect(
    await checkListingMedia(typed, async () => 'export default defineConfig({ coverPath: "media/cover.svg" })')
  ).toEqual([expect.stringContaining("absent from the upload")])
  for (const coverPath of ["../secret.svg", "/cover.svg", "https://evil.test/a.svg", "a.js", "media//a.png"]) {
    await expect(
      checkListingMedia(typed, async () => `export default defineConfig({coverPath:${JSON.stringify(coverPath)}})`)
    ).rejects.toThrow("Invalid cover path")
  }
  await expect(
    checkListingMedia([...typed, { path: "spawnkit.config.json", size: 1 }], async () => "{}")
  ).rejects.toThrow("Choose one")
})
it("rejects a huge configured cover before allocating its bytes or uploading", async () => {
  const root = await mkdtemp(join(tmpdir(), "spawn-media-"))
  try {
    await mkdir(join(root, "public/media"), { recursive: true })
    await writeFile(join(root, "game.config.json"), '{"build":{"output":"dist"}}')
    await writeFile(join(root, "spawnkit.config.ts"), 'export default defineConfig({coverPath:"media/cover.svg"})')
    // A sparse file reproduces the oversized-input path without filling test memory.
    const { open } = await import("node:fs/promises")
    const file = await open(join(root, "public/media/cover.svg"), "w")
    await file.truncate(100 * 1024 * 1024)
    await file.close()
    expect((await stat(join(root, "public/media/cover.svg"))).size).toBe(100 * 1024 * 1024)
    await expect(createSourceArchive(root)).rejects.toThrow(
      "Cover public/media/cover.svg is 104,857,600 bytes; limit 1 MiB"
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
