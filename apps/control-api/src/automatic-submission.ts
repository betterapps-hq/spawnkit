import { listingClassification, listingDetails } from "@spawn/templates/listing"
import type { DeploymentRow } from "./activation"
import { listingCover } from "./listing-cover"
import { listingTrailer } from "./listing-trailer"

/** Prepare the listing before activation; enqueue it in the same database transaction. */
export async function automaticSubmission(env: Env, deployment: DeploymentRow, now: string) {
  const prefix = `releases/${deployment.project_id}/${deployment.release_id}/`
  const manifest = await env.ARTIFACTS.get(`${prefix}spawnkit.config.json`)
  let listing: Record<string, unknown> = {}
  if (manifest && manifest.size <= 4096) {
    try {
      const value: unknown = JSON.parse(await manifest.text())
      if (value && typeof value === "object" && !Array.isArray(value)) listing = value as Record<string, unknown>
    } catch {
      /* Optional listing metadata must not block an otherwise valid game. */
    }
  }
  const title =
    typeof listing.title === "string" && listing.title.trim().length > 0 && listing.title.length <= 64
      ? listing.title.trim()
      : null
  const description =
    typeof listing.description === "string" &&
    listing.description.trim().length >= 10 &&
    listing.description.length <= 500
      ? listing.description.trim()
      : null
  const [cover, trailer] = await Promise.all([
    listingCover(env.ARTIFACTS, prefix, listing.coverPath),
    listingTrailer(env.ARTIFACTS, prefix, listing.trailerPath)
  ])
  const { genre, dimension } = listingClassification(listing)
  // Media processing emits a manifest even without a supplied listing. Only usable
  // author metadata can replace saved details; media-only/malformed manifests cannot.
  const hasConfig = Boolean(
    title && description && (listing.genre === undefined || genre) && (listing.dimension === undefined || dimension)
  )
  const actionId = `listing:${deployment.id}`
  const details = JSON.stringify(listingDetails(listing.details))
  const from = `FROM deployments d JOIN projects p ON p.id=d.project_id JOIN releases r ON r.id=d.release_id
    JOIN deployment_hostnames h ON h.deployment_id=d.id
    JOIN environments e ON e.project_id=p.id AND e.name='production'`
  const eligible = `d.id=? AND d.environment='production' AND d.status='succeeded' AND r.status='ready' AND e.enabled=1 AND e.current_release_id=r.id`
  return [
    // Read the current values inside the activation transaction, never from a stale
    // pre-build snapshot. The audit marker makes a delivery retry a metadata no-op.
    env.DATABASE.prepare(`INSERT INTO project_listing_settings(project_id,title,description,genre,dimension,details,revision,active,last_action_id,updated_at)
      SELECT p.id,
        CASE WHEN ? THEN ? ELSE COALESCE(l.title,previous.title,substr(p.name,1,64)) END,
        CASE WHEN ? THEN ? ELSE COALESCE(l.description,previous.description,'Play ' || p.name || ' in your browser.') END,
        CASE WHEN ? THEN ? ELSE COALESCE(l.genre,previous.genre,'') END,
        CASE WHEN ? THEN ? ELSE COALESCE(l.dimension,previous.dimension,'') END,
        CASE WHEN ? THEN ? ELSE COALESCE(l.details,previous.details,'{}') END,
        COALESCE(l.revision,0)+?,CASE WHEN ? THEN 0 ELSE COALESCE(l.active,0) END,?,?
      ${from}
      LEFT JOIN project_listing_settings l ON l.project_id=p.id
      LEFT JOIN game_submissions previous ON previous.id=(SELECT id FROM game_submissions WHERE project_id=p.id ORDER BY submitted_at DESC,rowid DESC LIMIT 1)
      WHERE ${eligible} AND NOT EXISTS(SELECT 1 FROM audit_events WHERE id=?)
      ON CONFLICT(project_id) DO UPDATE SET title=excluded.title,description=excluded.description,genre=excluded.genre,dimension=excluded.dimension,details=excluded.details,revision=excluded.revision,active=excluded.active,last_action_id=excluded.last_action_id,updated_at=excluded.updated_at`).bind(
      Number(hasConfig),
      title,
      Number(hasConfig),
      description,
      Number(hasConfig),
      genre ?? "",
      Number(hasConfig),
      dimension ?? "",
      Number(hasConfig),
      details,
      Number(hasConfig),
      Number(hasConfig),
      actionId,
      now,
      deployment.id,
      actionId
    ),
    env.DATABASE.prepare(`UPDATE game_submissions SET
        (title,description,genre,dimension,details)=(SELECT title,description,NULLIF(genre,''),NULLIF(dimension,''),details FROM project_listing_settings WHERE project_id=?)
      WHERE project_id=? AND EXISTS(SELECT 1 FROM project_listing_settings WHERE project_id=? AND last_action_id=?)
      AND NOT EXISTS(SELECT 1 FROM audit_events WHERE id=?)`).bind(
      deployment.project_id,
      deployment.project_id,
      deployment.project_id,
      actionId,
      actionId
    ),
    env.DATABASE.prepare(
      "UPDATE projects SET name=(SELECT title FROM project_listing_settings WHERE project_id=?),revision=revision+1,updated_at=? WHERE id=? AND lifecycle='active' AND EXISTS(SELECT 1 FROM project_listing_settings WHERE project_id=? AND last_action_id=?) AND NOT EXISTS(SELECT 1 FROM audit_events WHERE id=?)"
    ).bind(deployment.project_id, now, deployment.project_id, deployment.project_id, actionId, actionId),
    env.DATABASE.prepare(`INSERT OR IGNORE INTO game_submissions(id,project_id,release_id,deployment_id,title,description,submitted_at,cover_path,trailer_path,genre,dimension,details)
      SELECT ?,p.id,r.id,d.id,COALESCE(l.title,substr(p.name,1,64)),COALESCE(l.description,'Play ' || p.name || ' in your browser.'),?,?,?,NULLIF(l.genre,''),NULLIF(l.dimension,''),COALESCE(l.details,'{}')
      ${from} LEFT JOIN project_listing_settings l ON l.project_id=p.id WHERE ${eligible}`).bind(
      crypto.randomUUID(),
      now,
      cover,
      trailer,
      deployment.id
    ),
    env.DATABASE.prepare(`INSERT OR IGNORE INTO audit_events(id,project_id,actor_id,action,detail,created_at)
      SELECT ?,p.id,d.actor_id,'listing.deployment',json_object('deploymentId',d.id,'releaseId',r.id,'source',?),?
      ${from} WHERE ${eligible}`).bind(actionId, hasConfig ? "configuration" : "preserved", now, deployment.id)
  ]
}
