import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { URL } from "node:url"
import { expect, it, vi } from "vitest"
import { MAX_TRAILER_BYTES } from "../trailer-policy.mjs"
import { listingTrailer } from "./listing-trailer"

it("checks actual trailer bytes, hash and playback bounds instead of trusting a name or size", async () => {
  const bytes = readFileSync(new URL("../fixtures/trailer.mp4", import.meta.url))
  const name = `spawnkit-trailer-${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.mp4`
  const read = vi.fn<() => Promise<Buffer>>(async () => bytes)
  const cancel = vi.fn<() => Promise<void>>(async () => {})
  const object = { size: bytes.length, arrayBuffer: read, body: { cancel } }
  const get = vi.fn<() => Promise<typeof object>>(async () => object)
  const bucket = { get } as unknown as R2Bucket
  expect(await listingTrailer(bucket, "releases/p/r/", name)).toBe(name)
  expect(get).toHaveBeenCalledWith(`releases/p/r/${name}`)
  expect(await listingTrailer(bucket, "releases/p/r/", `spawnkit-trailer-${"0".repeat(20)}.mp4`)).toBe(null)
  object.size = MAX_TRAILER_BYTES + 1
  read.mockClear()
  expect(await listingTrailer(bucket, "releases/p/r/", name)).toBe(null)
  expect(read).not.toHaveBeenCalled()
  expect(cancel).toHaveBeenCalledOnce()
  get.mockClear()
  expect(await listingTrailer(bucket, "releases/p/r/", "https://example.com/video.mp4")).toBe(null)
  expect(await listingTrailer(bucket, "releases/p/r/", "media/raw.mp4")).toBe(null)
  expect(get).not.toHaveBeenCalled()
  object.size = bytes.length + 1
  expect(await listingTrailer(bucket, "releases/p/r/", name)).toBe(null)
})
