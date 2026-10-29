import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtemp, writeFile, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, dirname, resolve, basename } from "node:path"
import { promisify } from "node:util"
import {
  MAX_TRAILER_INPUT_BYTES,
  MAX_TRAILER_BYTES,
  MAX_TRAILER_SIDE,
  MAX_TRAILER_SECONDS,
  safeTrailerBytes
} from "./trailer-policy.mjs"

const execute = promisify(execFile)
// Force a local media demuxer; no playlists, network protocols or external references.
const inputOptions = [
  "-v",
  "error",
  "-max_alloc",
  "67108864",
  "-protocol_whitelist",
  "file",
  "-format_whitelist",
  "mov,matroska,webm",
  "-probesize",
  "2097152",
  "-analyzeduration",
  "2000000"
]
async function run(binary, args, timeout) {
  try {
    return await execute(binary, args, { timeout, killSignal: "SIGKILL", maxBuffer: 128 * 1024, windowsHide: true })
  } catch {
    throw new Error("Trailer processing failed or exceeded its time limit.")
  }
}

/** Platform-owned derivative only; never return the unprocessed creator clip on failure. */
export async function optimizeTrailer(files) {
  const manifest = files.find((file) => file.path === "spawnkit.config.json")
  if (!manifest || Buffer.byteLength(manifest.content, "base64") > 4096) return null
  let listing
  try {
    listing = JSON.parse(Buffer.from(manifest.content, "base64").toString("utf8"))
  } catch {
    return null
  }
  if (!listing || Array.isArray(listing) || typeof listing !== "object") return null
  const configured = listing.trailerPath !== undefined && listing.trailerPath !== null
  const path = listing.trailerPath === undefined ? "media/gameplay.mp4" : listing.trailerPath
  listing.trailerPath = null
  manifest.content = Buffer.from(JSON.stringify(listing)).toString("base64")
  if (path === null) return null
  if (
    typeof path !== "string" ||
    !/^[A-Za-z0-9_-][A-Za-z0-9_./-]{0,199}\.(mp4|webm)$/.test(path) ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Use a relative MP4 or WebM trailer path inside the game output.")
  const original = files.find((file) => file.path === path)
  if (!original) {
    if (configured) throw new Error("The configured trailer file was not found in the game output.")
    return null
  }
  const size = Buffer.byteLength(original.content, "base64")
  if (!size || size > MAX_TRAILER_INPUT_BYTES) throw new Error("Trailer input must be between 1 byte and 2 MiB.")
  const input = Buffer.from(original.content, "base64")
  const directory = await mkdtemp(join(tmpdir(), "spawn-trailer-"))
  if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("spawn-trailer-"))
    throw new Error("Unsafe trailer temporary directory")
  try {
    const source = join(directory, path.endsWith(".mp4") ? "input.mp4" : "input.webm")
    const destination = join(directory, "preview.mp4")
    await writeFile(source, input, { flag: "wx" })
    const probe = JSON.parse(
      (
        await run(
          "ffprobe",
          [
            ...inputOptions,
            "-show_entries",
            "stream=codec_type,codec_name,width,height:format=duration",
            "-of",
            "json",
            source
          ],
          10_000
        )
      ).stdout
    )
    const videos = (probe.streams ?? []).filter((stream) => stream.codec_type === "video")
    const video = videos[0]
    if (
      videos.length !== 1 ||
      !["h264", "vp8", "vp9", "av1", "hevc"].includes(video?.codec_name) ||
      ![video.width, video.height].every((v) => Number.isInteger(v) && v > 0 && v <= 4096) ||
      video.width * video.height > 8_294_400
    )
      throw new Error("Trailer must contain one video track with at most 8.3 million pixels.")
    const duration = Number(probe.format?.duration)
    if (!Number.isFinite(duration) || duration <= 0 || duration > 60)
      throw new Error("Trailer source must be 60 seconds or shorter.")
    await run(
      "ffmpeg",
      [
        ...inputOptions,
        "-nostdin",
        "-threads",
        "1",
        "-i",
        source,
        "-map",
        "0:v:0",
        "-t",
        String(MAX_TRAILER_SECONDS),
        "-an",
        "-sn",
        "-dn",
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-vf",
        `fps=24,scale=w='min(${MAX_TRAILER_SIDE},iw)':h='min(${MAX_TRAILER_SIDE},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1`,
        "-filter_threads",
        "1",
        "-c:v",
        "libx264",
        "-threads",
        "1",
        "-preset",
        "fast",
        "-crf",
        "28",
        "-maxrate",
        "768k",
        "-bufsize",
        "1536k",
        "-pix_fmt",
        "yuv420p",
        "-g",
        "48",
        "-movflags",
        "+faststart",
        "-fs",
        String(MAX_TRAILER_BYTES),
        destination
      ],
      60_000
    )
    if ((await stat(destination)).size > MAX_TRAILER_BYTES) throw new Error("Optimized trailer exceeds 2 MiB.")
    const output = await readFile(destination)
    if (!safeTrailerBytes(output)) throw new Error("Optimized trailer did not pass the serving policy.")
    const trailerPath = `spawnkit-trailer-${createHash("sha256").update(output).digest("hex").slice(0, 20)}.mp4`
    const existing = files.find((file) => file.path === trailerPath)
    const content = output.toString("base64")
    if (existing && existing.content !== content) throw new Error("Generated trailer path is already occupied")
    const updated = Buffer.from(JSON.stringify({ ...listing, trailerPath })).toString("base64")
    const total =
      files.reduce((n, file) => n + Buffer.byteLength(file.content, "base64"), 0) +
      (existing ? 0 : output.length) +
      Buffer.byteLength(updated, "base64") -
      Buffer.byteLength(manifest.content, "base64")
    if ((!existing && files.length >= 2000) || total > 20 * 1024 * 1024)
      throw new Error("No room for the optimized trailer in the artifact bundle.")
    if (!existing) files.push({ path: trailerPath, content })
    manifest.content = updated
    return { path: trailerPath, originalBytes: input.length, bytes: output.length }
  } finally {
    await rm(directory, { recursive: true, force: true }) // exact private directory returned by mkdtemp
  }
}
