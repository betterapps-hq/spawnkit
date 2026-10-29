import { createHash } from "node:crypto"
import { boundedBody, HttpError, record, requireValue } from "./http"

const windowMs = 30 * 60_000
const eligible = `SELECT 1 FROM game_submissions s JOIN releases r ON r.id=s.release_id JOIN deployments d ON d.id=s.deployment_id JOIN deployment_hostnames h ON h.deployment_id=d.id JOIN environments e ON e.project_id=s.project_id AND e.name='production' WHERE s.project_id=? AND s.status='approved' AND r.status='ready' AND d.status='succeeded' AND e.enabled=1 AND NOT EXISTS(SELECT 1 FROM game_moderation m WHERE m.project_id=s.project_id AND m.state='restricted')`

/** Reached only through the dashboard's private service binding. */
export async function recordGameActivity(request: Request, env: Env, now = Date.now()) {
  if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Use POST.")
  const projectId = new URL(request.url).pathname.split("/").at(-2) ?? ""
  requireValue(/^[A-Za-z0-9_-]{1,128}$/.test(projectId), "Invalid game.")
  const ip = request.headers.get("x-spawn-client-ip") ?? "local"
  if (env.API_READ_LIMIT && !(await env.API_READ_LIMIT.limit({ key: `activity:ip:${ip}` })).success)
    throw new HttpError(429, "rate_limited", "Too many requests.")
  let body: Record<string, unknown>
  try {
    body = record(JSON.parse(new TextDecoder().decode(await boundedBody(request, 1024))))
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, "invalid_json", "Invalid activity.")
  }
  requireValue(body.kind === "view" || body.kind === "play", "Invalid activity kind.")
  requireValue(
    typeof body.visitorId === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.visitorId),
    "Invalid visitor."
  )
  const visitor = createHash("sha256").update(`${projectId}:${body.visitorId}`).digest("hex")
  if (env.API_WRITE_LIMIT && !(await env.API_WRITE_LIMIT.limit({ key: `activity:visitor:${visitor}` })).success)
    throw new HttpError(429, "rate_limited", "Too many requests.")
  if (!(await env.DATABASE.prepare(eligible).bind(projectId).first()))
    throw new HttpError(404, "not_found", "Published game not found.")
  const results = await env.DATABASE.batch<{ views?: number; plays?: number }>([
    env.DATABASE.prepare(
      `INSERT INTO game_activity_visitors(project_id,visitor_hash,kind,counted_at) SELECT ?,?,?,? WHERE EXISTS(${eligible}) ON CONFLICT(project_id,visitor_hash,kind) DO UPDATE SET counted_at=excluded.counted_at WHERE game_activity_visitors.counted_at<=excluded.counted_at-? RETURNING kind`
    ).bind(projectId, visitor, body.kind, now, projectId, windowMs),
    env.DATABASE.prepare("SELECT views,plays FROM game_activity_totals WHERE project_id=?").bind(projectId)
  ])
  return Response.json(
    { counted: Boolean(results[0]?.results.length), views: 0, plays: 0, ...results[1]?.results[0] },
    { headers: { "cache-control": "no-store" } }
  )
}

export async function pruneGameActivity(env: Env, now = Date.now()) {
  await env.DATABASE.prepare(
    "DELETE FROM game_activity_visitors WHERE rowid IN (SELECT rowid FROM game_activity_visitors WHERE counted_at<=? ORDER BY counted_at LIMIT 1000)"
  )
    .bind(now - windowMs)
    .run()
}
