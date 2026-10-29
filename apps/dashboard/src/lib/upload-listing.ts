import { parseListingConfig } from "@spawn/templates/listing"
import { strFromU8, unzipSync, type UnzipFileInfo } from "fflate"

export const uploadArchiveLimit = 64 * 1024 * 1024
const manifestPath = "spawnkit.config.json"
const mediaTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm"
}

/** Read only listing metadata and its bounded media. Never execute or extract game code. */
export function readUploadListing(bytes: Uint8Array) {
  if (bytes.length < 22 || bytes.length > uploadArchiveLimit) throw new Error("Choose a valid ZIP under 64 MB.")
  const entries = new Map<string, UnzipFileInfo>()
  let manifest: Uint8Array | undefined
  try {
    const manifests = unzipSync(bytes, {
      filter(entry) {
        if (entries.size >= 2000) throw new Error("This ZIP contains too many files.")
        const parts = entry.name.replace(/\/$/, "").split("/")
        if (
          !entry.name ||
          entry.name.length > 300 ||
          entry.name.includes("\\") ||
          entry.name.includes(":") ||
          parts.some((part) => !part || part === "." || part === "..")
        )
          throw new Error("The ZIP contains an unsupported file path.")
        if (entries.has(entry.name)) throw new Error(`The ZIP contains duplicate files: ${entry.name}.`)
        entries.set(entry.name, entry)
        if (entry.name !== manifestPath) return false
        if (entry.originalSize > 4096 || entry.size > 8192) throw new Error("spawnkit.config.json must be under 4 KB.")
        return true
      }
    })
    manifest = manifests[manifestPath]
  } catch (error) {
    if (error instanceof Error && /ZIP|spawnkit\.config/.test(error.message)) throw error
    throw new Error("This ZIP couldn't be opened. Choose another file.")
  }
  if (!entries.get("index.html")?.originalSize) throw new Error("Put index.html at the root of your game ZIP.")
  if (!manifest) return { config: null, cover: null, video: null }
  let config
  try {
    config = parseListingConfig(JSON.parse(strFromU8(manifest)))
  } catch (error) {
    throw new Error(
      `Check spawnkit.config.json: ${error instanceof SyntaxError ? "Invalid JSON." : error instanceof Error ? error.message : "Invalid listing."}`
    )
  }
  const selected = new Map<string, number>([[config.coverPath, 1024 * 1024]])
  if (config.trailerPath) selected.set(config.trailerPath, 2 * 1024 * 1024)
  for (const [path, limit] of selected) {
    const entry = entries.get(path)
    if (!entry) throw new Error(`Add ${path} to the ZIP or update its path in spawnkit.config.json.`)
    if (!entry.originalSize || entry.originalSize > limit || entry.size > limit + 65536)
      throw new Error(`${path} must be under ${limit / (1024 * 1024)} MB.`)
  }
  let media: ReturnType<typeof unzipSync>
  try {
    media = unzipSync(bytes, { filter: (entry) => selected.has(entry.name) })
  } catch {
    throw new Error("The cover or video couldn't be read from this ZIP.")
  }
  function asset(path: string) {
    const data = media[path]!
    if (data.length !== entries.get(path)!.originalSize) throw new Error(`The ZIP contains a damaged file: ${path}.`)
    return { name: path, data, type: mediaTypes[path.split(".").at(-1)!.toLowerCase()]! }
  }
  return { config, cover: asset(config.coverPath), video: config.trailerPath ? asset(config.trailerPath) : null }
}
