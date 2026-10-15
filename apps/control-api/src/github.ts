import { createSign } from "node:crypto"
import { githubRepository, validWebhookSignature } from "./github-security"
import { boundedBody, HttpError, jsonBody, record, requireValue } from "./http"

export async function queueGitHubBuild(request: Request, env: Env, projectId: string) {
  if (env.BUILDS_ENABLED !== "true")
    throw new HttpError(503, "builds_unavailable", "Hosted builds are not enabled. No deployment was started.")
  if (!githubConfigured(env)) throw new HttpError(503, "github_setup_required", "GitHub is not configured.")
  const body = await jsonBody(request)
  requireValue(body.environment === "production" || body.environment === "sandbox", "Choose an environment.")
  requireValue(
    typeof body.branch === "string" && body.branch.length > 0 && body.branch.length <= 255,
    "Choose a branch."
  )
  const key = request.headers.get("idempotency-key")
  requireValue(key && /^[A-Za-z0-9_-]{1,128}$/.test(key), "An idempotency key is required.")
  const connection = await env.DATABASE.prepare(
    "SELECT installation_id,repository_id,repository FROM github_connections WHERE project_id=?"
  )
    .bind(projectId)
    .first<{ installation_id: number; repository_id: number; repository: string }>()
  requireValue(connection, "Connect GitHub first.")
  const id = `manual-${projectId}-${key}`
  const existing = await env.DATABASE.prepare(
    "SELECT environment,branch,status FROM github_events WHERE id=? AND project_id=?"
  )
    .bind(id, projectId)
    .first<{ environment: string; branch: string; status: string }>()
  if (existing) {
    if (existing.environment !== body.environment || existing.branch !== body.branch)
      throw new HttpError(409, "idempotency_conflict", "This key was used for a different build.")
    return Response.json({ id, status: existing.status })
  }
  const environment = await env.DATABASE.prepare(
    "SELECT enabled,current_release_id FROM environments WHERE project_id=? AND name=?"
  )
    .bind(projectId, body.environment)
    .first<{ enabled: number; current_release_id: string | null }>()
  requireValue(environment?.enabled, "Enable this environment first.")
  if (environment.current_release_id !== body.expectedReleaseId)
    throw new HttpError(409, "conflict", "The environment changed. Review it before building.")
  const token = await installationToken(env, connection.installation_id, connection.repository_id)
  const commit = await githubJson(`/repos/${connection.repository}/commits/${encodeURIComponent(body.branch)}`, token)
  requireValue(typeof commit.sha === "string" && /^[a-f0-9]{40}$/.test(commit.sha), "The branch could not be resolved.")
  await env.DATABASE.prepare(
    "INSERT OR IGNORE INTO github_events(id,project_id,kind,environment,commit_sha,title,branch,created_at) VALUES(?,?,'manual',?,?,?,?,?)"
  )
    .bind(id, projectId, body.environment, commit.sha, `Build ${body.branch}`, body.branch, new Date().toISOString())
    .run()
  const accepted = await env.DATABASE.prepare("SELECT environment,branch FROM github_events WHERE id=?")
    .bind(id)
    .first<{ environment: string; branch: string }>()
  if (accepted?.environment !== body.environment || accepted.branch !== body.branch)
    throw new HttpError(409, "idempotency_conflict", "This key was used for a different build.")
  return Response.json({ id, status: "pending" }, { status: 202 })
}

export async function retryGitHubPreview(env: Env, projectId: string, eventId: string) {
  if (env.BUILDS_ENABLED !== "true" || !githubConfigured(env))
    throw new HttpError(503, "builds_unavailable", "Hosted GitHub builds are not enabled.")
  const preview = await env.DATABASE.prepare(
    "SELECT g.pull_request,c.installation_id,c.repository_id,c.repository FROM github_events g JOIN github_connections c ON c.project_id=g.project_id WHERE g.id=? AND g.project_id=? AND g.pull_request IS NOT NULL AND g.status!='closed'"
  )
    .bind(eventId, projectId)
    .first<{ pull_request: number; installation_id: number; repository_id: number; repository: string }>()
  if (!preview) throw new HttpError(404, "not_found", "Open preview not found.")
  const token = await installationToken(env, preview.installation_id, preview.repository_id)
  const pull = await githubJson(`/repos/${preview.repository}/pulls/${preview.pull_request}`, token)
  const head = record(pull.head)
  requireValue(
    pull.state === "open" && record(head.repo).id === preview.repository_id,
    "Only open, same-repository pull requests can be rebuilt."
  )
  requireValue(typeof head.sha === "string" && /^[a-f0-9]{40}$/.test(head.sha), "Invalid pull request commit.")
  const id = crypto.randomUUID()
  await env.DATABASE.prepare(
    "INSERT INTO github_events(id,project_id,kind,environment,commit_sha,title,branch,pull_request,created_at) VALUES(?,?,'pull_request',?,?,?,?,?,?)"
  )
    .bind(
      id,
      projectId,
      `preview-${preview.pull_request}`,
      head.sha,
      String(pull.title).slice(0, 200),
      String(head.ref),
      preview.pull_request,
      new Date().toISOString()
    )
    .run()
  return Response.json({ id, status: "pending" }, { status: 202 })
}

export function githubConfigured(env: Env) {
  return Boolean(
    env.GITHUB_APP_ID &&
    env.GITHUB_APP_PRIVATE_KEY &&
    env.GITHUB_CLIENT_ID &&
    env.GITHUB_CLIENT_SECRET &&
    env.GITHUB_WEBHOOK_SECRET
  )
}

async function githubJson(path: string, token: string, method = "GET", body?: unknown) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "user-agent": "SpawnKit",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok)
    throw new HttpError(
      502,
      "github_unavailable",
      "GitHub could not complete this request. Check your repository access."
    )
  return record(await response.json())
}

export async function installationToken(env: Env, installationId: number, repositoryId: number, linkedWork = false) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_ID })).toString(
    "base64url"
  )
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(env.GITHUB_APP_PRIVATE_KEY, "base64url")
  const result = await githubJson(
    `/app/installations/${installationId}/access_tokens`,
    `${header}.${payload}.${signature}`,
    "POST",
    {
      repository_ids: [repositoryId],
      permissions: { contents: "read", ...(linkedWork ? { pull_requests: "read", issues: "read" } : {}) }
    }
  )
  requireValue(typeof result.token === "string", "GitHub returned an invalid installation token.")
  return result.token
}

export async function connectGitHub(
  env: Env,
  ownerId: string,
  projectId: string,
  configuration: Record<string, unknown>
) {
  if (!githubConfigured(env))
    throw new HttpError(
      503,
      "github_setup_required",
      "The platform GitHub App must be configured before repositories can be connected."
    )
  const selection = record(configuration.github)
  const repository = githubRepository(selection.url)
  const state = crypto.randomUUID()
  await env.DATABASE.prepare(
    "INSERT INTO github_states(state,owner_id,project_id,repository,expires_at) VALUES(?,?,?,?,?)"
  )
    .bind(state, ownerId, projectId, repository, new Date(Date.now() + 15 * 60_000).toISOString())
    .run()
  const url = new URL("https://github.com/login/oauth/authorize")
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID)
  url.searchParams.set("redirect_uri", `${env.DASHBOARD_URL}/api/platform/v1/github/callback`)
  url.searchParams.set("state", state)
  return Response.json({ url: url.href })
}

export async function githubCallback(request: Request, env: Env, ownerId: string) {
  if (!githubConfigured(env)) throw new HttpError(503, "github_setup_required", "GitHub is not configured.")
  const url = new URL(request.url)
  const state = url.searchParams.get("state")
  const code = url.searchParams.get("code")
  requireValue(state && code, "GitHub authorization was not completed.")
  const pending = await env.DATABASE.prepare(
    "DELETE FROM github_states WHERE state=? AND owner_id=? AND expires_at>? RETURNING project_id,repository"
  )
    .bind(state, ownerId, new Date().toISOString())
    .first<{ project_id: string; repository: string }>()
  if (!pending) throw new HttpError(400, "invalid_state", "The GitHub connection expired. Start again.")
  const exchange = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${env.DASHBOARD_URL}/api/platform/v1/github/callback`
    }),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000)
  })
  requireValue(exchange.ok, "GitHub authorization failed.")
  const data = record(await exchange.json())
  requireValue(typeof data.access_token === "string", "GitHub authorization failed.")
  const token = data.access_token
  const installations = await githubJson("/user/installations?per_page=100", token)
  requireValue(Array.isArray(installations.installations), "No GitHub installation is available.")
  let selected: { installationId: number; repositoryId: number } | null = null
  for (const value of installations.installations) {
    if (selected) break
    const installation = record(value)
    if (String(installation.app_id) !== env.GITHUB_APP_ID || typeof installation.id !== "number") continue
    // User-scoped endpoint checks both the App grant and this user's repository access.
    for (let page = 1; page <= 20 && !selected; page++) {
      const accessible = await githubJson(
        `/user/installations/${installation.id}/repositories?per_page=100&page=${page}`,
        token
      )
      if (!Array.isArray(accessible.repositories)) break
      const repository = accessible.repositories
        .map(record)
        .find((repo) => String(repo.full_name).toLowerCase() === pending.repository.toLowerCase())
      if (repository && typeof repository.id === "number")
        selected = { installationId: installation.id, repositoryId: repository.id }
      if (accessible.repositories.length < 100) break
    }
  }
  if (!selected)
    throw new HttpError(
      403,
      "github_access_required",
      "Install the SpawnKit GitHub App on this repository, then reconnect."
    )
  await env.DATABASE.prepare(
    "INSERT INTO github_connections(project_id,installation_id,repository_id,repository,connected_by,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET installation_id=excluded.installation_id,repository_id=excluded.repository_id,repository=excluded.repository,connected_by=excluded.connected_by,created_at=excluded.created_at"
  )
    .bind(
      pending.project_id,
      selected.installationId,
      selected.repositoryId,
      pending.repository,
      ownerId,
      new Date().toISOString()
    )
    .run()
  return Response.redirect(
    `${env.DASHBOARD_URL}/dashboard?page=settings&project=${encodeURIComponent(pending.project_id)}`,
    303
  )
}

export async function githubWebhook(request: Request, env: Env) {
  if (!env.GITHUB_WEBHOOK_SECRET) throw new HttpError(503, "github_setup_required", "GitHub is not configured.")
  const bytes = await boundedBody(request, 1024 * 1024)
  if (!validWebhookSignature(bytes, request.headers.get("x-hub-signature-256"), env.GITHUB_WEBHOOK_SECRET))
    throw new HttpError(401, "invalid_signature", "Invalid webhook signature.")
  const deliveryId = request.headers.get("x-github-delivery")
  requireValue(deliveryId && /^[A-Za-z0-9-]{1,128}$/.test(deliveryId), "Invalid delivery ID.")
  let body: Record<string, unknown>
  try {
    body = record(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    throw new HttpError(400, "invalid_request", "Invalid webhook body.")
  }
  const event = request.headers.get("x-github-event")
  if (event === "ping") return Response.json({ accepted: true })
  if (!githubConfigured(env)) throw new HttpError(503, "github_setup_required", "GitHub is not configured.")
  const installation = record(body.installation)
  requireValue(typeof installation.id === "number" && Number.isSafeInteger(installation.id), "Invalid installation.")
  if (event === "installation" && ["deleted", "suspend"].includes(String(body.action))) {
    await env.DATABASE.prepare("DELETE FROM github_connections WHERE installation_id=?").bind(installation.id).run()
    return Response.json({ accepted: true })
  }
  if (event !== "push" && event !== "pull_request") return Response.json({ ignored: true })
  const repository = record(body.repository)
  requireValue(typeof repository.id === "number" && Number.isSafeInteger(repository.id), "Invalid repository.")
  const connections = await env.DATABASE.prepare(
    "SELECT c.project_id,p.configuration,p.metadata FROM github_connections c JOIN projects p ON p.id=c.project_id WHERE c.installation_id=? AND c.repository_id=?"
  )
    .bind(installation.id, repository.id)
    .all<{ project_id: string; configuration: string; metadata: string }>()
  for (const project of connections.results) {
    const config = record(JSON.parse(project.configuration))
    if (config.mode === "multiplayer") continue
    const metadata = record(JSON.parse(project.metadata))
    let environment: string,
      commit: string,
      branch: string,
      title: string,
      pullRequest: number | null = null
    if (event === "push") {
      if (body.deleted === true) continue
      branch = String(body.ref).replace(/^refs\/heads\//, "")
      if (branch === (metadata.productionBranch ?? "main")) environment = "production"
      else if (config.sandbox && branch === (metadata.sandboxBranch ?? "develop")) environment = "sandbox"
      else continue
      commit = String(body.after)
      title = `Push to ${branch}`
    } else {
      const pr = record(body.pull_request)
      pullRequest = Number(body.number)
      requireValue(Number.isSafeInteger(pullRequest) && pullRequest > 0, "Invalid pull request.")
      environment = `preview-${pullRequest}`
      if (body.action === "closed") {
        await env.DATABASE.batch([
          env.DATABASE.prepare(
            "UPDATE environments SET enabled=0,current_release_id=NULL,generation=generation+1 WHERE project_id=? AND name=?"
          ).bind(project.project_id, environment),
          env.DATABASE.prepare("UPDATE github_events SET status='closed' WHERE project_id=? AND environment=?").bind(
            project.project_id,
            environment
          )
        ])
        continue
      }
      if (!config.previews || !["opened", "synchronize", "reopened"].includes(String(body.action))) continue
      const head = record(pr.head)
      if (record(head.repo).id !== repository.id) continue // Fork code is never built automatically.
      commit = String(head.sha)
      branch = String(head.ref)
      title = String(pr.title).slice(0, 200)
    }
    requireValue(/^[a-f0-9]{40}$/.test(commit), "Invalid Git commit.")
    await env.DATABASE.prepare(
      "INSERT OR IGNORE INTO github_events(id,project_id,kind,environment,commit_sha,title,branch,pull_request,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
    )
      .bind(
        `${deliveryId}:${project.project_id}`,
        project.project_id,
        event,
        environment,
        commit,
        title,
        branch,
        pullRequest,
        new Date().toISOString()
      )
      .run()
  }
  return Response.json({ accepted: true }, { status: 202 })
}
