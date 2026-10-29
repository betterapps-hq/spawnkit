import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
import { test } from "node:test"
import { optimizeTrailer } from "./optimize-trailer.mjs"
import { MAX_TRAILER_BYTES, MAX_TRAILER_INPUT_BYTES, safeTrailerBytes } from "./trailer-policy.mjs"

function fixture(input, path = "media/clip.mp4") {
  return [
    { path, content: input.toString("base64") },
    {
      path: "spawnkit.config.json",
      content: Buffer.from(JSON.stringify({ title: "Test game", trailerPath: path, coverPath: "cover.webp" })).toString(
        "base64"
      )
    }
  ]
}
const listing = (files) => JSON.parse(Buffer.from(files[1].content, "base64"))

test("encodes real MP4 and WebM into bounded silent faststart H.264 previews, preserving originals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "spawn-trailer-test-"))
  assert.equal(dirname(resolve(dir)), resolve(tmpdir()))
  try {
    for (const extension of ["mp4", "webm"]) {
      const source = join(dir, `source.${extension}`)
      execFileSync(
        "ffmpeg",
        [
          "-v",
          "error",
          "-f",
          "lavfi",
          "-i",
          "testsrc2=size=800x450:rate=12:duration=9",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:duration=9",
          "-c:v",
          extension === "mp4" ? "libx264" : "libvpx",
          "-b:v",
          "500k",
          "-c:a",
          extension === "mp4" ? "aac" : "libvorbis",
          source
        ],
        { timeout: 30_000, windowsHide: true }
      )
      const input = await readFile(source)
      const files = fixture(input, `clip.${extension}`)
      const result = await optimizeTrailer(files)
      assert.ok(result)
      assert.ok(result.bytes < MAX_TRAILER_BYTES)
      assert.equal(files[0].content, input.toString("base64"))
      assert.deepEqual(listing(files), { title: "Test game", trailerPath: result.path, coverPath: "cover.webp" })
      const output = Buffer.from(files.at(-1).content, "base64")
      assert.equal(safeTrailerBytes(output), true)
      const target = join(dir, `result-${extension}.mp4`)
      await writeFile(target, output)
      const info = JSON.parse(
        execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", target], {
          encoding: "utf8",
          timeout: 10_000,
          windowsHide: true
        })
      )
      assert.equal(info.streams.length, 1)
      assert.equal(info.streams[0].codec_name, "h264")
      assert.equal(info.streams[0].avg_frame_rate, "24/1")
      assert.equal(info.streams[0].width, 640)
      assert.ok(Number(info.format.duration) <= 8.05)
      assert.ok(output.indexOf("moov") < output.indexOf("mdat"))
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("rejects over-limit inputs before decoding and leaves no original-file fallback", async () => {
  const files = fixture(Buffer.alloc(MAX_TRAILER_INPUT_BYTES + 1))
  await assert.rejects(optimizeTrailer(files), /2 MiB/)
  assert.equal(listing(files).trailerPath, null)
  const corrupt = fixture(Buffer.from("invalid MP4"))
  await assert.rejects(optimizeTrailer(corrupt), /processing failed/)
  assert.equal(listing(corrupt).trailerPath, null)
  const playlist = fixture(Buffer.from("#EXTM3U\nhttp://127.0.0.1:9/private\n"))
  await assert.rejects(optimizeTrailer(playlist), /processing failed/)
  assert.equal(listing(playlist).trailerPath, null)
  for (const path of ["../clip.mp4", "https://example.com/clip.mp4", "clip.m3u8"]) {
    const unsafe = fixture(Buffer.from("data"), path)
    await assert.rejects(optimizeTrailer(unsafe), /relative/)
    assert.equal(listing(unsafe).trailerPath, null)
  }
})

test("serving policy rejects oversized, corrupt, slow-start, long, huge and audio-bearing containers", async () => {
  const input = await readFile(new URL("./fixtures/trailer.mp4", import.meta.url))
  assert.equal(safeTrailerBytes(input), true)
  assert.equal(safeTrailerBytes(Buffer.alloc(MAX_TRAILER_BYTES + 1)), false)
  assert.equal(safeTrailerBytes(input.subarray(0, input.length - 1)), false)
  for (const change of [
    (b) => b.writeUInt32BE(0, 0),
    (b) => b.write("moof", b.indexOf("moov")),
    (b) => b.write("soun", b.indexOf("vide")),
    (b) => b.writeUInt32BE(999999999, b.indexOf("mvhd") + 20),
    (b) => b.writeUInt32BE(4096 * 65536, b.indexOf("tkhd") + 80),
    (b) => b.writeUInt32BE(0, b.indexOf("url ") + 4)
  ]) {
    const invalid = Buffer.from(input)
    change(invalid)
    assert.equal(safeTrailerBytes(invalid), false)
  }
  // A valid clip exactly at the input cap is accepted; one extra byte is rejected above.
  const padding = Buffer.alloc(MAX_TRAILER_INPUT_BYTES - input.length)
  padding.writeUInt32BE(padding.length)
  padding.write("free", 4)
  const atLimit = fixture(Buffer.concat([input, padding]))
  assert.ok(await optimizeTrailer(atLimit))
})

test("refuses source videos with excessive duration", async () => {
  const dir = await mkdtemp(join(tmpdir(), "spawn-trailer-test-"))
  assert.equal(dirname(resolve(dir)), resolve(tmpdir()))
  try {
    const source = join(dir, "long.mp4")
    execFileSync(
      "ffmpeg",
      ["-v", "error", "-f", "lavfi", "-i", "color=size=32x32:rate=1:duration=61", "-an", "-c:v", "libx264", source],
      { timeout: 10_000, windowsHide: true }
    )
    const files = fixture(await readFile(source))
    await assert.rejects(optimizeTrailer(files), /60 seconds/)
    assert.equal(listing(files).trailerPath, null)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
