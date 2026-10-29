import { HttpError, jsonBody, requireValue } from "./http"
import { removeProjectDomains } from "./project-domain-cleanup"

type Deletion = {
  phase: "builds" | "telemetry" | "domains" | "files" | "records" | "complete"
  state: "pending" | "retrying" | "complete"
  attempts: number
  completed_at: string | null
}

export async function deletionStatus(env: Env, projectId: string) {
  const row = await env.DATABASE.prepare("SELECT phase,state,completed_at FROM project_deletions WHERE project_id=?")
    .bind(projectId)
    .first<Deletion>()
  return { state: row?.state ?? "active", completedAt: row?.completed_at ?? null }
}

export async function deleteProject(
  request: Request,
  env: Env,
  ownerId: string,
  projectId: string,
  ctx?: ExecutionContext
) {
  const project = await env.DATABASE.prepare("SELECT name,lifecycle FROM projects WHERE id=? AND owner_id=?")
    .bind(projectId, ownerId)
    .first<{ name: string; lifecycle: string }>()
  if (!project) throw new HttpError(404, "not_found", "Project not found.")
  const body = await jsonBody(request)
  if (project.lifecycle === "deleted") return Response.json(await deletionStatus(env, projectId))
  requireValue(body.name === project.name, "Type the exact game name to delete this project.")
  const now = new Date().toISOString()
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      "INSERT INTO project_deletions(project_id,actor_id,requested_at) VALUES(?,?,?) ON CONFLICT DO NOTHING"
    ).bind(projectId, ownerId, now),
    env.DATABASE.prepare(
      "UPDATE projects SET lifecycle='deleting',updated_at=?,revision=revision+1 WHERE id=? AND lifecycle='active'"
    ).bind(now, projectId),
    env.DATABASE.prepare(
      "UPDATE environments SET enabled=0,current_release_id=NULL,generation=generation+1 WHERE project_id=?"
    ).bind(projectId),
    env.DATABASE.prepare(
      "UPDATE deployments SET status='failed',updated_at=? WHERE project_id=? AND status IN ('queued','building','activating')"
    ).bind(now, projectId),
    env.DATABASE.prepare("UPDATE github_events SET status='closed' WHERE project_id=?").bind(projectId),
    env.DATABASE.prepare("DELETE FROM github_connections WHERE project_id=?").bind(projectId),
    env.DATABASE.prepare("DELETE FROM github_states WHERE project_id=?").bind(projectId),
    env.DATABASE.prepare(
      "INSERT INTO project_deletion_builds(project_id,deployment_id) SELECT project_id,id FROM deployments WHERE project_id=? AND operation='deployments' AND NOT EXISTS(SELECT 1 FROM audit_events WHERE id=?) ON CONFLICT DO NOTHING"
    ).bind(projectId, `deletion:${projectId}`),
    env.DATABASE.prepare(
      "INSERT OR IGNORE INTO audit_events(id,project_id,actor_id,action,detail,created_at) VALUES(?,?,?,'project.deletion-requested',?,?)"
    ).bind(`deletion:${projectId}`, projectId, ownerId, JSON.stringify({ name: project.name }), now),
    env.DATABASE.prepare("UPDATE project_deletions SET retry_at=0 WHERE project_id=? AND state!='complete'").bind(
      projectId
    )
  ])
  // The durable record and minute sweep survive request interruption and browser closure.
  if (ctx) ctx.waitUntil(processProjectDeletion(env, projectId))
  return Response.json(await deletionStatus(env, projectId), { status: 202 })
}

export async function processProjectDeletions(env: Env) {
  const pending = await env.DATABASE.prepare(
    "SELECT project_id FROM project_deletions WHERE state!='complete' AND retry_at<=? AND lease_until<=? ORDER BY retry_at,requested_at LIMIT 3"
  )
    .bind(Date.now(), Date.now())
    .all<{ project_id: string }>()
  for (const project of pending.results) await processProjectDeletion(env, project.project_id)
}

export async function processProjectDeletion(env: Env, projectId: string) {
  const token = crypto.randomUUID()
  const job = await env.DATABASE.prepare(
    "UPDATE project_deletions SET lease_token=?,lease_until=? WHERE project_id=? AND state!='complete' AND lease_until<=? AND retry_at<=? RETURNING phase,state,attempts,completed_at"
  )
    .bind(token, Date.now() + 60_000, projectId, Date.now(), Date.now())
    .first<Deletion>()
  if (!job) return
  const checkpoint = async () => {
    if (
      !(await env.DATABASE.prepare(
        "UPDATE project_deletions SET lease_until=? WHERE project_id=? AND lease_token=? AND lease_until>? RETURNING project_id"
      )
        .bind(Date.now() + 60_000, projectId, token, Date.now())
        .first())
    )
      throw new Error("Deletion lease expired.")
  }
  const advance = async (phase: Deletion["phase"]) => {
    await checkpoint()
    await env.DATABASE.prepare(
      "UPDATE project_deletions SET phase=?,state='pending',last_error=NULL WHERE project_id=? AND lease_token=?"
    )
      .bind(phase, projectId, token)
      .run()
    job.phase = phase
  }
  try {
    // An upload/provisioner that started before deletion must finish before cleanup.
    const active = await env.DATABASE.prepare(
      "SELECT id FROM project_resource_operations WHERE project_id=? AND expires_at>? LIMIT 1"
    )
      .bind(projectId, Date.now())
      .first()
    if (active) return
    if (job.phase === "builds") {
      const builds = await env.DATABASE.prepare(
        "SELECT deployment_id FROM project_deletion_builds WHERE project_id=? LIMIT 10"
      )
        .bind(projectId)
        .all<{ deployment_id: string }>()
      for (const build of builds.results) {
        await checkpoint()
        if (!(await env.BUILD_JOBS.getByName(build.deployment_id).cancel(build.deployment_id))) return
        await env.DATABASE.batch([
          env.DATABASE.prepare("UPDATE build_queue SET reserved=0,finished=1,outcome=NULL WHERE deployment_id=?").bind(
            build.deployment_id
          ),
          env.DATABASE.prepare("DELETE FROM project_deletion_builds WHERE project_id=? AND deployment_id=?").bind(
            projectId,
            build.deployment_id
          )
        ])
      }
      if (
        await env.DATABASE.prepare("SELECT 1 FROM project_deletion_builds WHERE project_id=? LIMIT 1")
          .bind(projectId)
          .first()
      )
        return
      await advance("telemetry")
    }
    if (job.phase === "telemetry") {
      if (!env.TELEMETRY) throw new Error("Telemetry cleanup is not configured.")
      for (const environment of ["production", "sandbox"]) {
        await checkpoint()
        const response = await env.TELEMETRY.fetch(
          new Request(`https://telemetry.internal/${projectId}/${environment}/project`, { method: "DELETE" })
        )
        if (!response.ok) throw new Error(`Telemetry cleanup failed (${response.status}).`)
      }
      await advance("domains")
    }
    if (job.phase === "domains") {
      await removeProjectDomains(env, projectId, checkpoint)
      await advance("files")
    }
    if (job.phase === "files") {
      // Start at the beginning after each batch: deletion changes list pagination.
      // No surviving writer may add to either prefix after the lifecycle fence.
      for (const prefix of [`sources/${projectId}/`, `releases/${projectId}/`]) {
        await checkpoint()
        const page = await env.ARTIFACTS.list({ prefix, limit: 1000 })
        if (page.objects.some((object) => !object.key.startsWith(prefix)))
          throw new Error("Invalid artifact inventory.")
        if (page.objects.length) await env.ARTIFACTS.delete(page.objects.map((object) => object.key))
        if ((await env.ARTIFACTS.list({ prefix, limit: 1 })).objects.length) return
      }
      await advance("records")
    }
    if (job.phase === "records") {
      await checkpoint()
      const statements = [
        "DELETE FROM build_queue WHERE deployment_id IN (SELECT id FROM deployments WHERE project_id=?)",
        "DELETE FROM logs WHERE deployment_id IN (SELECT id FROM deployments WHERE project_id=?)",
        "DELETE FROM game_submissions WHERE project_id=?",
        "DELETE FROM deployment_hostname_aliases WHERE deployment_id IN (SELECT deployment_id FROM deployment_hostnames WHERE project_id=?)",
        "DELETE FROM deployment_hostnames WHERE project_id=?",
        "DELETE FROM hosting_aliases WHERE slot IN (SELECT slot FROM hosting_slots WHERE project_id=?)",
        "DELETE FROM hosting_slots WHERE project_id=?",
        "DELETE FROM github_states WHERE project_id=?",
        "DELETE FROM github_connections WHERE project_id=?",
        "DELETE FROM github_events WHERE project_id=?",
        "DELETE FROM deployments WHERE project_id=?",
        "DELETE FROM releases WHERE project_id=?",
        "DELETE FROM uploads WHERE project_id=?",
        "DELETE FROM domains WHERE project_id=?",
        "DELETE FROM project_listing_settings WHERE project_id=?",
        "DELETE FROM game_comments WHERE project_id=?",
        "DELETE FROM game_ratings WHERE project_id=?",
        "DELETE FROM game_activity_visitors WHERE project_id=?",
        "DELETE FROM game_activity_totals WHERE project_id=?",
        "DELETE FROM game_activity_daily WHERE project_id=?",
        "DELETE FROM game_moderation WHERE project_id=?",
        "DELETE FROM environments WHERE project_id=?",
        "DELETE FROM project_resource_operations WHERE project_id=?",
        "DELETE FROM project_hostnames WHERE project_id=?"
      ].map((sql) => env.DATABASE.prepare(sql).bind(projectId))
      const now = new Date().toISOString()
      await env.DATABASE.batch([
        ...statements,
        // Tombstone prevents reused IDs/browser backups resurrecting the project.
        // Immutable safety/audit evidence continues referencing this minimal row.
        env.DATABASE.prepare(
          "UPDATE projects SET lifecycle='deleted',name='Deleted project',configuration='{}',metadata='{}',updated_at=? WHERE id=?"
        ).bind(now, projectId),
        env.DATABASE.prepare(
          "UPDATE project_deletions SET state='complete',phase='complete',completed_at=?,last_error=NULL WHERE project_id=? AND lease_token=?"
        ).bind(now, projectId, token),
        env.DATABASE.prepare(
          "INSERT OR IGNORE INTO audit_events(id,project_id,actor_id,action,detail,created_at) SELECT ?,project_id,actor_id,'project.deleted','{}',? FROM project_deletions WHERE project_id=?"
        ).bind(`deleted:${projectId}`, now, projectId)
      ])
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Cleanup failed."
    console.error(JSON.stringify({ event: "project_cleanup_pending", projectId, phase: job.phase, reason }))
    await env.DATABASE.batch([
      env.DATABASE.prepare(
        "UPDATE project_deletions SET state='retrying',attempts=attempts+1,last_error=?,retry_at=? WHERE project_id=? AND lease_token=?"
      ).bind(
        reason.slice(0, 500),
        Date.now() + Math.min(60_000 * 2 ** Math.min(job.attempts, 6), 3600_000),
        projectId,
        token
      ),
      env.DATABASE.prepare(
        "INSERT INTO audit_events(id,project_id,actor_id,action,detail,created_at) SELECT ?,project_id,actor_id,'project.deletion-retry',?,? FROM project_deletions WHERE project_id=? AND lease_token=?"
      ).bind(
        crypto.randomUUID(),
        JSON.stringify({ phase: job.phase, reason: reason.slice(0, 500) }),
        new Date().toISOString(),
        projectId,
        token
      )
    ])
  } finally {
    await env.DATABASE.prepare(
      "UPDATE project_deletions SET lease_token=NULL,lease_until=0 WHERE project_id=? AND lease_token=?"
    )
      .bind(projectId, token)
      .run()
  }
}
