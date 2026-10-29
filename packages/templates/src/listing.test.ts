import { execFileSync } from "node:child_process"
import { mkdtemp, writeFile, rm } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, it } from "vitest"
import { gameGenres, listingClassification, listingDetails, listingTemplate, parseListingConfig } from "./listing"
import { gameFiles } from "./scaffold"

it("uses one versioned JSON contract for downloadable and imported listings", () => {
  expect(parseListingConfig(JSON.parse(JSON.stringify(listingTemplate)))).toEqual(listingTemplate)
  for (const change of [
    { schemaVersion: 2 },
    { description: "short" },
    { genre: "fake" },
    { dimension: "4D" },
    { coverPath: "../cover.png" },
    { trailerPath: "https://example.com/video.mp4" },
    { unknown: true }
  ])
    expect(() => parseListingConfig({ ...listingTemplate, ...change })).toThrow(
      /schemaVersion|description|genre|coverPath|trailerPath|unknown field/
    )
})

it("keeps gameplay facts bounded and source links explicitly licensed and permitted", () => {
  expect(
    listingDetails({
      controls: "  Arrow keys  ",
      creator: "Studio",
      kitId: "phaser",
      sourceUrl: "https://example.com/source"
    })
  ).toEqual({ controls: "Arrow keys", creator: "Studio", kitId: "phaser" })
  expect(listingDetails({ sourceUrl: "javascript:alert(1)", sourcePermission: true, sourceLicense: "MIT" })).toEqual({})
  expect(
    listingDetails({ sourceUrl: "https://user:pass@example.com", sourcePermission: true, sourceLicense: "MIT" })
  ).toEqual({})
  expect(
    listingDetails({ sourceUrl: "https://example.com/source", sourcePermission: true, sourceLicense: "MIT" })
  ).toMatchObject({ sourceUrl: "https://example.com/source", sourceLicense: "MIT" })
  expect(listingDetails({ controls: "x".repeat(301), kitId: "invented" })).toEqual({})
  expect(listingDetails("invalid")).toEqual({})
})
import { listingConfigSource } from "./listing-config"
it.each(["pixi", "phaser", "three", "babylon"] as const)(
  "includes a complete editable listing and default cover in %s",
  async (template) => {
    const files = await gameFiles({ name: "new-game", template })
    const listing = JSON.parse(files["spawnkit.config.ts"]!.split("defineConfig(")[1]!.slice(0, -2))
    expect(listing.title).toBe("new-game")
    expect(listing.genre).toBe("Arcade")
    expect(listing.dimension).toBe(["pixi", "phaser"].includes(template) ? "2D" : "3D")
    expect(files[`public/${listing.coverPath}`]).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(JSON.parse(files["spawnkit.config.schema.json"]!).properties.genre.enum).toEqual(gameGenres)
    expect(files["README.md"]).toContain("spawnkit.config.json")
    expect(files["README.md"]).toMatch(/up to 1\s+MiB/)
    expect(files["README.md"]).toMatch(/up to 2\s+MiB/)
  }
)
it("accepts the shared vocabulary and leaves unknown classifications unset", () => {
  expect(listingClassification({ genre: "Shooter", dimension: "2D" })).toEqual({ genre: "Shooter", dimension: "2D" })
  expect(listingClassification({ genre: "fake", dimension: "4D" })).toEqual({ genre: null, dimension: null })
})

it("checks generated config at runtime and rejects invalid TypeScript fields", async () => {
  const source = stripTypeScriptTypes(listingConfigSource)
  const { defineConfig } = await import(
    /* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  )
  const config = {
    title: "Game",
    description: "A playable game",
    genre: "Arcade",
    dimension: "2D",
    coverPath: "media/cover.svg"
  }
  expect(defineConfig(config)).toEqual(config)
  for (const change of [
    { genre: "Unknown" },
    { dimension: "4D" },
    { description: "short" },
    { coverPath: "../cover.svg" },
    { extra: true }
  ])
    expect(() => defineConfig({ ...config, ...change })).toThrow(/./)
  const root = await mkdtemp(join(tmpdir(), "spawn-config-types-"))
  try {
    await writeFile(join(root, "config.ts"), listingConfigSource)
    await writeFile(
      join(root, "check.ts"),
      `import { defineConfig } from './config'
      defineConfig(${JSON.stringify(config)})
      // @ts-expect-error invalid dimension
      defineConfig({...${JSON.stringify(config)}, dimension:'4D'})
      // @ts-expect-error missing required metadata
      defineConfig({title:'Game'})
      // @ts-expect-error misspelled field
      defineConfig({...${JSON.stringify(config)}, cover:'image.png'})
    `
    )
    execFileSync(
      process.execPath,
      [
        new URL("../node_modules/typescript/bin/tsc", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
        "--ignoreConfig",
        "--noEmit",
        "--strict",
        "--skipLibCheck",
        "--target",
        "es2023",
        join(root, "check.ts")
      ],
      { stdio: "pipe" }
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
