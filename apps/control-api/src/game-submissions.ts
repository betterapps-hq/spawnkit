import { listingDetails, gameCategories, gameCategoryMinimum } from "@spawn/templates/listing"
import { communityRole } from "./community-access"
import { feedbackColumns } from "./game-feedback"
import { HttpError, jsonBody, requireValue } from "./http"
import { listingCover } from "./listing-cover"
import { listingTrailer } from "./listing-trailer"

const mediaColumns = `'https://' || h.hostname || '/' || s.cover_path AS coverUrl,'https://' || h.hostname || '/' || s.trailer_path AS trailerUrl`
const listingColumns = `s.id,s.project_id AS projectId,s.release_id AS releaseId,s.title,s.description,s.genre,s.dimension,s.details,s.submitted_at AS submittedAt,'https://' || h.hostname AS url,${mediaColumns}`
const columns = `${listingColumns},s.status,s.reviewed_at AS reviewedAt,s.review_note AS reviewNote`
const joins = `FROM game_submissions s JOIN deployment_hostnames h ON h.deployment_id=s.deployment_id JOIN releases r ON r.id=s.release_id JOIN deployments d ON d.id=h.deployment_id JOIN environments e ON e.project_id=s.project_id AND e.name='production'`
const available = `r.status='ready' AND d.status='succeeded' AND e.enabled=1 AND NOT EXISTS(SELECT 1 FROM game_moderation m WHERE m.project_id=s.project_id AND m.state='restricted')`
const discoverable = `NOT EXISTS(SELECT 1 FROM game_moderation moderation WHERE moderation.project_id=s.project_id AND moderation.state='hidden')`

async function publicCategories(env: Env) {
  const rows = await env.DATABASE.prepare(
    `SELECT s.genre,COUNT(DISTINCT s.project_id) AS total ${joins} WHERE s.status='approved' AND ${available} AND ${discoverable} GROUP BY s.genre HAVING COUNT(DISTINCT s.project_id)>=?`
  )
    .bind(gameCategoryMinimum)
    .all<{ genre: string; total: number }>()
  return rows.results.flatMap((row) => {
    const category = gameCategories.find((item) => item.genre === row.genre)
    return category ? [{ ...category, total: row.total }] : []
  })
}

/** Stable, bounded browse pages include the full approved catalog, beyond the homepage feed. */
export async function publicGameBrowse(env: Env, parameters: URLSearchParams) {
  const pageValue = parameters.get("page") ?? "1"
  requireValue(/^[1-9]\d{0,5}$/.test(pageValue), "Choose a valid catalog page.")
  const page = Number(pageValue)
  const genre = parameters.get("genre")
  requireValue(!genre || gameCategories.some((item) => item.genre === genre), "Choose a supported genre.")
  const where = `${joins} WHERE s.status='approved' AND ${available} AND ${discoverable}${genre ? " AND s.genre=?" : ""}`
  const args = genre ? [genre] : []
  const count = await env.DATABASE.prepare(`SELECT COUNT(DISTINCT s.project_id) AS total ${where}`)
    .bind(...args)
    .first<{ total: number }>()
  const total = count?.total ?? 0
  if (page > Math.max(1, Math.ceil(total / 24))) throw new HttpError(404, "not_found", "Catalog page not found.")
  const rows = await env.DATABASE.prepare(
    `SELECT s.project_id AS projectId,s.title,s.description,s.genre,s.dimension,s.details,'https://' || h.hostname AS url,${mediaColumns} ${where} ORDER BY s.project_id LIMIT 24 OFFSET ?`
  )
    .bind(...args, (page - 1) * 24)
    .all()
  return Response.json(
    {
      games: rows.results.map((row) => ({ ...row, details: listingDetails(row.details) })),
      total,
      page,
      pageSize: 24,
      categories: await publicCategories(env)
    },
    { headers: { "cache-control": "no-store" } }
  )
}

/** Complete, bounded inventory for sitemap shards, independent of discovery's top 100. */
export async function publicGameSitemap(env: Env, pageValue: string | null) {
  const page = pageValue ?? "1"
  requireValue(/^[1-9]\d{0,4}$/.test(page) && Number(page) <= 49999, "Choose a valid sitemap page.")
  const where = `${joins} WHERE s.status='approved' AND ${available} AND ${discoverable}`
  const count = await env.DATABASE.prepare(`SELECT COUNT(DISTINCT s.project_id) AS total ${where}`).first<{
    total: number
  }>()
  const result = await env.DATABASE.prepare(
    `SELECT DISTINCT s.project_id AS projectId ${where} ORDER BY s.project_id LIMIT 1000 OFFSET ?`
  )
    .bind((Number(page) - 1) * 1000)
    .all()
  return Response.json(
    {
      games: result.results,
      total: count?.total ?? 0,
      categories: Number(page) === 1 ? await publicCategories(env) : []
    },
    { headers: { "cache-control": "no-store" } }
  )
}

export async function publicGames(env: Env, projectId?: string, now = Date.now()) {
  // Today plus the previous 29 UTC dates. Daily totals survive visitor expiry.
  const since = new Date(now - 29 * 86400_000).toISOString().slice(0, 10)
  const today = new Date(now).toISOString().slice(0, 10)
  const result = await env.DATABASE.prepare(
    `SELECT s.project_id AS projectId,s.title,s.description,s.genre,s.dimension,s.details,${discoverable} AS discoverable,'https://' || h.hostname AS url,${mediaColumns},COALESCE(a.views,0) AS views,COALESCE(a.plays,0) AS plays,COALESCE(m.views,0) AS monthlyViews,${feedbackColumns} ${joins} LEFT JOIN game_activity_totals a ON a.project_id=s.project_id LEFT JOIN (SELECT project_id,SUM(views) AS views FROM game_activity_daily WHERE day>=? AND day<=? GROUP BY project_id) m ON m.project_id=s.project_id WHERE s.status='approved' AND ${available} ${projectId ? "AND s.project_id=?" : `AND ${discoverable}`} ORDER BY s.reviewed_at DESC LIMIT 100`
  )
    .bind(since, today, ...(projectId ? [projectId] : []))
    .all()
  return Response.json(
    {
      games: result.results.map((game) => ({
        ...game,
        details: listingDetails(game.details),
        discoverable: Boolean(game.discoverable)
      }))
    },
    { headers: { "cache-control": "no-store" } }
  )
}
export async function isPlatformAdmin(env: Env, userId: string) {
  return (await communityRole(env, userId)) === "Admin"
}
export async function adminGamesRoute(request: Request, env: Env, userId: string, id?: string) {
  if (!(await isPlatformAdmin(env, userId))) throw new HttpError(403, "forbidden", "Administrator access required.")
  if (request.method === "GET" && !id) {
    const rows = await env.DATABASE.prepare(
      `SELECT ${columns} ${joins} WHERE NOT EXISTS (SELECT 1 FROM game_submissions newer WHERE newer.project_id=s.project_id AND (newer.submitted_at>s.submitted_at OR (newer.submitted_at=s.submitted_at AND newer.rowid>s.rowid))) ORDER BY CASE s.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,s.submitted_at DESC LIMIT 100`
    ).all()
    return Response.json({ submissions: rows.results.map((row) => ({ ...row, details: listingDetails(row.details) })) })
  }
  if (request.method !== "POST" || !id) throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  const body = await jsonBody(request)
  requireValue(
    body.action === "approve" || body.action === "reject" || body.action === "unpublish",
    "Choose a review action."
  )
  requireValue(typeof body.note === "string" && body.note.length <= 500, "Review notes must be at most 500 characters.")
  requireValue(body.action !== "unpublish" || body.note.trim().length > 0, "Enter an internal moderation note.")
  const row = await env.DATABASE.prepare(
    `SELECT s.project_id AS projectId,s.release_id AS releaseId,s.cover_path AS coverPath,s.trailer_path AS trailerPath,s.status,s.title,s.description,s.genre,s.dimension,s.details ${joins} WHERE s.id=? ${body.action === "approve" ? `AND ${available}` : ""}`
  )
    .bind(id)
    .first<{
      projectId: string
      releaseId: string
      coverPath: string | null
      trailerPath: string | null
      status: string
      title: string
      description: string
      genre: string | null
      dimension: string | null
      details: string
    }>()
  if (!row) throw new HttpError(404, "not_found", "Submission or playable release not found.")
  const expected = body.action === "unpublish" ? "approved" : "pending"
  if (row.status !== expected)
    throw new HttpError(409, "review_conflict", "This submission has already changed. Refresh the queue.")
  const status = { approve: "approved", reject: "rejected", unpublish: "unpublished" }[body.action]
  const now = new Date().toISOString()
  // Recheck permission and the reviewed snapshot inside the transaction, after media I/O.
  const reviewGuard = `EXISTS(SELECT 1 FROM community_access WHERE user_id=? AND role='Admin')
    AND EXISTS(SELECT 1 ${joins} WHERE s.id=? AND s.status=? AND s.title=? AND s.description=? AND s.genre IS ? AND s.dimension IS ? AND s.details=? AND s.cover_path IS ? AND s.trailer_path IS ?
    ${body.action === "approve" ? `AND ${available} AND e.current_release_id=s.release_id` : ""})`
  const guardValues = [
    userId,
    id,
    expected,
    row.title,
    row.description,
    row.genre,
    row.dimension,
    row.details,
    row.coverPath,
    row.trailerPath
  ]
  const statements = []
  let cover = row.coverPath,
    trailer = row.trailerPath
  if (body.action === "approve") {
    cover = await listingCover(env.ARTIFACTS, `releases/${row.projectId}/${row.releaseId}/`, row.coverPath)
    trailer = await listingTrailer(env.ARTIFACTS, `releases/${row.projectId}/${row.releaseId}/`, row.trailerPath)
    statements.push(
      env.DATABASE.prepare(
        `UPDATE game_submissions SET status='superseded',reviewer_id=?,reviewed_at=?,review_note='Replaced by an approved release.' WHERE project_id=? AND status='approved' AND ${reviewGuard}`
      ).bind(userId, now, row.projectId, ...guardValues)
    )
  }
  statements.push(
    env.DATABASE.prepare(
      `UPDATE game_submissions SET status=?,reviewer_id=?,reviewed_at=?,review_note=?,cover_path=?,trailer_path=? WHERE id=? AND status=? AND ${reviewGuard} RETURNING id`
    ).bind(status, userId, now, body.note.trim(), cover, trailer, id, expected, ...guardValues)
  )
  const results = await env.DATABASE.batch(statements)
  if (!results.at(-1)?.results.length)
    throw new HttpError(409, "review_conflict", "This submission has already changed. Refresh the queue.")
  return Response.json({ status })
}
