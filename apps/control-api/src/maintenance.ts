import { provisionProjectDomain } from "./provisioning"

/** Bounded cleanup is independent of build-provider availability. */
export async function maintainPlatform(env: Env) {
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
      "SELECT project_id,slug FROM project_hostnames WHERE ready=0 ORDER BY attempted_at, rowid LIMIT 3"
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
  if (env.TELEMETRY) {
    const aliases = await env.DATABASE.prepare(
      "SELECT a.hostname AS previous,h.hostname,h.project_id,h.environment FROM hosting_aliases a JOIN hosting_slots h ON h.slot=a.slot WHERE a.telemetry_synced=0 AND h.environment IN ('production','sandbox') LIMIT 20"
    ).all<{ previous: string; hostname: string; project_id: string; environment: string }>()
    for (const alias of aliases.results) {
      const result = await env.TELEMETRY.fetch(
        new Request(`https://telemetry.internal/${alias.project_id}/${alias.environment}/origins`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ from: `https://${alias.previous}`, to: `https://${alias.hostname}` })
        })
      )
      if (result.ok)
        await env.DATABASE.prepare("UPDATE hosting_aliases SET telemetry_synced=1 WHERE hostname=?")
          .bind(alias.previous)
          .run()
      else console.error("Telemetry origin migration pending", alias.project_id, result.status)
    }
  }
}
