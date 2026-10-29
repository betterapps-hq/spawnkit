import { automaticSubmission } from "./automatic-submission"
import { projectHostname, reserveDeploymentHostname, reserveProjectSlug } from "./hosting"
import { HttpError } from "./http"
import { requireActiveProject } from "./project-lifecycle"
import { provisionProjectDomain } from "./provisioning"

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
  await requireActiveProject(env, deployment.project_id)
  const now = new Date().toISOString()
  const project = await env.DATABASE.prepare("SELECT name FROM projects WHERE id=?")
    .bind(deployment.project_id)
    .first<{ name: string }>()
  if (!project) throw new Error("Project not found")
  const slug = await reserveProjectSlug(env.DATABASE, deployment.project_id, project.name)
  const address = await env.DATABASE.prepare("SELECT ready FROM project_hostnames WHERE project_id=?")
    .bind(deployment.project_id)
    .first<{ ready: number }>()
  let ready = Boolean(address?.ready)
  if (!ready && env.HOSTING_API_TOKEN) {
    try {
      ready = await provisionProjectDomain(env, deployment.project_id, slug)
    } catch {
      // The durable activation alarm and maintenance sweep retry provider failures.
      console.warn("activation_domain_provisioning_pending")
    }
  }
  if (!ready)
    throw new HttpError(
      503,
      "hosting_pending",
      "Project HTTPS provisioning is pending. The release artifacts are retained; retry after domain provisioning completes."
    )
  const deploymentHostname = await reserveDeploymentHostname(
    env.DATABASE,
    deployment,
    projectHostname(slug, "production", env.HOSTING_TEST === "true")
  )
  const hostname = projectHostname(slug, deployment.environment, env.HOSTING_TEST === "true")
  await env.DATABASE.prepare(
    "INSERT INTO hosting_slots(slot,hostname,project_id,environment) VALUES(?,?,?,?) ON CONFLICT(project_id,environment) DO NOTHING"
  )
    .bind(`${deployment.project_id}:${deployment.environment}`, hostname, deployment.project_id, deployment.environment)
    .run()
  const submission = deployment.environment === "production" ? await automaticSubmission(env, deployment, now) : null
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
      `https://${deploymentHostname}`,
      deployment.release_id
    ),
    env.DATABASE.prepare(
      "UPDATE deployments SET status=CASE WHEN EXISTS(SELECT 1 FROM environments WHERE project_id=? AND name=? AND current_release_id=?) THEN 'succeeded' ELSE 'superseded' END, updated_at=? WHERE id=?"
    ).bind(deployment.project_id, deployment.environment, deployment.release_id, now, deployment.id),
    env.DATABASE.prepare(
      "INSERT OR IGNORE INTO audit_events(id,project_id,actor_id,action,detail,created_at) SELECT id,project_id,actor_id,operation,json_object('deploymentId',id,'releaseId',release_id,'status',status),? FROM deployments WHERE id=?"
    ).bind(now, deployment.id),
    ...(submission ?? [])
  ])
}
