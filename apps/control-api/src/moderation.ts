import { createHash } from "node:crypto"
import { createClerkClient } from "@clerk/backend"
import {
  moderationActions,
  moderationReasons,
  type ManagedGame,
  type ManagedComment,
  type ModerationEvent,
  type ModerationState
} from "@spawn/platform/moderation"
import { requireCommunity } from "./community-access"
import { HttpError, jsonBody, requireValue } from "./http"

// One row per deployed project. Discovery approval and moderation are independent:
// a new release or another approval cannot clear a project-wide restriction.
const games = `WITH games AS (
 SELECT p.id,COALESCE(s.title,p.name) AS title,p.owner_id AS creatorId,COALESCE(s.description,'') AS description,
 s.genre,s.dimension,CASE WHEN s.cover_path IS NOT NULL THEN 'https://' || sh.hostname || '/' || s.cover_path END AS coverUrl,
 'https://' || COALESCE(h.hostname,dh.hostname) AS url,COALESCE(m.state,'normal') AS state,COALESCE(m.revision,0) AS revision,
 CASE WHEN m.state='restricted' THEN 'Restricted' WHEN m.state='hidden' THEN 'Hidden' WHEN e.enabled!=1 OR e.current_release_id IS NULL THEN 'Unavailable'
 WHEN EXISTS(SELECT 1 FROM game_submissions pub WHERE pub.project_id=p.id AND pub.status='approved') THEN 'Published' ELSE 'Unlisted' END AS status,
 COALESCE(a.views,0) AS views,(SELECT COUNT(*) FROM game_comments WHERE project_id=p.id) AS comments,d.created_at AS updatedAt
 FROM projects p JOIN deployments d ON d.id=(SELECT latest.id FROM deployments latest WHERE latest.project_id=p.id AND latest.status='succeeded' AND latest.environment='production' ORDER BY latest.created_at DESC,latest.rowid DESC LIMIT 1)
 JOIN deployment_hostnames dh ON dh.deployment_id=d.id
 JOIN environments e ON e.project_id=p.id AND e.name='production'
 LEFT JOIN hosting_slots h ON h.project_id=p.id AND h.environment='production'
 LEFT JOIN game_submissions s ON s.id=(SELECT listing.id FROM game_submissions listing WHERE listing.project_id=p.id ORDER BY listing.submitted_at DESC,listing.rowid DESC LIMIT 1)
 LEFT JOIN deployment_hostnames sh ON sh.deployment_id=s.deployment_id
 LEFT JOIN game_moderation m ON m.project_id=p.id LEFT JOIN game_activity_totals a ON a.project_id=p.id
)`
const auditColumns =
  "id,actor_id AS actorId,actor_name AS actorName,project_id AS projectId,game_title AS gameTitle,comment_id AS commentId,action,reason,note,before_state AS beforeState,after_state AS afterState,created_at AS createdAt"
const history = `WITH history AS (
  SELECT * FROM moderation_audit
  UNION ALL SELECT a.id,'' AS request_hash,a.actor_id,
    COALESCE(json_extract(a.detail,'$.actorName'),NULLIF(m.name,''),'Administrator') AS actor_name,
    a.project_id,COALESCE(json_extract(a.detail,'$.title'),p.name) AS game_title,NULL AS comment_id,
    a.action,'Submission review' AS reason,COALESCE(json_extract(a.detail,'$.note'),'') AS note,
    COALESCE(json_extract(a.detail,'$.beforeState'),'') AS before_state,substr(a.action,6) AS after_state,a.created_at
    FROM audit_events a JOIN projects p ON p.id=a.project_id LEFT JOIN community_members m ON m.user_id=a.actor_id
    WHERE a.action IN ('game.approved','game.rejected','game.unpublished','game.superseded')
)`
const identifier = /^[A-Za-z0-9_-]{1,128}$/
function response(data: unknown) {
  return Response.json(data, { headers: { "cache-control": "private, no-store" } })
}
function page<T extends { id: string }>(items: T[], time: keyof T) {
  const selected = items.slice(0, 40)
  const last = selected.at(-1)
  return response({
    items: selected,
    nextCursor: items.length > 40 && last ? btoa(JSON.stringify([last[time], last.id])) : null
  })
}
function filters(url: URL) {
  const query = (url.searchParams.get("q") ?? "").trim()
  const project = url.searchParams.get("project") ?? ""
  const status = url.searchParams.get("status") ?? "all"
  requireValue(query.length <= 200 && (!project || identifier.test(project)), "Invalid search.")
  let before = ["9999", "~"]
  const cursor = url.searchParams.get("cursor")
  if (cursor) {
    try {
      requireValue(cursor.length <= 512, "Invalid cursor.")
      before = JSON.parse(atob(cursor))
    } catch {
      throw new HttpError(400, "invalid_cursor", "Invalid cursor.")
    }
    requireValue(
      Array.isArray(before) &&
        before.length === 2 &&
        before.every((v) => typeof v === "string") &&
        before[0]!.length <= 40 &&
        identifier.test(before[1]!),
      "Invalid cursor."
    )
  }
  return { query: `%${query.replace(/[!%_]/g, "!$&")}%`, project, status, before }
}
export async function moderationRoute(request: Request, env: Env, actorId: string, resource: string, id?: string) {
  await requireCommunity(env, actorId, request.method !== "GET")
  if (request.method === "POST" && resource === "decisions" && !id) return decide(request, env, actorId)
  if (request.method !== "GET") throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  if (resource === "summary" && !id) {
    const totals = await env.DATABASE.prepare(
      `${games} SELECT COUNT(*) AS games,COALESCE(SUM(status='Published'),0) AS published,COALESCE(SUM(status='Hidden'),0) AS hidden,COALESCE(SUM(status='Restricted'),0) AS restricted,(SELECT COUNT(*) FROM game_comments) AS comments,(SELECT COUNT(*) FROM game_comments WHERE hidden=1) AS hiddenComments FROM games`
    ).first()
    return response(totals)
  }
  if (resource === "games" && id) {
    const game = await env.DATABASE.prepare(`${games} SELECT * FROM games WHERE id=?`).bind(id).first<ManagedGame>()
    if (!game) throw new HttpError(404, "not_found", "Game not found.")
    return response(game)
  }
  if (id) throw new HttpError(404, "not_found", "Not found.")
  const { query, project, status, before } = filters(new URL(request.url))
  if (resource === "games") {
    requireValue(
      ["all", "Published", "Unlisted", "Hidden", "Restricted", "Unavailable"].includes(status),
      "Invalid status."
    )
    const rows = await env.DATABASE.prepare(
      `${games} SELECT * FROM games WHERE (title LIKE ? ESCAPE '!' OR creatorId LIKE ? ESCAPE '!' OR id LIKE ? ESCAPE '!') AND (?='all' OR status=?) AND (updatedAt<? OR (updatedAt=? AND id<?)) ORDER BY updatedAt DESC,id DESC LIMIT 41`
    )
      .bind(query, query, query, status, status, before[0]!, before[0]!, before[1]!)
      .all<ManagedGame>()
    return page(rows.results, "updatedAt")
  }
  if (resource === "comments") {
    requireValue(["all", "visible", "hidden"].includes(status), "Invalid status.")
    const rows = await env.DATABASE.prepare(
      `SELECT c.id,c.project_id AS projectId,COALESCE(s.title,p.name) AS gameTitle,c.author,c.body,c.hidden,c.moderation_revision AS revision,c.created_at AS createdAt,c.updated_at AS updatedAt FROM game_comments c JOIN projects p ON p.id=c.project_id LEFT JOIN game_submissions s ON s.id=(SELECT id FROM game_submissions WHERE project_id=c.project_id ORDER BY submitted_at DESC,rowid DESC LIMIT 1) WHERE (?='' OR c.project_id=?) AND (c.body LIKE ? ESCAPE '!' OR c.author LIKE ? ESCAPE '!' OR COALESCE(s.title,p.name) LIKE ? ESCAPE '!') AND (?='all' OR c.hidden=?) AND (c.created_at<? OR (c.created_at=? AND c.id<?)) ORDER BY c.created_at DESC,c.id DESC LIMIT 41`
    )
      .bind(
        project,
        project,
        query,
        query,
        query,
        status,
        status === "hidden" ? 1 : 0,
        before[0]!,
        before[0]!,
        before[1]!
      )
      .all<ManagedComment>()
    return page(rows.results, "createdAt")
  }
  if (resource === "history") {
    const rows = await env.DATABASE.prepare(
      `${history} SELECT ${auditColumns} FROM history WHERE (?='' OR project_id=?) AND (game_title LIKE ? ESCAPE '!' OR actor_name LIKE ? ESCAPE '!' OR reason LIKE ? ESCAPE '!' OR note LIKE ? ESCAPE '!') AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 41`
    )
      .bind(project, project, query, query, query, query, before[0]!, before[0]!, before[1]!)
      .all<ModerationEvent>()
    return page(rows.results, "createdAt")
  }
  throw new HttpError(404, "not_found", "Not found.")
}
async function decide(request: Request, env: Env, actorId: string) {
  const role = await requireCommunity(env, actorId, true)
  const body = await jsonBody(request)
  requireValue(
    typeof body.requestId === "string" && /^[a-f0-9-]{36}$/.test(body.requestId),
    "A request ID is required."
  )
  requireValue(typeof body.projectId === "string" && identifier.test(body.projectId), "Invalid game.")
  requireValue(typeof body.action === "string" && Object.hasOwn(moderationActions, body.action), "Invalid action.")
  requireValue(Number.isSafeInteger(body.revision) && Number(body.revision) >= 0, "Invalid revision.")
  requireValue(
    typeof body.reason === "string" && moderationReasons.some((reason) => reason === body.reason),
    "Choose a reason."
  )
  requireValue(
    typeof body.note === "string" && body.note.trim().length > 0 && body.note.length <= 500,
    "Decision notes must be 1–500 characters."
  )
  const isComment = body.action.endsWith("comment")
  requireValue(
    isComment ? typeof body.commentId === "string" && identifier.test(body.commentId) : body.commentId === undefined,
    "Invalid comment target."
  )
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        actorId,
        body.projectId,
        body.commentId ?? null,
        body.action,
        body.revision,
        body.reason,
        body.note.trim()
      ])
    )
    .digest("hex")
  const saved = () =>
    env.DATABASE.prepare("SELECT request_hash FROM moderation_audit WHERE id=?")
      .bind(body.requestId as string)
      .first<{ request_hash: string }>()
  const existing = await saved()
  if (existing) {
    if (existing.request_hash !== hash)
      throw new HttpError(409, "request_conflict", "This request ID already belongs to another decision.")
    return response({ id: body.requestId })
  }
  const game = await env.DATABASE.prepare(`${games} SELECT * FROM games WHERE id=?`)
    .bind(body.projectId)
    .first<ManagedGame>()
  if (!game) throw new HttpError(404, "not_found", "Game not found.")
  const adminOnly = body.action === "restrict-game" || (!isComment && game.state === "restricted")
  if (adminOnly && role !== "Admin")
    throw new HttpError(403, "forbidden", "Only administrators can change game access restrictions.")
  const allowedRoles = adminOnly ? "'Admin'" : "'Admin','Moderator'"
  let beforeState: string, afterState: string
  const statements: D1PreparedStatement[] = []
  if (isComment) {
    const comment = await env.DATABASE.prepare(
      "SELECT hidden,moderation_revision AS revision,body FROM game_comments WHERE id=? AND project_id=?"
    )
      .bind(body.commentId as string, body.projectId)
      .first<{ hidden: number; revision: number; body: string }>()
    if (!comment) throw new HttpError(404, "not_found", "Comment not found.")
    const hidden = body.action === "hide-comment" ? 1 : 0
    if (comment.revision !== body.revision || comment.hidden === hidden)
      throw new HttpError(409, "moderation_conflict", "This comment changed. Refresh and review it again.")
    beforeState = JSON.stringify({ hidden: comment.hidden, body: comment.body })
    afterState = JSON.stringify({ hidden })
    statements.push(
      env.DATABASE.prepare(
        `UPDATE game_comments SET hidden=?,moderation_revision=moderation_revision+1,last_action_id=? WHERE id=? AND project_id=? AND moderation_revision=? AND EXISTS(SELECT 1 FROM community_access WHERE user_id=? AND role IN (${allowedRoles})) AND NOT EXISTS(SELECT 1 FROM moderation_audit WHERE id=?)`
      ).bind(
        hidden,
        body.requestId,
        body.commentId as string,
        body.projectId,
        body.revision as number,
        actorId,
        body.requestId
      )
    )
  } else {
    const next: ModerationState =
      body.action === "restrict-game" ? "restricted" : body.action === "hide-game" ? "hidden" : "normal"
    if (game.revision !== body.revision || game.state === next || (game.state === "restricted" && next === "hidden"))
      throw new HttpError(409, "moderation_conflict", "This game changed. Refresh and review it again.")
    beforeState = game.state
    afterState = next
    statements.push(
      env.DATABASE.prepare("INSERT INTO game_moderation(project_id) VALUES(?) ON CONFLICT DO NOTHING").bind(
        body.projectId
      )
    )
    statements.push(
      env.DATABASE.prepare(
        `UPDATE game_moderation SET state=?,revision=revision+1,last_action_id=? WHERE project_id=? AND revision=? AND EXISTS(SELECT 1 FROM community_access WHERE user_id=? AND role IN (${allowedRoles})) AND NOT EXISTS(SELECT 1 FROM moderation_audit WHERE id=?)`
      ).bind(next, body.requestId, body.projectId, body.revision as number, actorId, body.requestId)
    )
  }
  const profile = await createClerkClient({ secretKey: env.CLERK_SECRET_KEY }).users.getUser(actorId)
  const actorName = (
    profile.username ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    "Administrator"
  ).slice(0, 128)
  const target = isComment
    ? "SELECT 1 FROM game_comments WHERE id=? AND last_action_id=?"
    : "SELECT 1 FROM game_moderation WHERE project_id=? AND last_action_id=?"
  statements.push(
    env.DATABASE.prepare(
      `INSERT INTO moderation_audit(id,request_hash,actor_id,actor_name,project_id,game_title,comment_id,action,reason,note,before_state,after_state,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(${target}) AND NOT EXISTS(SELECT 1 FROM moderation_audit WHERE id=?)`
    ).bind(
      body.requestId,
      hash,
      actorId,
      actorName,
      body.projectId,
      game.title,
      (body.commentId as string | undefined) ?? null,
      body.action,
      body.reason,
      body.note.trim(),
      beforeState,
      afterState,
      new Date().toISOString(),
      isComment ? (body.commentId as string) : body.projectId,
      body.requestId,
      body.requestId
    )
  )
  await env.DATABASE.batch(statements)
  const result = await saved()
  if (!result || result.request_hash !== hash)
    throw new HttpError(
      409,
      "moderation_conflict",
      "Another administrator changed this item. Refresh and review it again."
    )
  return response({ id: body.requestId })
}
