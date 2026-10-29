import { createHash } from "node:crypto"
import sharp from "sharp"
import { expect, it, vi } from "vitest"
import { MAX_COVER_BYTES } from "../cover-policy.mjs"
import { listingCover } from "./listing-cover"

it("validates stored cover bytes without trusting the filename or claimed size", async () => {
  const bytes = await sharp({ create: { width: 100, height: 80, channels: 4, background: "transparent" } })
    .webp()
    .toBuffer()
  const name = `spawnkit-cover-${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.webp`
  const read = vi.fn<() => Promise<Buffer>>(async () => bytes)
  const cancel = vi.fn<() => Promise<void>>(async () => {})
  const object = { size: bytes.length, arrayBuffer: read, body: { cancel } }
  const get = vi.fn<() => Promise<typeof object>>(async () => object)
  const bucket = { get } as unknown as R2Bucket
  expect(await listingCover(bucket, "releases/p/r/", name)).toBe(name)
  expect(get).toHaveBeenCalledWith(`releases/p/r/${name}`)
  expect(await listingCover(bucket, "releases/p/r/", `spawnkit-cover-${"0".repeat(20)}.webp`)).toBe(null)
  object.size = MAX_COVER_BYTES + 1
  read.mockClear()
  expect(await listingCover(bucket, "releases/p/r/", name)).toBe(null)
  expect(read).not.toHaveBeenCalled()
  expect(cancel).toHaveBeenCalledOnce()
  get.mockClear()
  expect(await listingCover(bucket, "releases/p/r/", "https://example.com/cover.png")).toBe(null)
  expect(await listingCover(bucket, "releases/p/r/", "media/cover.svg")).toBe(null)
  expect(get).not.toHaveBeenCalled()
})
