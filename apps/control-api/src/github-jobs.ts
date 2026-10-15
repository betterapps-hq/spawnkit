import { githubConfigured } from "./github"
import { githubSource } from "./github-source"
import { HttpError } from "./http"

interface GitHubEvent {
  id: string
  project_id: string
  environment: string
  commit_sha: string
  created_at: string
}

export async function processGitHubEvents(env: Env) {
  if (env.BUILDS_ENABLED !== "true") return
  // Recover committed submissions independently of GitHub configuration.
  const queued = await env.DATABASE.prepare(
    "SELECT id FROM deployments WHERE status='queued' ORDER BY created_at LIMIT 10"
  ).all<{ id: string }>()
  for (const job of queued.results) await env.BUILD_JOBS.getByName(job.id).start(job.id)
  if (!githubConfigured(env)) return
  const events = await env.DATABASE.prepare(
    "SELECT id,project_id,environment,commit_sha,created_at FROM github_events WHERE status='pending' ORDER BY created_at LIMIT 3"
  ).all<GitHubEvent>()
  for (const event of events.results) {
    const newer = await env.DATABASE.prepare(
      "SELECT id FROM github_events WHERE project_id=? AND environment=? AND rowid>(SELECT rowid FROM github_events WHERE id=?) LIMIT 1"
    )
      .bind(event.project_id, event.environment, event.id)
      .first()
    if (newer) {
      await env.DATABASE.prepare("UPDATE github_events SET status='superseded' WHERE id=? AND status='pending'")
        .bind(event.id)
        .run()
      continue
    }
    const active = await env.DATABASE.prepare(
      "SELECT id FROM deployments WHERE project_id=? AND environment=? AND status IN ('queued','building','activating') LIMIT 1"
    )
      .bind(event.project_id, event.environment)
      .first()
    if (active) continue
    const connection = await env.DATABASE.prepare("SELECT * FROM github_connections WHERE project_id=?")
      .bind(event.project_id)
      .first<{ installation_id: number; repository_id: number; repository: string }>()
    if (!connection) continue
    try {
      const source = await githubSource(env, connection, event.commit_sha)
      const uploadId = crypto.randomUUID(),
        releaseId = crypto.randomUUID(),
        deploymentId = crypto.randomUUID()
      const now = new Date().toISOString()
      await env.ARTIFACTS.put(`sources/${event.project_id}/${uploadId}.gz`, source.bytes, { sha256: source.sha256 })
      // Conditional event claim and transaction prevent duplicate webhook delivery from creating multiple builds.
      await env.DATABASE.batch([
        env.DATABASE.prepare(
          "UPDATE github_events SET status='preparing',deployment_id=? WHERE id=? AND status='pending'"
        ).bind(deploymentId, event.id),
        env.DATABASE.prepare(
          "INSERT INTO environments(id,project_id,name,enabled) SELECT ?,?,?,1 WHERE EXISTS(SELECT 1 FROM github_events WHERE id=? AND deployment_id=? AND status='preparing') ON CONFLICT(project_id,name) DO UPDATE SET enabled=CASE WHEN excluded.name LIKE 'preview-%' THEN 1 ELSE environments.enabled END"
        ).bind(`${event.project_id}:${event.environment}`, event.project_id, event.environment, event.id, deploymentId),
        env.DATABASE.prepare(
          "INSERT INTO uploads(id,project_id,sha256,size_bytes,status,expires_at) SELECT ?,?,?,?,'ready',? WHERE EXISTS(SELECT 1 FROM github_events WHERE id=? AND deployment_id=? AND status='preparing')"
        ).bind(
          uploadId,
          event.project_id,
          source.sha256,
          source.bytes.length,
          new Date(Date.now() + 86_400_000).toISOString(),
          event.id,
          deploymentId
        ),
        env.DATABASE.prepare(
          "INSERT INTO releases(id,project_id,build_id,status,environment,created_at) SELECT ?,?,?,'building',?,? WHERE EXISTS(SELECT 1 FROM github_events WHERE id=? AND deployment_id=? AND status='preparing')"
        ).bind(releaseId, event.project_id, deploymentId, event.environment, now, event.id, deploymentId),
        env.DATABASE.prepare(
          "INSERT INTO deployments(id,project_id,release_id,upload_id,environment,status,operation,expected_release_id,request_key,request_hash,actor_id,created_at,updated_at) SELECT ?,?,?,?,?, 'queued','deployments',current_release_id,?,?, 'github',?,? FROM environments WHERE project_id=? AND name=? AND enabled=1 AND EXISTS(SELECT 1 FROM github_events WHERE id=? AND deployment_id=? AND status='preparing')"
        ).bind(
          deploymentId,
          event.project_id,
          releaseId,
          uploadId,
          event.environment,
          event.id,
          source.sha256,
          now,
          now,
          event.project_id,
          event.environment,
          event.id,
          deploymentId
        ),
        env.DATABASE.prepare("UPDATE github_events SET status='submitted' WHERE id=? AND status='preparing'").bind(
          event.id
        )
      ])
      await env.BUILD_JOBS.getByName(deploymentId).start(deploymentId)
    } catch (error) {
      await env.DATABASE.prepare(
        "UPDATE github_events SET status='failed' WHERE id=? AND status IN ('pending','preparing')"
      )
        .bind(event.id)
        .run()
      console.error(
        JSON.stringify({
          event: "github_build_submission_failed",
          deliveryId: event.id,
          errorType: error instanceof Error ? error.name : "Unknown",
          ...(error instanceof HttpError ? { code: error.code, reason: error.message } : {})
        })
      )
    }
  }
}
