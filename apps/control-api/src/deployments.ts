import { createHash } from "node:crypto"
import { activate, type DeploymentRow } from "./activation"
import { enqueueBuild } from "./build-queue"
import { HttpError, jsonBody, requireValue } from "./http"
import { mediaWarnings } from "./media-warnings"

async function response(row: DeploymentRow, env: Env) {
  const release = await env.DATABASE.prepare("SELECT media_warnings FROM releases WHERE id=? AND project_id=?")
    .bind(row.release_id, row.project_id)
    .first<{ media_warnings: string }>()
  const pinned =
    row.status === "succeeded"
      ? await env.DATABASE.prepare("SELECT hostname FROM deployment_hostnames WHERE deployment_id=?")
          .bind(row.id)
          .first<{ hostname: string }>()
      : null
  const host =
    row.status === "succeeded"
      ? await env.DATABASE.prepare("SELECT hostname FROM hosting_slots WHERE project_id=? AND environment=?")
          .bind(row.project_id, row.environment)
          .first<{ hostname: string }>()
      : null
  return Response.json({
    id: row.id,
    status: row.status,
    environment: row.environment,
    releaseId: row.release_id,
    dashboardUrl: `${env.DASHBOARD_URL}/dashboard/projects/${row.project_id}`,
    mediaWarnings: mediaWarnings(release?.media_warnings),
    ...(host ? { url: `https://${host.hostname}` } : {}),
    ...(pinned ? { deploymentUrl: `https://${pinned.hostname}` } : {})
  })
}

export async function deploymentRoute(
  request: Request,
  env: Env,
  projectId: string,
  ownerId: string,
  operation: string,
  resourceId?: string
) {
  const url = new URL(request.url)
  if (request.method === "GET" && resourceId) {
    const row = await env.DATABASE.prepare("SELECT * FROM deployments WHERE id=? AND project_id=?")
      .bind(resourceId, projectId)
      .first<DeploymentRow>()
    if (!row) throw new HttpError(404, "not_found", "Deployment not found.")
    if (url.pathname.endsWith("/logs")) {
      const cursor = Number(url.searchParams.get("cursor") ?? 0)
      requireValue(Number.isSafeInteger(cursor) && cursor >= 0, "Invalid log cursor.")
      const logs = await env.DATABASE.prepare(
        "SELECT sequence,message FROM logs WHERE deployment_id=? AND sequence>? ORDER BY sequence LIMIT 100"
      )
        .bind(resourceId, cursor)
        .all<{ sequence: number; message: string }>()
      return Response.json({
        entries: logs.results,
        ...(logs.results.length ? { nextCursor: String(logs.results.at(-1)!.sequence) } : {})
      })
    }
    return response(row, env)
  }
  if (request.method !== "POST" || resourceId) throw new HttpError(404, "not_found", "Not found.")
  const body = await jsonBody(request)
  requireValue(body.environment === "production" || body.environment === "sandbox", "Choose an environment.")
  requireValue(
    body.expectedReleaseId === null || typeof body.expectedReleaseId === "string",
    "Expected release is required."
  )
  const key = request.headers.get("idempotency-key")
  requireValue(key && /^[A-Za-z0-9_-]{1,128}$/.test(key), "An idempotency key is required.")
  const hash = createHash("sha256")
    .update(JSON.stringify({ operation, ...body }))
    .digest("hex")
  const existing = await env.DATABASE.prepare("SELECT * FROM deployments WHERE project_id=? AND request_key=?")
    .bind(projectId, key)
    .first<DeploymentRow & { request_hash: string }>()
  if (existing) {
    if (existing.request_hash !== hash)
      throw new HttpError(409, "idempotency_conflict", "This request key was used for a different operation.")
    if (existing.status === "queued") await enqueueBuild(env, existing.id)
    if (existing.status === "activating") {
      await activate(env, existing)
      const current = await env.DATABASE.prepare("SELECT * FROM deployments WHERE id=?")
        .bind(existing.id)
        .first<DeploymentRow>()
      return response(current ?? existing, env)
    }
    return response(existing, env)
  }
  const target = await env.DATABASE.prepare(
    "SELECT enabled,current_release_id FROM environments WHERE project_id=? AND name=?"
  )
    .bind(projectId, body.environment)
    .first<{ enabled: number; current_release_id: string | null }>()
  requireValue(target?.enabled, "Enable this environment first.")
  if (target.current_release_id !== body.expectedReleaseId)
    throw new HttpError(409, "conflict", "The environment changed. Review its current release and retry.")
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  let releaseId: string
  let uploadId: string | null = null
  const statements: D1PreparedStatement[] = []
  if (operation === "deployments") {
    if (env.BUILDS_ENABLED !== "true")
      throw new HttpError(503, "builds_unavailable", "Hosted builds are not available yet. No deployment was started.")
    requireValue(typeof body.uploadId === "string", "A source upload is required.")
    const upload = await env.DATABASE.prepare("SELECT status,expires_at FROM uploads WHERE id=? AND project_id=?")
      .bind(body.uploadId, projectId)
      .first<{ status: string; expires_at: string }>()
    requireValue(upload?.status === "ready" && upload.expires_at > now, "Upload is not ready or has expired.")
    releaseId = crypto.randomUUID()
    uploadId = body.uploadId
    statements.push(
      env.DATABASE.prepare(
        "INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES(?,?,?,'queued',?,?)"
      ).bind(releaseId, projectId, id, body.environment, now)
    )
  } else {
    requireValue(typeof body.releaseId === "string", "Choose a release.")
    const release = await env.DATABASE.prepare(
      "SELECT status,environment,artifact_digest FROM releases WHERE id=? AND project_id=?"
    )
      .bind(body.releaseId, projectId)
      .first<{ status: string; environment: string; artifact_digest: string | null }>()
    requireValue(release?.status === "ready" && release.artifact_digest, "Choose a retained successful release.")
    if (operation === "promotions") {
      const staged = await env.DATABASE.prepare(
        "SELECT id FROM deployments WHERE project_id=? AND release_id=? AND environment='sandbox' AND status='succeeded' LIMIT 1"
      )
        .bind(projectId, body.releaseId)
        .first()
      requireValue(staged && body.environment === "production", "Promotion requires a successful Sandbox release.")
    }
    requireValue(
      await env.ARTIFACTS.head(`releases/${projectId}/${body.releaseId}/index.html`),
      "Release artifacts are unavailable."
    )
    releaseId = body.releaseId
  }
  const status = operation === "deployments" ? "queued" : "activating"
  statements.push(
    env.DATABASE.prepare(
      "INSERT INTO deployments(id,project_id,release_id,upload_id,environment,status,operation,expected_release_id,request_key,request_hash,actor_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id,
      projectId,
      releaseId,
      uploadId,
      body.environment,
      status,
      operation,
      body.expectedReleaseId,
      key,
      hash,
      ownerId,
      now,
      now
    )
  )
  try {
    await env.DATABASE.batch(statements)
  } catch {
    throw new HttpError(409, "deployment_conflict", "Another operation is already in progress. Refresh and retry.")
  }
  const row: DeploymentRow = {
    id,
    project_id: projectId,
    release_id: releaseId,
    upload_id: uploadId ?? "",
    environment: body.environment,
    status,
    expected_release_id: body.expectedReleaseId
  }
  if (operation === "deployments") await enqueueBuild(env, id)
  else {
    try {
      await activate(env, row)
    } catch {
      await env.DATABASE.prepare(
        "UPDATE deployments SET status='failed',updated_at=? WHERE id=? AND status='activating'"
      )
        .bind(new Date().toISOString(), id)
        .run()
      throw new HttpError(
        503,
        "activation_failed",
        "Activation could not complete. The previous release is unchanged; inspect deployment status before retrying."
      )
    }
  }
  const current = await env.DATABASE.prepare("SELECT * FROM deployments WHERE id=?").bind(id).first<DeploymentRow>()
  return response(current ?? row, env)
}
