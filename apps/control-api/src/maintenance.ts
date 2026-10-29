import { pruneCreatorMetrics } from "./creator-metrics"
import { pruneGameActivity } from "./game-activity"
import { provisionProjectDomain } from "./provisioning"

/** Bounded cleanup is independent of build-provider availability. */
export async function maintainPlatform(env: Env) {
  await pruneGameActivity(env)
  await pruneCreatorMetrics(env)
  const now = new Date().toISOString()
  await env.DATABASE.prepare("DELETE FROM github_states WHERE expires_at<?").bind(now).run()
  const expired = await env.DATABASE.prepare(
    "SELECT u.id,u.project_id FROM uploads u WHERE u.expires_at<? AND NOT EXISTS(SELECT 1 FROM deployments d WHERE d.upload_id=u.id) LIMIT 20"
  )
    .bind(now)
    .all<{ id: string; project_id: string }>()
  for (const upload of expired.results) {
    await env.ARTIFACTS.delete(`sources/${upload.project_id}/${upload.id}.gz`)
    await env.DATABASE.prepare(
      "DELETE FROM uploads WHERE id=? AND NOT EXISTS(SELECT 1 FROM deployments WHERE upload_id=?)"
    )
      .bind(upload.id, upload.id)
      .run()
  }
  if (env.HOSTING_API_TOKEN) {
    const pending = await env.DATABASE.prepare(
      "SELECT h.project_id,h.slug FROM project_hostnames h JOIN projects p ON p.id=h.project_id WHERE p.lifecycle='active' AND h.ready=0 ORDER BY h.attempted_at, h.rowid LIMIT 3"
    ).all<{ project_id: string; slug: string }>()
    for (const project of pending.results) {
      await env.DATABASE.prepare("UPDATE project_hostnames SET attempted_at=? WHERE project_id=?")
        .bind(now, project.project_id)
        .run()
      try {
        await provisionProjectDomain(env, project.project_id, project.slug)
      } catch (error) {
        console.error(
          "Project domain provisioning failed",
          project.project_id,
          error instanceof Error ? error.message : "Unknown provider error"
        )
      }
    }
  }
}
