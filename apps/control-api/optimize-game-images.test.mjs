import assert from "node:assert/strict"
import { test } from "node:test"
import { crc32, deflateSync } from "node:zlib"
import sharp from "sharp"
import { compressPng, optimizeGameImages } from "./optimize-game-images.mjs"

function chunk(type, data) {
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length)
  result.write(type, 4)
  data.copy(result, 8)
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4)
  return result
}
function fixture() {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(64)
  header.writeUInt32BE(64, 4)
  header[8] = 8
  header[9] = 6
  const pixels = Buffer.alloc(64 * (64 * 4 + 1), 120)
  for (let row = 0; row < 64; row++) pixels[row * 257] = 0
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("tEXt", Buffer.from("Author\0Creator")),
    chunk("IDAT", deflateSync(pixels, { level: 0 })),
    chunk("IEND", Buffer.alloc(0))
  ])
}
test("losslessly reduces PNG data while preserving metadata, dimensions and decoded RGBA", async () => {
  const original = fixture()
  const optimized = compressPng(original)
  assert.ok(optimized.length < original.length / 10)
  assert.ok(optimized.includes(Buffer.from("Author\0Creator")))
  assert.deepEqual(
    await sharp(optimized).raw().toBuffer({ resolveWithObject: true }),
    await sharp(original).raw().toBuffer({ resolveWithObject: true })
  )
  assert.deepEqual(compressPng(optimized), optimized)
})
test("leaves animation, malformed chunks, CRC damage and oversized files unchanged", () => {
  const valid = fixture()
  const animated = Buffer.concat([valid.subarray(0, 33), chunk("acTL", Buffer.alloc(8)), valid.subarray(33)])
  const damaged = Buffer.from(valid)
  damaged[50] ^= 1
  for (const input of [
    animated,
    damaged,
    valid.subarray(0, -1),
    Buffer.alloc(4 * 1024 * 1024 + 1),
    Buffer.from("<html>")
  ])
    assert.deepEqual(compressPng(input), input)
})
test("bounds decompression and keeps the original if compressed data cannot be read", () => {
  const input = Buffer.concat([
    fixture().subarray(0, 33),
    chunk("IDAT", Buffer.from("invalid zlib")),
    chunk("IEND", Buffer.alloc(0))
  ])
  const file = { path: "art/image.png", content: input.toString("base64") }
  const logs = []
  assert.deepEqual(
    optimizeGameImages([file], [file.path], (line) => logs.push(line)),
    []
  )
  assert.ok(logs[0].includes("kept unchanged"))
  assert.equal(file.content, input.toString("base64"))
  const bomb = Buffer.concat([
    fixture().subarray(0, 33),
    chunk("IDAT", deflateSync(Buffer.alloc(64 * 1024 * 1024 + 1))),
    chunk("IEND", Buffer.alloc(0))
  ])
  assert.throws(() => compressPng(bomb), /larger than/)
})
test("only returns smaller replacements for selected paths", () => {
  const files = [
    { path: "a.png", content: fixture().toString("base64") },
    { path: "b.png", content: fixture().toString("base64") }
  ]
  const result = optimizeGameImages(files, ["a.png"], () => {})
  assert.deepEqual(
    result.map((file) => file.path),
    ["a.png"]
  )
  assert.notEqual(result[0].content, files[0].content)
})
