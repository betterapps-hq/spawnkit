import assert from "node:assert/strict"
import { test } from "node:test"
import sharp from "sharp"
import { MAX_COVER_BYTES, MAX_COVER_INPUT_BYTES, safeCoverBytes } from "./cover-policy.mjs"
import { optimizeCover } from "./optimize-cover.mjs"

function fixture(path, input, listing = { coverPath: path, title: "Game" }) {
  return [
    { path, content: input.toString("base64") },
    { path: "spawnkit.config.json", content: Buffer.from(JSON.stringify(listing)).toString("base64") }
  ]
}
test("creates a smaller cover with stable dimensions and keeps original game assets", async () => {
  const pixels = Buffer.alloc(1536 * 864 * 3)
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 17 + Math.floor(i / 19)) % 256
  const input = await sharp(pixels, { raw: { width: 1536, height: 864, channels: 3 } })
    .jpeg({ quality: 85 })
    .toBuffer()
  const files = fixture("media/cover.jpg", input)
  const original = files[0].content
  const result = await optimizeCover(files)
  assert.ok(result.bytes < input.length)
  assert.equal(files[0].content, original)
  assert.equal(JSON.parse(Buffer.from(files[1].content, "base64")).title, "Game")
  assert.equal(JSON.parse(Buffer.from(files[1].content, "base64")).coverPath, result.path)
  const metadata = await sharp(Buffer.from(files[2].content, "base64")).metadata()
  assert.equal(metadata.width, 960)
  assert.equal(metadata.height, 540)
  assert.equal(metadata.format, "webp")
})
test("clears unsafe paths and oversized input, and ignores invalid manifests", async () => {
  for (const path of ["../cover.png", "https://example.com/a.png"])
    await assert.rejects(optimizeCover(fixture(path, Buffer.from("image"))), /relative/)
  assert.equal(await optimizeCover([]), null)
  assert.equal(
    await optimizeCover([{ path: "spawnkit.config.json", content: Buffer.from("{").toString("base64") }]),
    null
  )
  const oversized = fixture("cover.png", Buffer.alloc(MAX_COVER_INPUT_BYTES + 1))
  await assert.rejects(optimizeCover(oversized), /1 MiB/)
  assert.equal(JSON.parse(Buffer.from(oversized[1].content, "base64")).coverPath, null)
})
test("corrupt and pixel-bomb covers never fall back to the submitted image", async () => {
  const files = fixture("cover.png", Buffer.from("not an image"))
  const original = files[0].content
  await assert.rejects(optimizeCover(files))
  assert.equal(files[0].content, original)
  assert.equal(JSON.parse(Buffer.from(files[1].content, "base64")).coverPath, null)
  const huge = fixture(
    "cover.svg",
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="100000"><rect width="100000" height="100000"/></svg>'
    )
  )
  await assert.rejects(optimizeCover(huge))
  assert.equal(JSON.parse(Buffer.from(huge[1].content, "base64")).coverPath, null)
})

test("rasterizes small vector covers and keeps the derivative within the serving policy", async () => {
  const files = fixture(
    "cover.svg",
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><circle cx="640" cy="360" r="300" fill="purple"/></svg>'
    )
  )
  const result = await optimizeCover(files)
  assert.ok(result)
  const output = Buffer.from(files.at(-1).content, "base64")
  assert.ok(safeCoverBytes(output))
  assert.ok(output.length <= MAX_COVER_BYTES)
  assert.equal((await sharp(output).metadata()).width, 960)
})

test("independent serving checks reject forged dimensions, animation, corrupt containers and oversized bytes", async () => {
  const bytes = await sharp({ create: { width: 100, height: 80, channels: 3, background: "purple" } })
    .webp()
    .toBuffer()
  assert.ok(safeCoverBytes(bytes))
  const inflated = Buffer.from(bytes)
  inflated.writeUInt16LE(10000, 26)
  assert.equal(safeCoverBytes(inflated), false)
  const animated = Buffer.from(bytes)
  animated.write("ANMF", 12)
  assert.equal(safeCoverBytes(animated), false)
  assert.equal(safeCoverBytes(bytes.subarray(0, bytes.length - 1)), false)
  assert.equal(safeCoverBytes(Buffer.alloc(MAX_COVER_BYTES + 1)), false)
  assert.equal(safeCoverBytes(Buffer.from("not an image")), false)
})
