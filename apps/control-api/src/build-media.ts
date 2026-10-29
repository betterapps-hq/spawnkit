import { createHash } from "node:crypto"
import { getSandbox } from "@cloudflare/sandbox"
import { MAX_COVER_INPUT_BYTES, safeCoverBytes } from "../cover-policy.mjs"
import { MAX_TRAILER_INPUT_BYTES, safeTrailerBytes } from "../trailer-policy.mjs"
import { readArtifactManifest } from "./artifact-manifest"
import { parseArtifacts, type ArtifactFile } from "./build-artifacts"
import { streamBuildOutput } from "./build-output"
import { record, requireValue } from "./http"
import { mediaWarnings } from "./media-warnings"

const listingPath = "spawnkit.config.json"
const generatedPath = /^spawnkit-(?:cover|trailer)-/i
const manifestFile = (listing: Record<string, unknown>) => ({
  path: listingPath,
  content: Buffer.from(JSON.stringify(listing)).toString("base64")
})

/** Only selected, size-bounded media crosses into the trusted job; no project scripts or source. */
export function mediaInputs(files: ArtifactFile[]) {
  const manifests = files.filter((f) => f.path === listingPath)
  requireValue(manifests.length <= 1, "Multiple game configurations found. Keep only spawnkit.config.json.")
  const manifest = manifests[0]
  let listing: Record<string, unknown> = {}
  if (manifest && Buffer.byteLength(manifest.content, "base64") <= 4096) {
    try {
      listing = record(JSON.parse(Buffer.from(manifest.content, "base64").toString("utf8")))
    } catch {
      /* Optional metadata. */
    }
  }
  const inputs: ArtifactFile[] = []
  const listingPaths = new Set<unknown>()
  const warnings: { kind: "cover" | "trailer"; message: string }[] = []
  for (const kind of ["cover", "trailer"] as const) {
    const key = `${kind}Path`
    const path =
      listing[key] === undefined ? (kind === "cover" ? "media/cover.png" : "media/gameplay.mp4") : listing[key]
    const file = files.find((f) => f.path === path)
    listingPaths.add(path)
    if (!file) continue // The trusted processor reports configured missing/invalid paths.
    const limit = kind === "cover" ? MAX_COVER_INPUT_BYTES : MAX_TRAILER_INPUT_BYTES
    if (Buffer.byteLength(file.content, "base64") > limit) {
      listing[key] = null
      warnings.push({ kind, message: `Listing ${kind} exceeds its ${kind === "cover" ? "1" : "2"} MiB input limit.` })
    } else if (!inputs.some((f) => f.path === file.path)) inputs.push(file)
  }
  // Bounded PNG data only; creator scripts never enter this sandbox.
  const gameImages = files
    .filter(
      (f) =>
        /\.png$/i.test(f.path) && !listingPaths.has(f.path) && Buffer.byteLength(f.content, "base64") <= 4 * 1024 * 1024
    )
    .slice(0, 8)
  return {
    listing,
    files: [manifestFile(listing), ...inputs.filter((f) => f.path !== listingPath), ...gameImages],
    gameImagePaths: gameImages.map((f) => f.path),
    listingPaths,
    warnings
  }
}

export async function processListingMedia(
  env: Env,
  id: string,
  files: ArtifactFile[],
  log: (lines: string[]) => Promise<void>
) {
  const input = mediaInputs(files)
  const sandbox = getSandbox(env.SANDBOX, `media-${id}`)
  await sandbox.destroy()
  await sandbox.setOutboundHandler("blocked")
  await sandbox.writeFile(
    "/tmp/spawn-media.json",
    JSON.stringify({ files: input.files, gameImagePaths: input.gameImagePaths })
  )
  const process = await sandbox.exec(["node", "/opt/spawn/media-runner.mjs"], { timeout: 100_000 })
  const result = await streamBuildOutput(process, log)
  requireValue(result.code === 0 && !result.timedOut, "Listing media processing failed. Retry the deployment.")
  const bytes = await readArtifactManifest(
    await sandbox.readFile("/workspace/spawn-artifacts.json", { encoding: "none" }),
    30 * 1024 * 1024
  )
  const output = parseArtifacts(bytes)
  requireValue(output.length <= 3 + input.gameImagePaths.length, "Invalid media output.")
  const manifest = output.find((f) => f.path === listingPath)
  requireValue(manifest && Buffer.byteLength(manifest.content, "base64") <= 8192, "Missing media result.")
  const listing = record(JSON.parse(Buffer.from(manifest.content, "base64").toString("utf8")))
  const derivatives: ArtifactFile[] = []
  const replacements = new Map<string, ArtifactFile>()
  for (const file of output.filter((f) => input.gameImagePaths.includes(f.path))) {
    const original = files.find((f) => f.path === file.path)!
    const before = Buffer.from(original.content, "base64"),
      after = Buffer.from(file.content, "base64")
    requireValue(
      after.length >= 45 &&
        after.length < before.length &&
        after.subarray(0, 33).equals(before.subarray(0, 33)) &&
        after.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")),
      "Invalid optimized game image."
    )
    replacements.set(file.path, file)
  }
  for (const kind of ["cover", "trailer"] as const) {
    const key = `${kind}Path`,
      path = listing[key]
    input.listing[key] = null
    if (path === null || path === undefined) continue
    const file = output.find((f) => f.path === path)
    requireValue(file, "Missing processed media.")
    const content = Buffer.from(file.content, "base64")
    const extension = kind === "cover" ? "webp" : "mp4"
    requireValue(
      path === `spawnkit-${kind}-${createHash("sha256").update(content).digest("hex").slice(0, 20)}.${extension}` &&
        (kind === "cover" ? safeCoverBytes(content) : safeTrailerBytes(content)),
      "Invalid processed media."
    )
    input.listing[key] = path
    derivatives.push(file)
  }
  // No creator-authored file can occupy the reserved processed-media namespace.
  const merged = [
    ...files
      .filter((f) => f.path !== listingPath && !generatedPath.test(f.path))
      .map((f) => replacements.get(f.path) ?? f),
    manifestFile(input.listing),
    ...derivatives
  ]
  requireValue(
    merged.length <= 2000 && merged.reduce((n, f) => n + Buffer.byteLength(f.content, "base64"), 0) <= 20 * 1024 * 1024,
    "Processed artifacts exceed the release limit."
  )
  await sandbox.destroy()
  await log(
    merged
      .filter(
        (f) =>
          !input.listingPaths.has(f.path) &&
          /\.(?:png|jpe?g|webp|avif)$/i.test(f.path) &&
          Buffer.byteLength(f.content, "base64") > 512 * 1024
      )
      .map(
        (f) =>
          `Large game image: ${JSON.stringify(f.path)} (${Buffer.byteLength(f.content, "base64")} bytes). Consider WebP/AVIF or smaller dimensions for artwork; keep data textures lossless.`
      )
  )
  return {
    files: merged,
    warnings: [...input.warnings, ...mediaWarnings(record(JSON.parse(new TextDecoder().decode(bytes))).mediaWarnings)]
  }
}
