import { createClerkClient } from "@clerk/backend"
import { isPlatformAdmin } from "./game-submissions"
import { HttpError, jsonBody, requireValue } from "./http"

export const feedbackColumns = `(SELECT COALESCE(AVG(rating),0) FROM game_ratings WHERE project_id=s.project_id) AS rating,(SELECT COUNT(*) FROM game_ratings WHERE project_id=s.project_id) AS reviews,(SELECT COUNT(*) FROM game_comments WHERE project_id=s.project_id AND hidden=0) AS comments`
const commentColumns =
  "c.id,c.author,c.body,c.created_at AS createdAt,c.updated_at AS updatedAt,COALESCE(r.rating,0) AS rating"
const commentJoin = "FROM game_comments c LEFT JOIN game_ratings r ON r.project_id=c.project_id AND r.user_id=c.user_id"
async function available(env: Env, projectId: string) {
  const game = await env.DATABASE.prepare(
    `SELECT s.id FROM game_submissions s JOIN releases r ON r.id=s.release_id JOIN deployments d ON d.id=s.deployment_id JOIN environments e ON e.project_id=s.project_id AND e.name='production' WHERE s.project_id=? AND s.status='approved' AND r.status='ready' AND d.status='succeeded' AND e.enabled=1 AND NOT EXISTS(SELECT 1 FROM game_moderation m WHERE m.project_id=s.project_id AND m.state='restricted')`
  )
    .bind(projectId)
    .first()
  if (!game) throw new HttpError(404, "not_found", "Game not found.")
}
async function totals(env: Env, projectId: string) {
  return env.DATABASE.prepare(
    `SELECT ${feedbackColumns} FROM game_submissions s WHERE s.project_id=? AND s.status='approved'`
  )
    .bind(projectId)
    .first()
}
export async function publicFeedback(request: Request, env: Env, projectId: string) {
  await available(env, projectId)
  const cursor = new URL(request.url).searchParams.get("cursor")
  let before = ["9999", "~"]
  if (cursor) {
    requireValue(cursor.length <= 250, "Invalid comment cursor.")
    before = cursor.split("|")
    requireValue(
      before.length === 2 && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(before[0]!) && /^[a-zA-Z0-9-]{1,128}$/.test(before[1]!),
      "Invalid comment cursor."
    )
  }
  const page = await env.DATABASE.prepare(
    `SELECT ${commentColumns} ${commentJoin} WHERE c.project_id=? AND c.hidden=0 AND (c.created_at<? OR (c.created_at=? AND c.id<?)) ORDER BY c.created_at DESC,c.id DESC LIMIT 21`
  )
    .bind(projectId, before[0]!, before[0]!, before[1]!)
    .all<{ id: string; createdAt: string }>()
  const comments = page.results.slice(0, 20)
  const last = comments.at(-1)
  return Response.json({
    totals: await totals(env, projectId),
    comments,
    nextCursor: page.results.length > 20 && last ? `${last.createdAt}|${last.id}` : null
  })
}
export async function personalFeedback(env: Env, projectId: string, userId: string) {
  await available(env, projectId)
  const [rating, comment, admin] = await Promise.all([
    env.DATABASE.prepare("SELECT rating FROM game_ratings WHERE project_id=? AND user_id=?")
      .bind(projectId, userId)
      .first<{ rating: number }>(),
    env.DATABASE.prepare(`SELECT ${commentColumns} ${commentJoin} WHERE c.project_id=? AND c.user_id=?`)
      .bind(projectId, userId)
      .first(),
    isPlatformAdmin(env, userId)
  ])
  return Response.json({ rating: rating?.rating ?? 0, comment, admin })
}
export async function mutateFeedback(
  request: Request,
  env: Env,
  projectId: string,
  userId: string,
  kind: string,
  commentId?: string
) {
  await available(env, projectId)
  const now = new Date().toISOString()
  if (kind === "rating" && !commentId) {
    if (request.method === "PUT") {
      const body = await jsonBody(request)
      requireValue(
        Number.isInteger(body.rating) && Number(body.rating) >= 1 && Number(body.rating) <= 5,
        "Choose a rating from 1 to 5."
      )
      await env.DATABASE.prepare(
        "INSERT INTO game_ratings(project_id,user_id,rating,updated_at) VALUES(?,?,?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET rating=excluded.rating,updated_at=excluded.updated_at"
      )
        .bind(projectId, userId, Number(body.rating), now)
        .run()
    } else if (request.method === "DELETE") {
      await env.DATABASE.prepare("DELETE FROM game_ratings WHERE project_id=? AND user_id=?")
        .bind(projectId, userId)
        .run()
    } else throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  } else if (kind === "comments" && request.method === "PUT" && !commentId) {
    const body = await jsonBody(request)
    requireValue(
      typeof body.body === "string" && body.body.trim().length > 0 && body.body.length <= 2000,
      "Write a comment of 1–2000 characters."
    )
    const profile = await createClerkClient({ secretKey: env.CLERK_SECRET_KEY }).users.getUser(userId)
    // Never fall back to an email address or expose the account's internal ID.
    const author = (profile.username || profile.firstName || "Player").slice(0, 64)
    await env.DATABASE.prepare(
      "INSERT INTO game_comments(id,project_id,user_id,author,body,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET author=excluded.author,body=excluded.body,updated_at=excluded.updated_at,moderation_revision=moderation_revision+1"
    )
      .bind(crypto.randomUUID(), projectId, userId, author, body.body.trim(), now, now)
      .run()
  } else if (kind === "comments" && request.method === "DELETE" && commentId) {
    const deleted = await env.DATABASE.prepare(
      "DELETE FROM game_comments WHERE project_id=? AND id=? AND user_id=? RETURNING id"
    )
      .bind(projectId, commentId, userId)
      .first()
    if (!deleted) throw new HttpError(404, "not_found", "Comment not found.")
  } else throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  return Response.json({ totals: await totals(env, projectId) })
}
