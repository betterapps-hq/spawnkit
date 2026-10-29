import { createHash } from "node:crypto"
import { gzipSync } from "node:zlib"
import { parseListingConfig } from "@spawn/templates/listing"
import { deploymentRoute } from "./deployments"
import { boundedBody, HttpError, record, requireValue } from "./http"
import { putProjectArtifact } from "./project-lifecycle"
import { decodeSource, MAX_SOURCE_BYTES } from "./source"

/** Repackage an owned immutable browser release; the ordinary queue validates and optimizes all media. */
export async function updateListingMedia(request: Request, env: Env, ownerId: string, projectId: string) {
  const project = await env.DATABASE.prepare("SELECT id FROM projects WHERE id=? AND owner_id=?")
    .bind(projectId, ownerId)
    .first()
  if (!project) throw new HttpError(404, "not_found", "Project not found.")
  requireValue(request.method === "POST", "Use POST to update media.")
  let body: Record<string, unknown>
  try {
    body = record(JSON.parse(new TextDecoder().decode(await boundedBody(request, 4.3 * 1024 * 1024))))
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, "invalid_json", "Invalid media update.")
  }
  requireValue(typeof body.key === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(body.key), "Invalid update key.")
  const key = `listing-${createHash("sha256").update(JSON.stringify(body)).digest("hex")}`
  const existing = await env.DATABASE.prepare(
    "SELECT id,request_hash FROM deployments WHERE project_id=? AND request_key=?"
  )
    .bind(projectId, key)
    .first<{ id: string; request_hash: string }>()
  if (existing) return Response.json({ id: existing.id })
  const current = await env.DATABASE.prepare(
    "SELECT e.current_release_id AS releaseId,COALESCE(l.revision,0) AS revision FROM environments e LEFT JOIN project_listing_settings l ON l.project_id=e.project_id WHERE e.project_id=? AND e.name='production'"
  )
    .bind(projectId)
    .first<{ releaseId: string; revision: number }>()
  if (!current?.releaseId || body.releaseId !== current.releaseId || body.revision !== current.revision)
    throw new HttpError(409, "conflict", "The game changed. Refresh before saving.")
  let listing: ReturnType<typeof parseListingConfig>
  try {
    listing = parseListingConfig(body.listing)
  } catch {
    throw new HttpError(400, "invalid_listing", "Check your game title, description, genre and dimension.")
  }
  const prefix = `releases/${projectId}/${current.releaseId}/`
  const files = new Map<string, string>()
  let cursor: string | undefined
  let total = 0
  do {
    const page = await env.ARTIFACTS.list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) })
    for (const object of page.objects) {
      total += object.size
      requireValue(total <= MAX_SOURCE_BYTES - 4096 && files.size < 1994, "Game exceeds the media update limit.")
      const stored = await env.ARTIFACTS.get(object.key)
      requireValue(stored, "Game files are unavailable. Try again.")
      files.set(object.key.slice(prefix.length), Buffer.from(await stored.arrayBuffer()).toString("base64"))
    }
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)
  requireValue(files.has("index.html"), "No playable game is deployed.")
  const prior = record(JSON.parse(Buffer.from(files.get("spawnkit.config.json") ?? "e30=", "base64").toString()))
  const config: Record<string, unknown> = {
    ...listing,
    coverPath: prior.coverPath ?? null,
    trailerPath: prior.trailerPath ?? null
  }
  requireValue(!(body.removeTrailer === true && body.trailer !== undefined), "Choose a preview or remove it.")
  if (body.removeTrailer === true) config.trailerPath = null
  for (const kind of ["cover", "trailer"] as const) {
    if (body[kind] === undefined) continue
    const asset = record(body[kind])
    const extension = typeof asset.extension === "string" ? asset.extension : ""
    requireValue(
      (kind === "cover" ? ["png", "jpg", "jpeg", "webp"] : ["mp4", "webm"]).includes(extension),
      "Unsupported media format."
    )
    requireValue(typeof asset.content === "string", "Choose a media file.")
    const bytes = Buffer.from(asset.content, "base64")
    requireValue(
      bytes.length > 0 &&
        bytes.length <= (kind === "cover" ? 1 : 2) * 1024 * 1024 &&
        bytes.toString("base64") === asset.content,
      `The ${kind} exceeds its size limit.`
    )
    const path = `spawnkit-${kind}-input-${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.${extension}`
    files.set(path, asset.content)
    config[`${kind}Path`] = path
  }
  requireValue(
    body.cover !== undefined || body.trailer !== undefined || body.removeTrailer === true,
    "Choose a new cover or preview."
  )
  files.set("spawnkit.config.json", Buffer.from(JSON.stringify(config)).toString("base64"))
  const sourceFiles = [...files].map(([path, content]) => ({ path: `game/${path}`, content }))
  for (const [path, value] of Object.entries({
    "package.json": JSON.stringify({ name: "listing-update", private: true, scripts: { build: "node publish.mjs" } }),
    "pnpm-lock.yaml":
      "lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n",
    "game.config.json": JSON.stringify({ schemaVersion: 1, mode: "single", template: "pixi" }),
    "publish.mjs": 'import { cp } from "node:fs/promises"; await cp("game","dist",{recursive:true,errorOnExist:true});',
    "listing-update.json": JSON.stringify({ strictMedia: true })
  }))
    sourceFiles.push({ path, content: Buffer.from(value).toString("base64") })
  const source = gzipSync(JSON.stringify({ version: 1, files: sourceFiles }))
  const digest = createHash("sha256").update(source).digest("hex")
  decodeSource(source, digest)
  const uploadId = createHash("sha256").update(`${projectId}:${key}`).digest("hex")
  await putProjectArtifact(env, projectId, `sources/${projectId}/${uploadId}.gz`, source)
  await env.DATABASE.prepare(
    "INSERT INTO uploads(id,project_id,sha256,size_bytes,status,expires_at) VALUES(?,?,?,?,'ready',?) ON CONFLICT DO NOTHING"
  )
    .bind(uploadId, projectId, digest, source.length, new Date(Date.now() + 15 * 60_000).toISOString())
    .run()
  return deploymentRoute(
    new Request(request.url, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({ environment: "production", expectedReleaseId: current.releaseId, uploadId })
    }),
    env,
    projectId,
    ownerId,
    "deployments"
  )
}
