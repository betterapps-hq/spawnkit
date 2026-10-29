import {
  reportActions,
  reportReasons,
  type ReportCase,
  type ReportEvidence,
  type ReportKind
} from "@spawn/platform/community"
import { moderationReasons } from "@spawn/platform/moderation"
import {
  commandId,
  communityIdentity,
  conflict,
  hashValue,
  privateResponse,
  requireCommunity,
  revision
} from "./community-access"
import { HttpError, jsonBody, requireValue } from "./http"

const caseColumns =
  "c.id,c.project_id AS projectId,c.comment_id AS commentId,c.title,c.kind,c.state,c.assignee_id AS assigneeId,a.name AS assigneeName,c.revision,c.created_at AS createdAt,c.updated_at AS updatedAt,(SELECT COUNT(*) FROM player_reports WHERE case_id=c.id) AS reports,(SELECT reason FROM player_reports WHERE case_id=c.id ORDER BY created_at,id LIMIT 1) AS reason"
const caseJoin = "FROM report_cases c LEFT JOIN community_access a ON a.user_id=c.assignee_id"
type CurrentEvidence = ReportEvidence & { state: string; url: string | null; hidden?: number }
async function evidence(env: Env, projectId: string, commentId: string | null): Promise<CurrentEvidence | null> {
  if (commentId)
    return env.DATABASE.prepare(
      `SELECT COALESCE(s.title,p.name) AS title,c.author,c.body,c.moderation_revision AS revision,c.updated_at AS updatedAt,c.hidden,'comment' AS state,NULL AS url FROM game_comments c JOIN projects p ON p.id=c.project_id LEFT JOIN game_submissions s ON s.id=(SELECT id FROM game_submissions WHERE project_id=p.id ORDER BY submitted_at DESC,rowid DESC LIMIT 1) WHERE c.project_id=? AND c.id=?`
    )
      .bind(projectId, commentId)
      .first<CurrentEvidence>()
  return env.DATABASE.prepare(
    `SELECT COALESCE(s.title,p.name) AS title,COALESCE(s.description,'') AS description,COALESCE(m.revision,0) AS revision,COALESCE(m.state,'normal') AS state,e.current_release_id AS releaseId,p.updated_at AS updatedAt,'https://'||h.hostname AS url FROM projects p JOIN environments e ON e.project_id=p.id AND e.name='production' LEFT JOIN game_submissions s ON s.id=(SELECT id FROM game_submissions WHERE project_id=p.id ORDER BY submitted_at DESC,rowid DESC LIMIT 1) LEFT JOIN game_moderation m ON m.project_id=p.id LEFT JOIN deployment_hostnames h ON h.deployment_id=(SELECT id FROM deployments WHERE project_id=p.id AND release_id=e.current_release_id AND environment='production' AND status='succeeded' ORDER BY created_at DESC,rowid DESC LIMIT 1) WHERE p.id=?`
  )
    .bind(projectId)
    .first<CurrentEvidence>()
}
export async function submitReport(request: Request, env: Env, userId: string, projectId: string) {
  if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  const body = await jsonBody(request)
  requireValue(body.kind === "Game" || body.kind === "Comment", "Choose game or comment.")
  const kind = body.kind as ReportKind
  requireValue(
    typeof body.reason === "string" && reportReasons[kind].some((r) => r === body.reason),
    "Choose a report reason."
  )
  requireValue(
    typeof body.details === "string" &&
      body.details.length <= 500 &&
      (body.reason !== "Something else" || body.details.trim().length > 0),
    "Add details of up to 500 characters."
  )
  requireValue(
    kind === "Comment"
      ? typeof body.commentId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(body.commentId)
      : body.commentId === undefined,
    "Invalid report target."
  )
  const available = await env.DATABASE.prepare(
    "SELECT s.id FROM game_submissions s JOIN releases r ON r.id=s.release_id JOIN deployments d ON d.id=s.deployment_id JOIN environments e ON e.project_id=s.project_id AND e.name='production' WHERE s.project_id=? AND s.status='approved' AND r.status='ready' AND d.status='succeeded' AND e.enabled=1 AND NOT EXISTS(SELECT 1 FROM game_moderation WHERE project_id=s.project_id AND state='restricted')"
  )
    .bind(projectId)
    .first()
  if (!available) throw new HttpError(404, "not_found", "Game not found.")
  const commentId = kind === "Comment" ? String(body.commentId) : null
  const current = await evidence(env, projectId, commentId)
  if (!current || current.hidden) throw new HttpError(404, "not_found", "Content not found.")
  const snapshot: ReportEvidence = {
    title: current.title,
    revision: current.revision,
    ...(commentId
      ? { body: current.body!, author: current.author!, updatedAt: current.updatedAt! }
      : { description: current.description!, releaseId: current.releaseId! })
  }
  const targetKey = `${kind}:${projectId}:${commentId ?? ""}`,
    version = hashValue(snapshot)
  const duplicate = () =>
    env.DATABASE.prepare("SELECT id FROM player_reports WHERE reporter_id=? AND target_key=? AND target_version=?")
      .bind(userId, targetKey, version)
      .first<{ id: string }>()
  if (await duplicate()) return privateResponse({ received: true, duplicate: true })
  const now = new Date().toISOString(),
    hour = new Date(Date.now() - 3600_000).toISOString(),
    day = new Date(Date.now() - 86400_000).toISOString()
  const quota =
    "(SELECT COUNT(*) FROM player_reports WHERE reporter_id=? AND created_at>?)<5 AND (SELECT COUNT(*) FROM player_reports WHERE reporter_id=? AND created_at>?)<20"
  const id = crypto.randomUUID()
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      `INSERT OR IGNORE INTO report_cases(id,project_id,comment_id,target_key,title,kind,created_at,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE ${quota} AND NOT EXISTS(SELECT 1 FROM report_cases WHERE target_key=? AND state!='resolved')`
    ).bind(
      crypto.randomUUID(),
      projectId,
      commentId,
      targetKey,
      current.title,
      kind,
      now,
      now,
      userId,
      hour,
      userId,
      day,
      targetKey
    ),
    env.DATABASE.prepare(
      `INSERT OR IGNORE INTO player_reports(id,case_id,reporter_id,target_key,target_version,reason,details,snapshot,created_at) SELECT ?,id,?,?,?,?,?,?,? FROM report_cases WHERE target_key=? AND state!='resolved' AND ${quota}`
    ).bind(
      id,
      userId,
      targetKey,
      version,
      body.reason,
      body.details.trim(),
      JSON.stringify(snapshot),
      now,
      targetKey,
      userId,
      hour,
      userId,
      day
    ),
    env.DATABASE.prepare(
      "UPDATE report_cases SET revision=revision+1,updated_at=? WHERE id=(SELECT case_id FROM player_reports WHERE id=?)"
    ).bind(now, id)
  ])
  if (!(await duplicate()))
    throw new HttpError(429, "report_limit", "You’ve reached the report limit. Try again later.")
  return privateResponse({ received: true, duplicate: false }, 201)
}

async function reportFeed(env: Env, id: string, feed: string, cursor = "") {
  requireValue(feed === "evidence" || feed === "history", "Invalid report feed.")
  requireValue(!cursor || /^[^|]{1,40}\|[A-Za-z0-9:_-]{1,180}$/.test(cursor), "Invalid cursor.")
  const [time, key] = cursor.split("|")
  const history = feed === "history"
  const direction = history ? "<" : ">"
  const order = history ? "DESC" : "ASC"
  const rows = await env.DATABASE.prepare(
    `SELECT ${history ? "id,actor_name AS actorName,action,reason,note" : "id,reason,details,snapshot"},created_at AS createdAt FROM ${history ? "report_audit" : "player_reports"} WHERE case_id=? AND (?='' OR created_at${direction}? OR (created_at=? AND id${direction}?)) ORDER BY created_at ${order},id ${order} LIMIT 41`
  )
    .bind(id, cursor, time ?? "", time ?? "", key ?? "")
    .all<{ id: string; createdAt: string; snapshot?: string }>()
  const items = rows.results
    .slice(0, 40)
    .map((r) => ({ ...r, ...(r.snapshot ? { snapshot: JSON.parse(r.snapshot) } : {}) }))
  const last = items.at(-1)
  return { items, nextCursor: rows.results.length > 40 && last ? `${last.createdAt}|${last.id}` : null }
}
async function detail(env: Env, id: string) {
  const item = await env.DATABASE.prepare(`SELECT ${caseColumns} ${caseJoin} WHERE c.id=?`).bind(id).first<ReportCase>()
  if (!item) throw new HttpError(404, "not_found", "Report not found.")
  const [reports, events, current] = await Promise.all([
    reportFeed(env, id, "evidence"),
    reportFeed(env, id, "history"),
    evidence(env, item.projectId, item.commentId)
  ])
  const url = item.commentId ? ((await evidence(env, item.projectId, null))?.url ?? null) : (current?.url ?? null)
  return privateResponse({
    ...item,
    evidence: reports.items,
    evidenceCursor: reports.nextCursor,
    events: events.items,
    historyCursor: events.nextCursor,
    current,
    contentVersion: hashValue(current),
    url
  })
}
export async function reportsRoute(request: Request, env: Env, actorId: string, id?: string) {
  const role = await requireCommunity(env, actorId, request.method !== "GET")
  if (request.method === "GET") {
    if (id) {
      const params = new URL(request.url).searchParams
      return params.has("feed")
        ? privateResponse(await reportFeed(env, id, params.get("feed")!, params.get("cursor") ?? ""))
        : detail(env, id)
    }
    const params = new URL(request.url).searchParams,
      state = params.get("state") ?? "open",
      kind = params.get("kind") ?? "all",
      query = (params.get("q") ?? "").trim(),
      cursor = params.get("cursor") ?? "9999|~"
    requireValue(
      ["open", "resolved", "all"].includes(state) &&
        ["all", "Game", "Comment"].includes(kind) &&
        query.length <= 200 &&
        cursor.length <= 200,
      "Invalid filters."
    )
    const [time, key] = cursor.split("|"),
      search = `%${query.replace(/[!%_]/g, "!$&")}%`
    const mine = params.get("mine") === "true" ? actorId : ""
    const rows = await env.DATABASE.prepare(
      `SELECT ${caseColumns} ${caseJoin} WHERE (?='all' OR (?='open' AND c.state!='resolved') OR c.state=?) AND (?='all' OR c.kind=?) AND (?='' OR c.assignee_id=?) AND (c.title LIKE ? ESCAPE '!' OR c.id LIKE ? ESCAPE '!' OR EXISTS(SELECT 1 FROM player_reports WHERE case_id=c.id AND reason LIKE ? ESCAPE '!')) AND (c.created_at<? OR (c.created_at=? AND c.id<?)) ORDER BY c.created_at DESC,c.id DESC LIMIT 41`
    )
      .bind(state, state, state, kind, kind, mine, mine, search, search, search, time ?? "", time ?? "", key ?? "")
      .all<ReportCase>()
    const items = rows.results.slice(0, 40),
      last = items.at(-1)
    return privateResponse({
      items,
      nextCursor: rows.results.length > 40 && last ? `${last.createdAt}|${last.id}` : null,
      role,
      userId: actorId
    })
  }
  if (request.method !== "POST" || !id) throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  const body = await jsonBody(request)
  commandId(body.requestId)
  revision(body.revision)
  requireValue(typeof body.action === "string" && reportActions.some((a) => a === body.action), "Invalid action.")
  requireValue(
    typeof body.reason === "string" &&
      body.reason.length <= 200 &&
      typeof body.note === "string" &&
      body.note.length <= 500,
    "Invalid notes."
  )
  const action = body.action,
    reason = body.reason.trim(),
    note = body.note.trim(),
    requestId = body.requestId
  const hash = hashValue([actorId, id, body])
  const saved = () =>
    env.DATABASE.prepare("SELECT request_hash FROM report_audit WHERE id=?")
      .bind(requestId)
      .first<{ request_hash: string }>()
  const previous = await saved()
  if (previous) {
    if (previous.request_hash !== hash) throw conflict()
    return privateResponse({ id: requestId })
  }
  const item = await env.DATABASE.prepare(`SELECT ${caseColumns} ${caseJoin} WHERE c.id=?`).bind(id).first<ReportCase>()
  if (!item || item.revision !== body.revision) throw conflict()
  const decision = ["resolve", "hide-game", "hide-comment", "restrict-game", "escalate", "reopen"].includes(action)
  if (decision)
    requireValue(
      moderationReasons.some((r) => r === reason) && note.length > 0,
      "Choose a reason and add decision notes."
    )
  if (["takeover", "handoff", "note"].includes(action)) requireValue(note.length > 0, "Add a note.")
  if ((action === "takeover" || action === "restrict-game") && role !== "Admin")
    throw new HttpError(403, "forbidden", "Only administrators can take over reviews or restrict games.")
  if (item.state === "escalated" && role !== "Admin" && decision)
    throw new HttpError(403, "forbidden", "This case requires an administrator.")
  if (action === "reopen") requireValue(item.state === "resolved", "This case is already open.")
  else if (action !== "note") requireValue(item.state !== "resolved", "This case is resolved.")
  if (action === "claim") requireValue(!item.assigneeId, "Another reviewer has this case.")
  if (decision && action !== "reopen")
    requireValue(item.assigneeId === actorId, "Start this review before making a decision.")
  if (action === "hide-comment") requireValue(item.kind === "Comment", "This is not a comment report.")
  if (action === "hide-game" || action === "restrict-game")
    requireValue(item.kind === "Game", "This is not a game report.")
  const current = await evidence(env, item.projectId, item.commentId)
  if (decision && action !== "reopen") {
    if (hashValue(current) !== body.contentVersion)
      throw new HttpError(409, "evidence_changed", "The content changed. Review the current version before deciding.")
  }
  const changesContent = action === "hide-game" || action === "restrict-game" || action === "hide-comment"
  if (changesContent && !current)
    throw new HttpError(409, "content_removed", "The content was removed. Resolve the report without changing it.")
  if (action === "hide-game" && current?.state === "restricted")
    throw new HttpError(409, "restricted", "This game is already restricted.")
  const identity = await communityIdentity(env, actorId),
    now = new Date().toISOString()
  const restrictedAction =
    action === "takeover" || action === "restrict-game" || (item.state === "escalated" && decision)
  const roles = restrictedAction ? "'Admin'" : "'Admin','Moderator'"
  // The first conditional write authorizes the complete transaction. Every subsequent write
  // is guarded by its unique event ID, so concurrent case/content edits cannot partially apply.
  let contentGuard = "1=1"
  const contentValues: (string | number)[] = []
  if (decision && action !== "reopen" && current) {
    contentGuard = item.commentId
      ? "EXISTS(SELECT 1 FROM game_comments WHERE id=? AND moderation_revision=?)"
      : "COALESCE((SELECT revision FROM game_moderation WHERE project_id=?),0)=?"
    contentValues.push(item.commentId ?? item.projectId, current.revision)
    if (!item.commentId) {
      contentGuard +=
        " AND EXISTS(SELECT 1 FROM environments WHERE project_id=? AND name='production' AND current_release_id=?) AND EXISTS(SELECT 1 FROM game_submissions WHERE id=(SELECT id FROM game_submissions WHERE project_id=? ORDER BY submitted_at DESC,rowid DESC LIMIT 1) AND title=? AND description=?)"
      contentValues.push(
        item.projectId,
        current.releaseId ?? "",
        item.projectId,
        current.title,
        current.description ?? ""
      )
    }
  } else if (decision && action !== "reopen" && item.commentId) {
    contentGuard = "NOT EXISTS(SELECT 1 FROM game_comments WHERE id=?)"
    contentValues.push(item.commentId)
  }
  const statements: D1PreparedStatement[] = [
    env.DATABASE.prepare(
      `INSERT INTO report_audit(id,request_hash,case_id,actor_id,actor_name,action,reason,note,created_at) SELECT ?,?,?,?,?,?,?,?,? FROM report_cases WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM community_access WHERE user_id=? AND role IN (${roles})) AND ${contentGuard} AND NOT EXISTS(SELECT 1 FROM report_audit WHERE id=?)`
    ).bind(
      requestId,
      hash,
      id,
      actorId,
      identity.name,
      action,
      reason,
      note,
      now,
      id,
      body.revision,
      actorId,
      ...contentValues,
      requestId
    )
  ]
  if (changesContent && current) {
    const before = item.commentId ? JSON.stringify({ hidden: current.hidden, body: current.body }) : current.state
    const after = item.commentId ? JSON.stringify({ hidden: 1 }) : action === "restrict-game" ? "restricted" : "hidden"
    if (item.commentId)
      statements.push(
        env.DATABASE.prepare(
          "UPDATE game_comments SET hidden=1,moderation_revision=moderation_revision+1,last_action_id=? WHERE id=? AND EXISTS(SELECT 1 FROM report_audit WHERE id=? AND request_hash=?) AND NOT EXISTS(SELECT 1 FROM moderation_audit WHERE id=?)"
        ).bind(requestId, item.commentId, requestId, hash, requestId)
      )
    else
      statements.push(
        env.DATABASE.prepare(
          "INSERT INTO game_moderation(project_id,state,revision,last_action_id) SELECT ?,?,1,? WHERE EXISTS(SELECT 1 FROM report_audit WHERE id=? AND request_hash=?) AND NOT EXISTS(SELECT 1 FROM moderation_audit WHERE id=?) ON CONFLICT(project_id) DO UPDATE SET state=excluded.state,revision=game_moderation.revision+1,last_action_id=excluded.last_action_id"
        ).bind(item.projectId, after, requestId, requestId, hash, requestId)
      )
    statements.push(
      env.DATABASE.prepare(
        "INSERT INTO moderation_audit(id,request_hash,actor_id,actor_name,project_id,game_title,comment_id,action,reason,note,before_state,after_state,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM report_audit WHERE id=? AND request_hash=?) AND NOT EXISTS(SELECT 1 FROM moderation_audit WHERE id=?)"
      ).bind(
        requestId,
        hash,
        actorId,
        identity.name,
        item.projectId,
        item.title,
        item.commentId,
        action,
        reason,
        note,
        before,
        after,
        now,
        requestId,
        hash,
        requestId
      )
    )
  }
  const nextState =
    action === "escalate" ? "escalated" : action === "reopen" ? "open" : decision ? "resolved" : item.state
  const assignee = ["claim", "takeover"].includes(action)
    ? actorId
    : ["reopen", "escalate"].includes(action)
      ? null
      : item.assigneeId
  statements.push(
    env.DATABASE.prepare(
      "UPDATE report_cases SET state=?,assignee_id=?,revision=revision+1,updated_at=?,last_action_id=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM report_audit WHERE id=? AND request_hash=?)"
    ).bind(nextState, assignee, now, requestId, id, body.revision, requestId, hash)
  )
  try {
    await env.DATABASE.batch(statements)
  } catch (error) {
    if (String(error).includes("UNIQUE constraint"))
      throw new HttpError(409, "newer_case", "A newer report is open for this content. Review that case.")
    throw error
  }
  const applied = await saved()
  if (!applied || applied.request_hash !== hash) throw conflict()
  return privateResponse({ id: requestId })
}
