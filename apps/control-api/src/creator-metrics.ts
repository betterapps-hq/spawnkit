import { findStarterKit } from "@spawn/templates/kits"
import { HttpError } from "./http"

export async function recordKitDownload(env: Env, kit: string) {
  if (!findStarterKit(kit)) throw new HttpError(400, "invalid_kit", "Unknown kit.")
  const id = crypto.randomUUID(),
    now = new Date()
  await env.DATABASE.prepare("INSERT INTO kit_downloads(id,kit_id,created_at) VALUES(?,?,?)")
    .bind(id, kit, now.toISOString())
    .run()
  return { schemaVersion: 1, downloadId: id, kitId: kit, consent: true }
}

export async function pruneCreatorMetrics(env: Env) {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString()
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      "UPDATE releases SET kit_download_id=NULL WHERE kit_download_id IN (SELECT id FROM kit_downloads WHERE created_at < ? LIMIT 500)"
    ).bind(cutoff),
    env.DATABASE.prepare(
      "DELETE FROM kit_downloads WHERE id IN (SELECT id FROM kit_downloads WHERE created_at < ? LIMIT 500)"
    ).bind(cutoff)
  ])
}

export async function attributeRelease(env: Env, release: string, files: { path: string; content: Uint8Array }[]) {
  const file = files.find((file) => file.path === "spawnkit-attribution.json")
  if (!file || file.content.byteLength > 512) return
  let data: { schemaVersion?: unknown; downloadId?: unknown; kitId?: unknown; consent?: unknown }
  try {
    data = JSON.parse(new TextDecoder().decode(file.content))
  } catch {
    return
  }
  if (
    !data ||
    data.schemaVersion !== 1 ||
    data.consent !== true ||
    typeof data.downloadId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(data.downloadId) ||
    typeof data.kitId !== "string"
  )
    return
  await env.DATABASE.prepare(
    "UPDATE releases SET kit_download_id=(SELECT id FROM kit_downloads WHERE id=? AND kit_id=? AND created_at>=?) WHERE id=?"
  )
    .bind(data.downloadId, data.kitId, new Date(Date.now() - 90 * 86400000).toISOString(), release)
    .run()
}

/** One first successful production deployment per project, but many projects may share a download. */
export async function creatorMetrics(env: Env) {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString()
  const data = await env.DATABASE.prepare(`
    WITH first_deployments AS (
      SELECT d.project_id, r.kit_download_id FROM deployments d JOIN releases r ON r.id=d.release_id
      WHERE d.status='succeeded' AND d.environment='production'
      AND NOT EXISTS (SELECT 1 FROM deployments prior WHERE prior.project_id=d.project_id
        AND prior.status='succeeded' AND prior.environment='production'
        AND (prior.updated_at < d.updated_at OR (prior.updated_at=d.updated_at AND prior.id < d.id)))
    )
    SELECT k.kit_id, COUNT(DISTINCT k.id) AS prepared_downloads,
      COUNT(DISTINCT CASE WHEN f.project_id IS NOT NULL THEN k.id END) AS converted_downloads,
      COUNT(DISTINCT f.project_id) AS first_deployed_projects
    FROM kit_downloads k LEFT JOIN first_deployments f ON f.kit_download_id=k.id
    WHERE k.created_at>=? GROUP BY k.kit_id ORDER BY k.kit_id
  `)
    .bind(cutoff)
    .all()
  return { windowDays: 90, attribution: "opt-in-download-cohort", localStarts: "unobserved", kits: data.results }
}
