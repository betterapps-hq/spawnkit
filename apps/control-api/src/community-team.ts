import { createHmac } from "node:crypto"
import { communityRoles, type CommunityRole, type TeamInvitation, type TeamMember } from "@spawn/platform/community"
import {
  commandId,
  communityIdentity,
  conflict,
  hashValue,
  privateResponse,
  requireAdmin,
  requireCommunity,
  revision
} from "./community-access"
import { HttpError, jsonBody, requireValue } from "./http"

const invitationColumns =
  "id,email,role,state,revision,created_at AS createdAt,expires_at AS expiresAt,email_state AS emailState"
const authorized = "EXISTS(SELECT 1 FROM community_access WHERE user_id=? AND role='Admin')"
type InvitationRow = TeamInvitation & {
  token_hash: string
  last_action_id: string
  invited_by: string
  accepted_by: string | null
}
function token(env: Env, id: string, actionId: string) {
  return createHmac("sha256", env.CLERK_SECRET_KEY)
    .update(`spawnkit-community-invite-v1:${id}:${actionId}`)
    .digest("hex")
}
function url(env: Env, id: string, actionId: string) {
  const origin = env.DASHBOARD_ORIGINS.split(",")[0]!
  return `${origin}/team/invitation#${token(env, id, actionId)}`
}
function validRole(role: unknown): asserts role is CommunityRole {
  requireValue(
    communityRoles.some((r) => r === role),
    "Choose a team role."
  )
}
async function saved(env: Env, id: string, hash: string) {
  const row = await env.DATABASE.prepare("SELECT request_hash FROM community_audit WHERE id=?")
    .bind(id)
    .first<{ request_hash: string }>()
  if (row && row.request_hash !== hash)
    throw new HttpError(409, "request_conflict", "This request ID was already used.")
  return Boolean(row)
}
export async function teamRoute(request: Request, env: Env, actorId: string, resource = "members", id?: string) {
  const role = await requireCommunity(env, actorId)
  if (request.method === "GET") {
    if (resource === "history") {
      const before = new URL(request.url).searchParams.get("cursor") ?? "9999|~"
      requireValue(before.length <= 200, "Invalid cursor.")
      const [time, key] = before.split("|")
      const rows = await env.DATABASE.prepare(
        "SELECT id,actor_name AS actorName,target_name AS targetName,action,reason,before_state AS beforeState,after_state AS afterState,created_at AS createdAt FROM community_audit WHERE created_at<? OR (created_at=? AND id<?) ORDER BY created_at DESC,id DESC LIMIT 41"
      )
        .bind(time ?? "", time ?? "", key ?? "")
        .all<{ id: string; createdAt: string }>()
      const items = rows.results.slice(0, 40),
        last = items.at(-1)
      return privateResponse({
        items,
        nextCursor: rows.results.length > 40 && last ? `${last.createdAt}|${last.id}` : null
      })
    }
    if (resource !== "members" || id) throw new HttpError(404, "not_found", "Not found.")
    const members = await env.DATABASE.prepare(
      "SELECT user_id AS userId,name,email,role,revision,created_at AS createdAt,(SELECT COUNT(*) FROM report_cases WHERE assignee_id=community_access.user_id AND state!='resolved') AS cases FROM community_access ORDER BY role,name,user_id LIMIT 100"
    ).all<TeamMember>()
    // Populate names of the administrators provisioned before memberships existed.
    await Promise.all(
      members.results
        .filter((m) => !m.name)
        .slice(0, 10)
        .map(async (member) => {
          const profile = await communityIdentity(env, member.userId).catch(() => null)
          if (!profile) return
          member.name = profile.name
          member.email = profile.emails[0] ?? ""
          await env.DATABASE.prepare(
            "INSERT INTO community_members(user_id,name,email,role,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM community_access WHERE user_id=?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,email=excluded.email"
          )
            .bind(member.userId, member.name, member.email, member.role, member.createdAt, member.userId)
            .run()
        })
    )
    const invitations = await env.DATABASE.prepare(
      `SELECT ${invitationColumns} FROM community_invitations WHERE state='pending' ORDER BY created_at DESC LIMIT 100`
    ).all<TeamInvitation>()
    return privateResponse({ members: members.results, invitations: invitations.results, role, userId: actorId })
  }
  if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  await requireAdmin(env, actorId)
  const body = await jsonBody(request)
  commandId(body.requestId)
  const hash = hashValue([actorId, resource, id, body])
  if (await saved(env, body.requestId, hash)) return privateResponse({ id: body.requestId })
  const identity = await communityIdentity(env, actorId)
  const now = new Date().toISOString()
  let targetId = id ?? crypto.randomUUID(),
    targetName = "",
    before = "",
    after = "",
    action = ""
  const statements: D1PreparedStatement[] = []
  if (resource === "invitations") {
    if (body.action !== "cancel" && !env.RESEND_API_KEY)
      throw new HttpError(503, "email_unavailable", "Invitation email is not configured yet.")
    if (!id) {
      requireValue(body.action === "invite", "Invalid invitation action.")
      validRole(body.role)
      requireValue(
        typeof body.email === "string" && body.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email),
        "Enter a valid email address."
      )
      const email = body.email.trim().toLowerCase()
      const existing = await env.DATABASE.prepare("SELECT user_id FROM community_access WHERE email=?")
        .bind(email)
        .first()
      requireValue(!existing, "This person is already on the team.")
      const total = await env.DATABASE.prepare(
        "SELECT (SELECT COUNT(*) FROM community_access)+(SELECT COUNT(*) FROM community_invitations WHERE state='pending') AS total"
      ).first<{ total: number }>()
      requireValue((total?.total ?? 0) < 100, "The team has reached its 100-person limit.")
      targetName = email
      action = "invite"
      after = body.role
      statements.push(
        env.DATABASE.prepare(
          `INSERT INTO community_invitations(id,email,role,token_hash,invited_by,created_at,expires_at,last_action_id) SELECT ?,?,?,?,?,?,?,? WHERE ${authorized} AND NOT EXISTS(SELECT 1 FROM community_audit WHERE id=?) AND (SELECT COUNT(*) FROM community_access)+(SELECT COUNT(*) FROM community_invitations WHERE state='pending')<100`
        ).bind(
          targetId,
          email,
          body.role,
          hashValue(token(env, targetId, body.requestId)),
          actorId,
          now,
          new Date(Date.now() + 7 * 86400_000).toISOString(),
          body.requestId,
          actorId,
          body.requestId
        )
      )
    } else {
      requireValue(body.action === "resend" || body.action === "cancel", "Invalid invitation action.")
      revision(body.revision)
      const invite = await env.DATABASE.prepare(`SELECT ${invitationColumns} FROM community_invitations WHERE id=?`)
        .bind(id)
        .first<TeamInvitation>()
      if (!invite || invite.state !== "pending" || invite.revision !== body.revision) throw conflict()
      targetName = invite.email
      before = invite.role
      action = body.action
      after = body.action === "cancel" ? "cancelled" : invite.role
      statements.push(
        env.DATABASE.prepare(
          `UPDATE community_invitations SET state=?,token_hash=?,revision=revision+1,expires_at=?,last_action_id=?,invited_by=?,email_state='pending',email_attempts=0,email_next_at=NULL,email_error=NULL WHERE id=? AND revision=? AND state='pending' AND ${authorized} AND NOT EXISTS(SELECT 1 FROM community_audit WHERE id=?)`
        ).bind(
          body.action === "cancel" ? "cancelled" : "pending",
          hashValue(token(env, id, body.requestId)),
          new Date(Date.now() + 7 * 86400_000).toISOString(),
          body.requestId,
          actorId,
          id,
          body.revision,
          actorId,
          body.requestId
        )
      )
    }
  } else if (resource === "members" && id) {
    requireValue(body.action === "role" || body.action === "remove", "Invalid member action.")
    revision(body.revision)
    requireValue(id !== actorId, "Another administrator must change your access.")
    requireValue(
      typeof body.reason === "string" && body.reason.trim().length > 0 && body.reason.length <= 500,
      "Enter a reason of 1–500 characters."
    )
    const member = await env.DATABASE.prepare(
      "SELECT user_id AS userId,name,email,role,revision,created_at AS createdAt FROM community_access WHERE user_id=?"
    )
      .bind(id)
      .first<TeamMember>()
    if (!member || member.revision !== body.revision) throw conflict()
    if (body.action === "role") validRole(body.role)
    before = member.role
    after = body.action === "remove" ? "removed" : String(body.role)
    action = body.action
    targetName = member.name || member.email || member.userId
    statements.push(
      env.DATABASE.prepare(
        "INSERT INTO community_members(user_id,role,created_at) SELECT user_id,'Admin',created_at FROM platform_admins WHERE user_id=? ON CONFLICT DO NOTHING"
      ).bind(id)
    )
    statements.push(
      env.DATABASE.prepare(
        `UPDATE community_members SET role=?,active=?,revision=revision+1,last_action_id=? WHERE user_id=? AND revision=? AND active=1 AND ${authorized} AND NOT EXISTS(SELECT 1 FROM community_audit WHERE id=?)`
      ).bind(
        body.action === "role" ? String(body.role) : member.role,
        body.action === "remove" ? 0 : 1,
        body.requestId,
        id,
        body.revision,
        actorId,
        body.requestId
      )
    )
    if (body.action === "remove" || body.role === "Observer") {
      statements.push(
        env.DATABASE.prepare(
          "INSERT INTO report_audit(id,request_hash,case_id,actor_id,actor_name,action,reason,note,created_at) SELECT ?||':'||id,?,id,?,?,'handoff','Team access changed','Returned to the unassigned queue.',? FROM report_cases WHERE assignee_id=? AND state!='resolved' AND EXISTS(SELECT 1 FROM community_members WHERE user_id=? AND last_action_id=?) AND NOT EXISTS(SELECT 1 FROM community_audit WHERE id=?)"
        ).bind(body.requestId, hash, actorId, identity.name, now, id, id, body.requestId, body.requestId)
      )
      statements.push(
        env.DATABASE.prepare(
          "UPDATE report_cases SET assignee_id=NULL,revision=revision+1,updated_at=? WHERE assignee_id=? AND state!='resolved' AND EXISTS(SELECT 1 FROM community_members WHERE user_id=? AND last_action_id=?) AND NOT EXISTS(SELECT 1 FROM community_audit WHERE id=?)"
        ).bind(now, id, id, body.requestId, body.requestId)
      )
    }
  } else throw new HttpError(404, "not_found", "Not found.")
  const targetTable = resource === "members" ? "community_members" : "community_invitations"
  const targetColumn = resource === "members" ? "user_id" : "id"
  statements.push(
    env.DATABASE.prepare(
      `INSERT INTO community_audit(id,request_hash,actor_id,actor_name,target_id,target_name,action,reason,before_state,after_state,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ${targetTable} WHERE ${targetColumn}=? AND last_action_id=?) AND NOT EXISTS(SELECT 1 FROM community_audit WHERE id=?)`
    ).bind(
      body.requestId,
      hash,
      actorId,
      identity.name,
      targetId,
      targetName,
      action,
      typeof body.reason === "string" ? body.reason.trim() : "",
      before,
      after,
      now,
      targetId,
      body.requestId,
      body.requestId
    )
  )
  try {
    await env.DATABASE.batch(statements)
  } catch (error) {
    if (String(error).includes("last administrator"))
      throw new HttpError(409, "last_admin", "The last administrator cannot be removed or demoted.")
    if (String(error).includes("UNIQUE constraint"))
      throw new HttpError(409, "duplicate", "An invitation already exists for this email address.")
    throw error
  }
  if (!(await saved(env, body.requestId, hash))) throw conflict()
  return privateResponse({ id: body.requestId })
}

export async function acceptInvitation(request: Request, env: Env, userId: string) {
  if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Method not allowed.")
  const body = await jsonBody(request)
  requireValue(typeof body.token === "string" && /^[a-f0-9]{64}$/.test(body.token), "Invalid invitation.")
  const invite = await env.DATABASE.prepare(
    `SELECT ${invitationColumns},token_hash,last_action_id,invited_by,accepted_by FROM community_invitations WHERE token_hash=?`
  )
    .bind(hashValue(body.token))
    .first<InvitationRow>()
  if (!invite || invite.state === "cancelled" || invite.expiresAt < new Date().toISOString())
    throw new HttpError(410, "expired", "This invitation expired or was cancelled.")
  const identity = await communityIdentity(env, userId)
  if (!identity.emails.includes(invite.email))
    throw new HttpError(403, "email_mismatch", "Sign in with the verified email address this invitation was sent to.")
  if (invite.state === "accepted") {
    if (invite.accepted_by !== userId) throw conflict()
    return privateResponse({ accepted: true })
  }
  // Accepting a stale invitation must never override an existing member's role.
  if (await env.DATABASE.prepare("SELECT user_id FROM community_access WHERE user_id=?").bind(userId).first())
    throw new HttpError(409, "already_member", "You already have team access.")
  const actionId = crypto.randomUUID(),
    now = new Date().toISOString()
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      `UPDATE community_invitations SET state='accepted',accepted_by=?,revision=revision+1,last_action_id=? WHERE id=? AND state='pending' AND token_hash=? AND expires_at>? AND EXISTS(SELECT 1 FROM community_access WHERE user_id=invited_by AND role='Admin') AND NOT EXISTS(SELECT 1 FROM community_access WHERE user_id=?)`
    ).bind(userId, actionId, invite.id, hashValue(body.token), now, userId),
    env.DATABASE.prepare(
      "INSERT INTO community_members(user_id,name,email,role,created_at,last_action_id) SELECT ?,?,?,role,?,? FROM community_invitations WHERE id=? AND last_action_id=? ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,email=excluded.email,role=excluded.role,active=1,revision=community_members.revision+1,last_action_id=excluded.last_action_id"
    ).bind(userId, identity.name, invite.email, now, actionId, invite.id, actionId),
    env.DATABASE.prepare(
      "INSERT INTO community_audit(id,request_hash,actor_id,actor_name,target_id,target_name,action,reason,before_state,after_state,created_at) SELECT ?,?,?,?,?,?,'accept','','',role,? FROM community_invitations WHERE id=? AND last_action_id=?"
    ).bind(
      actionId,
      hashValue([userId, invite.id]),
      userId,
      identity.name,
      userId,
      identity.name,
      now,
      invite.id,
      actionId
    )
  ])
  if (!(await env.DATABASE.prepare("SELECT id FROM community_audit WHERE id=?").bind(actionId).first()))
    throw conflict()
  return privateResponse({ accepted: true })
}

/** Durable outbox. Scheduled retries reuse the same Resend idempotency key for 24 hours. */
export async function deliverInvitations(env: Env) {
  if (!env.RESEND_API_KEY || !env.INVITATION_FROM) return
  const now = new Date().toISOString()
  const pending = await env.DATABASE.prepare(
    `SELECT ${invitationColumns},token_hash,last_action_id,invited_by FROM community_invitations WHERE state='pending' AND email_state='pending' AND expires_at>? AND (email_next_at IS NULL OR email_next_at<=?) AND email_attempts<8 ORDER BY created_at LIMIT 5`
  )
    .bind(now, now)
    .all<InvitationRow>()
  for (const invite of pending.results) {
    if (
      hashValue(token(env, invite.id, invite.last_action_id)) !== invite.token_hash ||
      !(await env.DATABASE.prepare("SELECT user_id FROM community_access WHERE user_id=? AND role='Admin'")
        .bind(invite.invited_by)
        .first())
    ) {
      await env.DATABASE.prepare(
        "UPDATE community_invitations SET email_state='failed',email_error='Resend invitation required' WHERE id=? AND last_action_id=?"
      )
        .bind(invite.id, invite.last_action_id)
        .run()
      continue
    }
    const actionId = invite.last_action_id
    const lease = await env.DATABASE.prepare(
      "UPDATE community_invitations SET email_next_at=?,email_attempts=email_attempts+1 WHERE id=? AND last_action_id=? AND email_state='pending' AND (email_next_at IS NULL OR email_next_at<=?) AND state='pending' RETURNING email_attempts"
    )
      .bind(new Date(Date.now() + 5 * 60_000).toISOString(), invite.id, actionId, now)
      .first<{ email_attempts: number }>()
    if (!lease) continue
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
          "Idempotency-Key": `team-invite/${actionId}`
        },
        body: JSON.stringify({
          from: env.INVITATION_FROM,
          to: [invite.email],
          subject: "You’re invited to the SpawnKit team",
          text: `You’ve been invited to join SpawnKit as ${invite.role}.\n\nAccept your invitation:\n${url(env, invite.id, actionId)}\n\nSign in with ${invite.email}. This invitation expires in seven days.`
        }),
        signal: AbortSignal.timeout(15_000)
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`Email provider returned ${response.status}`)
      }
      await response.body?.cancel()
      await env.DATABASE.prepare(
        "UPDATE community_invitations SET email_state='sent',email_error=NULL WHERE id=? AND last_action_id=?"
      )
        .bind(invite.id, actionId)
        .run()
    } catch {
      await env.DATABASE.prepare(
        "UPDATE community_invitations SET email_state=?,email_error='Email delivery failed',email_next_at=? WHERE id=? AND last_action_id=?"
      )
        .bind(
          lease.email_attempts >= 8 ? "failed" : "pending",
          new Date(Date.now() + Math.min(60, 2 ** lease.email_attempts) * 60_000).toISOString(),
          invite.id,
          actionId
        )
        .run()
    }
  }
}
