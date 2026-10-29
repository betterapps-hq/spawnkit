import { gameDimensions, gameGenres, listingClassification, listingDetails } from "@spawn/templates/listing"
import { conflict, privateResponse, revision } from "./community-access"
import { HttpError, jsonBody, requireValue } from "./http"
import { mediaWarnings } from "./media-warnings"

interface ListingRow {
  title: string
  description: string
  genre: string | null
  dimension: string | null
  details: string
  revision: number
  active: number
}
async function read(env: Env, projectId: string) {
  const release =
    await env.DATABASE.prepare(`SELECT p.name,e.current_release_id AS releaseId,r.media_warnings AS warnings,h.hostname,s.cover_path AS coverPath,s.trailer_path AS trailerPath,s.title,s.description,s.genre,s.dimension,s.details
    FROM projects p LEFT JOIN environments e ON e.project_id=p.id AND e.name='production'
    LEFT JOIN game_submissions s ON s.id=(SELECT id FROM game_submissions WHERE project_id=p.id AND release_id=e.current_release_id ORDER BY submitted_at DESC,rowid DESC LIMIT 1)
    LEFT JOIN releases r ON r.id=e.current_release_id LEFT JOIN deployments d ON d.id=s.deployment_id LEFT JOIN deployment_hostnames h ON h.deployment_id=d.id WHERE p.id=?`)
      .bind(projectId)
      .first<{
        name: string
        releaseId: string | null
        warnings: string | null
        hostname: string | null
        coverPath: string | null
        trailerPath: string | null
        title: string | null
        description: string | null
        genre: string | null
        dimension: string | null
        details: string
      }>()
  if (!release) throw new HttpError(404, "not_found", "Project not found.")
  let config: Record<string, unknown> = {}
  if (release.releaseId) {
    const prefix = `releases/${projectId}/${release.releaseId}/`
    const object = await env.ARTIFACTS.get(`${prefix}spawnkit.config.json`)
    if (object && object.size <= 4096)
      try {
        const value: unknown = JSON.parse(await object.text())
        if (value && typeof value === "object" && !Array.isArray(value)) config = value as Record<string, unknown>
      } catch {
        /* Optional metadata. */
      }
  }
  const defaults = {
    title:
      typeof config.title === "string" && config.title.trim().length > 0 && config.title.length <= 64
        ? config.title.trim()
        : release.name.slice(0, 64),
    description:
      typeof config.description === "string" &&
      config.description.trim().length >= 10 &&
      config.description.length <= 500
        ? config.description.trim()
        : `Play ${release.name} in your browser.`,
    ...listingClassification(config),
    details: listingDetails(config.details)
  }
  const settings = await env.DATABASE.prepare(
    "SELECT title,description,genre,dimension,details,revision,active FROM project_listing_settings WHERE project_id=?"
  )
    .bind(projectId)
    .first<ListingRow>()
  const current = settings
    ? settings
    : release.title
      ? {
          title: release.title,
          description: release.description!,
          genre: release.genre,
          dimension: release.dimension,
          details: release.details
        }
      : defaults
  return {
    defaults,
    release,
    listing: {
      projectId,
      title: current.title,
      description: current.description,
      genre: current.genre || null,
      dimension: current.dimension || null,
      details: listingDetails(current.details),
      revision: settings?.revision ?? 0,
      overridden: Boolean(settings?.active),
      releaseId: release.releaseId,
      coverUrl: release.hostname && release.coverPath ? `https://${release.hostname}/${release.coverPath}` : null,
      trailerUrl: release.hostname && release.trailerPath ? `https://${release.hostname}/${release.trailerPath}` : null,
      warnings: mediaWarnings(release.warnings)
    }
  }
}
export async function projectListing(request: Request, env: Env, ownerId: string, projectId: string) {
  if (
    !(await env.DATABASE.prepare("SELECT id FROM projects WHERE id=? AND owner_id=?").bind(projectId, ownerId).first())
  )
    throw new HttpError(404, "not_found", "Project not found.")
  if (request.method === "GET") return privateResponse((await read(env, projectId)).listing)
  if (request.method !== "PUT") throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  const body = await jsonBody(request)
  revision(body.revision)
  requireValue(body.reset === true || body.reset === false, "Invalid listing action.")
  const { listing, defaults, release } = await read(env, projectId)
  if (body.revision !== listing.revision || body.releaseId !== listing.releaseId) throw conflict()
  const values = body.reset ? defaults : body
  requireValue(
    typeof values.title === "string" && values.title.trim().length > 0 && values.title.length <= 64,
    "Enter a title of up to 64 characters."
  )
  requireValue(
    typeof values.description === "string" &&
      values.description.trim().length >= 10 &&
      values.description.length <= 500,
    "Enter a description of 10–500 characters."
  )
  if (!body.reset)
    requireValue(
      gameGenres.some((g) => g === values.genre) && gameDimensions.some((d) => d === values.dimension),
      "Choose a genre and dimension."
    )
  const actionId = crypto.randomUUID(),
    now = new Date().toISOString()
  await env.DATABASE.batch([
    env.DATABASE.prepare(`INSERT INTO project_listing_settings(project_id,title,description,genre,dimension,details,revision,active,last_action_id,updated_at)
      SELECT ?,?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT revision FROM project_listing_settings WHERE project_id=?),0)=? AND COALESCE((SELECT current_release_id FROM environments WHERE project_id=? AND name='production'),'')=?
      ON CONFLICT(project_id) DO UPDATE SET title=excluded.title,description=excluded.description,genre=excluded.genre,dimension=excluded.dimension,details=excluded.details,revision=excluded.revision,active=excluded.active,last_action_id=excluded.last_action_id,updated_at=excluded.updated_at`).bind(
      projectId,
      values.title.trim(),
      values.description.trim(),
      String(values.genre ?? ""),
      String(values.dimension ?? ""),
      JSON.stringify(listingDetails(values.details)),
      body.revision + 1,
      body.reset ? 0 : 1,
      actionId,
      now,
      projectId,
      body.revision,
      projectId,
      release.releaseId ?? ""
    ),
    env.DATABASE.prepare(
      "UPDATE game_submissions SET title=?,description=?,genre=?,dimension=?,details=? WHERE project_id=? AND EXISTS(SELECT 1 FROM project_listing_settings WHERE project_id=? AND last_action_id=?)"
    ).bind(
      values.title.trim(),
      values.description.trim(),
      values.genre || null,
      values.dimension || null,
      JSON.stringify(listingDetails(values.details)),
      projectId,
      projectId,
      actionId
    ),
    env.DATABASE.prepare(
      "UPDATE projects SET name=?,revision=revision+1,updated_at=? WHERE id=? AND lifecycle='active' AND EXISTS(SELECT 1 FROM project_listing_settings WHERE project_id=? AND last_action_id=?)"
    ).bind(values.title.trim(), now, projectId, projectId, actionId)
  ])
  if (
    !(await env.DATABASE.prepare(
      "SELECT project_id FROM project_listing_settings WHERE project_id=? AND last_action_id=?"
    )
      .bind(projectId, actionId)
      .first())
  )
    throw conflict()
  return privateResponse((await read(env, projectId)).listing)
}
