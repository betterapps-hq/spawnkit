import { readFile, writeFile } from "node:fs/promises"
import { optimizeCover } from "./optimize-cover.mjs"
import { optimizeGameImages } from "./optimize-game-images.mjs"
import { optimizeTrailer } from "./optimize-trailer.mjs"

// This entrypoint runs only in a fresh offline sandbox, never after a creator command.
const { files, gameImagePaths = [] } = JSON.parse(await readFile("/tmp/spawn-media.json", "utf8"))
const gameImages = optimizeGameImages(files, gameImagePaths)
const mediaWarnings = []
for (const [kind, optimize] of [
  ["cover", optimizeCover],
  ["trailer", optimizeTrailer]
]) {
  try {
    const media = await optimize(files)
    if (media) console.log(`Listing ${kind} optimized: ${media.originalBytes} → ${media.bytes} bytes`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed."
    mediaWarnings.push({ kind, message })
    console.warn(`Listing ${kind} omitted: ${message}`)
  }
}
const manifest = files.find((f) => f.path === "spawnkit.config.json")
const listing = manifest ? JSON.parse(Buffer.from(manifest.content, "base64").toString("utf8")) : {}
await writeFile(
  "/workspace/spawn-artifacts.json",
  JSON.stringify({
    files: [
      ...files.filter(
        (f) => f.path === "spawnkit.config.json" || f.path === listing.coverPath || f.path === listing.trailerPath
      ),
      ...gameImages
    ],
    mediaWarnings
  })
)
