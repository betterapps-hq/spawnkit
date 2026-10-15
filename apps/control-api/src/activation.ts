import { projectHostname, reserveDeploymentHostname, reserveProjectSlug } from "./hosting"
import { HttpError } from "./http"

export interface DeploymentRow {
  id: string
  project_id: string
  upload_id: string
  release_id: string
  environment: string
  status: string
  expected_release_id: string | null
}

export async function activate(env: Env, deployment: DeploymentRow) {
  const now = new Date().toISOString()
  let deploymentHostname: string | undefined
  let slug: string | undefined
  if (env.HOSTING_MODE === "domains") {
    const project = await env.DATABASE.prepare("SELECT name FROM projects WHERE id=?")
      .bind(deployment.project_id)
      .first<{ name: string }>()
    if (!project) throw new Error("Project not found")
    slug = await reserveProjectSlug(env.DATABASE, deployment.project_id, project.name)
    const address = await env.DATABASE.prepare("SELECT ready FROM project_hostnames WHERE project_id=?")
      .bind(deployment.project_id)
      .first<{ ready: number }>()
    if (!address?.ready)
      throw new HttpError(
        503,
        "hosting_pending",
        "Project HTTPS provisioning is pending. The release artifacts are retained; retry after domain provisioning completes."
      )
    deploymentHostname = await reserveDeploymentHostname(
      env.DATABASE,
      deployment,
      projectHostname(slug, "production", env.HOSTING_TEST === "true")
    )
  }
  let host = await env.DATABASE.prepare("SELECT hostname FROM hosting_slots WHERE project_id=? AND environment=?")
    .bind(deployment.project_id, deployment.environment)
    .first<{ hostname: string }>()
  if (!host) {
    if (env.HOSTING_MODE === "domains") {
      const hostname = projectHostname(slug!, deployment.environment, env.HOSTING_TEST === "true")
      await env.DATABASE.prepare(
        "INSERT INTO hosting_slots(slot,hostname,project_id,environment) VALUES(?,?,?,?) ON CONFLICT(project_id,environment) DO NOTHING"
      )
        .bind(
          `${deployment.project_id}:${deployment.environment}`,
          hostname,
          deployment.project_id,
          deployment.environment
        )
        .run()
    } else {
      await env.DATABASE.prepare(
        "UPDATE hosting_slots SET project_id=?, environment=? WHERE slot=(SELECT slot FROM hosting_slots WHERE project_id IS NULL ORDER BY slot LIMIT 1) AND NOT EXISTS(SELECT 1 FROM hosting_slots WHERE project_id=? AND environment=?)"
      )
        .bind(deployment.project_id, deployment.environment, deployment.project_id, deployment.environment)
        .run()
    }
    host = await env.DATABASE.prepare("SELECT hostname FROM hosting_slots WHERE project_id=? AND environment=?")
      .bind(deployment.project_id, deployment.environment)
      .first<{ hostname: string }>()
  }
  if (!host) throw new Error("Hosting capacity is unavailable. The release artifacts are retained.")
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      "UPDATE environments SET current_release_id=?, generation=generation+1 WHERE project_id=? AND name=? AND enabled=1 AND current_release_id IS ? AND NOT EXISTS(SELECT 1 FROM github_events e WHERE e.deployment_id=? AND (e.status='closed' OR EXISTS(SELECT 1 FROM github_events newer WHERE newer.project_id=e.project_id AND newer.environment=e.environment AND newer.rowid>e.rowid)))"
    ).bind(
      deployment.release_id,
      deployment.project_id,
      deployment.environment,
      deployment.expected_release_id,
      deployment.id
    ),
    env.DATABASE.prepare("UPDATE releases SET url=COALESCE(url,?) WHERE id=?").bind(
      `https://${deploymentHostname ?? host.hostname}`,
      deployment.release_id
    ),
    env.DATABASE.prepare(
      "UPDATE deployments SET status=CASE WHEN EXISTS(SELECT 1 FROM environments WHERE project_id=? AND name=? AND current_release_id=?) THEN 'succeeded' ELSE 'superseded' END, updated_at=? WHERE id=?"
    ).bind(deployment.project_id, deployment.environment, deployment.release_id, now, deployment.id),
    env.DATABASE.prepare(
      "INSERT OR IGNORE INTO audit_events(id,project_id,actor_id,action,detail,created_at) SELECT id,project_id,actor_id,operation,json_object('deploymentId',id,'releaseId',release_id,'status',status),? FROM deployments WHERE id=?"
    ).bind(now, deployment.id)
  ])
}
