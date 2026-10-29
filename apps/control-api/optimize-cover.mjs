import { createHash } from "node:crypto"
import sharp from "sharp"
import { MAX_COVER_INPUT_BYTES, MAX_COVER_BYTES, MAX_COVER_SIDE, safeCoverBytes } from "./cover-policy.mjs"

/** Optimize listing artwork only. Game textures and original files are untouched. */
export async function optimizeCover(files) {
  const manifest = files.find((file) => file.path === "spawnkit.config.json")
  if (!manifest || Buffer.byteLength(manifest.content, "base64") > 4096) return null
  let listing
  try {
    listing = JSON.parse(Buffer.from(manifest.content, "base64").toString("utf8"))
  } catch {
    return null
  }
  if (!listing || Array.isArray(listing) || typeof listing !== "object") return null
  const configured = listing.coverPath !== undefined && listing.coverPath !== null
  const path = listing.coverPath === undefined ? "media/cover.png" : listing.coverPath
  // Fail closed for listing artwork, while retaining a playable game and its source assets.
  listing.coverPath = null
  manifest.content = Buffer.from(JSON.stringify(listing)).toString("base64")
  if (path === null) return null
  if (
    typeof path !== "string" ||
    !/^[A-Za-z0-9_-][A-Za-z0-9_./-]{0,199}\.(png|jpe?g|webp|svg)$/.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error("Use a relative PNG, JPEG, WebP or SVG cover path inside the game output.")
  const original = files.find((file) => file.path === path)
  if (!original) {
    if (configured) throw new Error("The configured cover file was not found in the game output.")
    return null
  }
  const input = Buffer.from(original.content, "base64")
  if (!input.length || input.length > MAX_COVER_INPUT_BYTES)
    throw new Error("Cover input must be between 1 byte and 1 MiB.")
  const encode = (side) =>
    sharp(input, { limitInputPixels: 16_777_216, animated: false })
      .rotate()
      .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4, lossless: false })
      .timeout({ seconds: 10 })
      .toBuffer()
  let output = await encode(MAX_COVER_SIDE)
  if (output.length > MAX_COVER_BYTES) output = await encode(640)
  if (!safeCoverBytes(output)) throw new Error("The cover could not be compressed within the image limits.")
  const coverPath = `spawnkit-cover-${createHash("sha256").update(output).digest("hex").slice(0, 20)}.webp`
  const existing = files.find((file) => file.path === coverPath)
  const content = output.toString("base64")
  if (existing && existing.content !== content) throw new Error("Generated cover path is already occupied")
  const updatedManifest = Buffer.from(JSON.stringify({ ...listing, coverPath })).toString("base64")
  const extraBytes =
    (existing ? 0 : output.length) +
    Buffer.byteLength(updatedManifest, "base64") -
    Buffer.byteLength(manifest.content, "base64")
  if (
    (!existing && files.length >= 2000) ||
    files.reduce((total, file) => total + Buffer.byteLength(file.content, "base64"), 0) + extraBytes > 20 * 1024 * 1024
  )
    throw new Error("No room for the optimized cover in the artifact bundle.")
  if (!existing) files.push({ path: coverPath, content })
  manifest.content = updatedManifest
  return { path: coverPath, originalBytes: input.length, bytes: output.length }
}
