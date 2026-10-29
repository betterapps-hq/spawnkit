import { listingTemplate } from "@spawn/templates/listing"
import { strToU8, zipSync } from "fflate"
import { expect, it } from "vitest"
import { readUploadListing, uploadArchiveLimit } from "./upload-listing"

function archive(config: unknown = listingTemplate, files: Record<string, Uint8Array> = {}) {
  return zipSync({
    "index.html": strToU8("<!doctype html><title>Game</title>"),
    "spawnkit.config.json": strToU8(JSON.stringify(config)),
    "cover.png": new Uint8Array([1, 2, 3]),
    ...files
  })
}
it("imports the shared config and only its referenced media", () => {
  const result = readUploadListing(
    archive(
      {
        ...listingTemplate,
        coverPath: "media/cover.webp",
        trailerPath: "clip.webm",
        details: { controls: "Arrow keys" }
      },
      {
        "media/cover.webp": new Uint8Array([4, 5, 6]),
        "clip.webm": new Uint8Array([7, 8, 9]),
        "large-unused.bin": new Uint8Array(4 * 1024 * 1024)
      }
    )
  )
  expect(result.config).toMatchObject({
    ...listingTemplate,
    coverPath: "media/cover.webp",
    details: { controls: "Arrow keys" }
  })
  expect(result.cover).toMatchObject({ name: "media/cover.webp", type: "image/webp", data: new Uint8Array([4, 5, 6]) })
  expect(result.video?.type).toBe("video/webm")
})
it("distinguishes absent config from invalid config", () => {
  expect(readUploadListing(zipSync({ "index.html": strToU8("game") }))).toEqual({
    config: null,
    cover: null,
    video: null
  })
  expect(() => readUploadListing(archive({}, { "spawnkit.config.json": strToU8("not JSON") }))).toThrow("Invalid JSON")
  expect(() => readUploadListing(archive({ ...listingTemplate, genre: "unknown" }))).toThrow("supported genre")
  expect(() => readUploadListing(zipSync({ "game/index.html": strToU8("game") }))).toThrow("root")
})
it("rejects unsafe paths, missing media, oversized inputs and damaged archives", () => {
  expect(() => readUploadListing(archive({ ...listingTemplate, coverPath: "../cover.png" }))).toThrow("relative path")
  expect(() => readUploadListing(archive(listingTemplate, { "../hidden": strToU8("no") }))).toThrow(
    "unsupported file path"
  )
  expect(() => readUploadListing(archive({ ...listingTemplate, coverPath: "missing.png" }))).toThrow("Add missing.png")
  expect(() => readUploadListing(archive(listingTemplate, { "cover.png": new Uint8Array(1024 * 1024 + 1) }))).toThrow(
    "under 1 MB"
  )
  expect(() => readUploadListing(archive(listingTemplate, { "spawnkit.config.json": new Uint8Array(4097) }))).toThrow(
    "under 4 KB"
  )
  expect(() => readUploadListing(new Uint8Array(uploadArchiveLimit + 1))).toThrow("64 MB")
  expect(() => readUploadListing(new Uint8Array(24))).toThrow("couldn't be opened")
})
