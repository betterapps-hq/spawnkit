import { createHash } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { agentAccountRoute, agentAuthorizationRoute, maintainAgentAuthorization } from "./agent-authorization"
import { agentIssuer } from "./agent-credentials"
import { authenticate } from "./auth"
import { communityRole } from "./community-access"
import { reportsRoute, submitReport } from "./community-reports"
import { acceptInvitation, deliverInvitations, teamRoute } from "./community-team"
import { deploymentRoute } from "./deployments"
import { domainRoute } from "./domains"
import { mutateFeedback, personalFeedback, publicFeedback } from "./game-feedback"
import { adminGamesRoute, isPlatformAdmin, publicGames, publicGameSitemap, publicGameBrowse } from "./game-submissions"
import {
  connectGitHub,
  githubCallback,
  githubConfigured,
  githubWebhook,
  queueGitHubBuild,
  retryGitHubPreview
} from "./github"
import { projectHostname, projectSlug, reserveProjectSlug } from "./hosting"
import { boundedBody, HttpError, jsonBody, record, requireValue } from "./http"
import { maintainPlatform } from "./maintenance"
import { mediaWarnings } from "./media-warnings"
import { moderationRoute } from "./moderation"
import { deleteProject, deletionStatus, processProjectDeletions } from "./project-deletion"
import { putProjectArtifact, withProjectResource } from "./project-lifecycle"
import { projectListing } from "./project-listing"
import { updateListingMedia } from "./project-listing-media"
import { projectSummaries } from "./project-summaries"
import { releaseChanges } from "./release-changes"
import { environments, projects, projectHostnames, uploads } from "./schema"
import { decodeSource, MAX_SOURCE_BYTES } from "./source"
import { telemetryRoute } from "./telemetry"
export { ContainerProxy } from "@cloudflare/sandbox"
export { Sandbox } from "./sandbox"
export { BuildJob } from "./build-job"
export { GameActivity } from "./game-activity-entrypoint"
export { CreatorMetrics } from "./creator-metrics-entrypoint"
import { creatorMetrics } from "./creator-metrics"

const idPattern = /^[A-Za-z0-9_-]{1,128}$/

async function route(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname === "/health" && request.method === "GET") return Response.json({ status: "ok" })
  if (url.pathname === "/api/platform/v1/github/webhook" && request.method === "POST")
    return githubWebhook(request, env)
  if (
    url.hostname === "hooks.spawnkit.cloud" ||
    url.hostname === "hooks.staging.spawnkit.cloud" ||
    url.hostname === "hooks.local.spawnkit.cloud" ||
    url.hostname.endsWith(".hooks.local.spawnkit.cloud")
  )
    throw new HttpError(404, "not_found", "Not found.")
  if (request.method === "GET" && url.pathname === "/api/platform/v1/games")
    return publicGames(env, url.searchParams.get("project") ?? undefined)
  if (request.method === "GET" && url.pathname === "/api/platform/v1/games/sitemap")
    return publicGameSitemap(env, url.searchParams.get("page"))
  if (request.method === "GET" && url.pathname === "/api/platform/v1/games/browse")
    return publicGameBrowse(env, url.searchParams)
  const feedback =
    /^\/api\/platform\/v1\/games\/([A-Za-z0-9_-]{1,128})\/(feedback|rating|comments)(?:\/([A-Za-z0-9_-]{1,128}))?$/.exec(
      url.pathname
    )
  if (feedback && request.method === "GET" && feedback[2] === "feedback" && !feedback[3])
    return publicFeedback(request, env, feedback[1]!)
  const agentResponse = await agentAuthorizationRoute(request, env)
  if (agentResponse) return agentResponse
  const ownerId = await authenticate(request, env)
  const limiter = request.method === "GET" || request.method === "HEAD" ? env.API_READ_LIMIT : env.API_WRITE_LIMIT
  if (limiter && !(await limiter.limit({ key: ownerId })).success)
    throw new HttpError(429, "rate_limited", "Too many requests. Please retry in a minute.")
  const accountResponse = await agentAccountRoute(request, env, ownerId)
  if (accountResponse) return accountResponse
  if (url.pathname === "/api/platform/v1/admin/creator-metrics" && request.method === "GET") {
    if (!(await isPlatformAdmin(env, ownerId))) throw new HttpError(403, "forbidden", "Administrator access required.")
    return Response.json(await creatorMetrics(env), { headers: { "cache-control": "no-store" } })
  }
  const reportMatch = /^\/api\/platform\/v1\/games\/([A-Za-z0-9_-]{1,128})\/reports$/.exec(url.pathname)
  if (reportMatch) return submitReport(request, env, ownerId, reportMatch[1]!)
  const reportsMatch = /^\/api\/platform\/v1\/admin\/reports(?:\/([A-Za-z0-9_-]{1,128}))?$/.exec(url.pathname)
  if (reportsMatch) return reportsRoute(request, env, ownerId, reportsMatch[1])
  if (feedback) {
    if (request.method === "GET" && feedback[2] === "feedback" && feedback[3] === "me")
      return personalFeedback(env, feedback[1]!, ownerId)
    return mutateFeedback(request, env, feedback[1]!, ownerId, feedback[2]!, feedback[3])
  }
  if (url.pathname === "/api/platform/v1/github/callback" && request.method === "GET")
    return githubCallback(request, env, ownerId)
  if (url.pathname === "/api/platform/v1/me" && request.method === "GET")
    return Response.json({
      admin: await isPlatformAdmin(env, ownerId),
      role: await communityRole(env, ownerId),
      userId: ownerId
    })
  if (url.pathname === "/api/platform/v1/team/accept") return acceptInvitation(request, env, ownerId)
  const teamMatch =
    /^\/api\/platform\/v1\/admin\/team\/(members|invitations|history)(?:\/([A-Za-z0-9_-]{1,128}))?$/.exec(url.pathname)
  if (teamMatch) return teamRoute(request, env, ownerId, teamMatch[1]!, teamMatch[2])
  const adminMatch = /^\/api\/platform\/v1\/admin\/submissions(?:\/([A-Za-z0-9_-]+))?$/.exec(url.pathname)
  if (adminMatch) return adminGamesRoute(request, env, ownerId, adminMatch[1])
  const manageMatch =
    /^\/api\/platform\/v1\/admin\/manage\/(summary|games|comments|history|decisions)(?:\/([A-Za-z0-9_-]{1,128}))?$/.exec(
      url.pathname
    )
  if (manageMatch) return moderationRoute(request, env, ownerId, manageMatch[1]!, manageMatch[2])
  const db = drizzle(env.DATABASE)
  const path = url.pathname
    .replace(/^\/api\/platform\/v1/, "")
    .split("/")
    .filter(Boolean)
  const [resource, projectId, operation, resourceId] = path
  if (resource !== "projects") throw new HttpError(404, "not_found", "Not found.")
  if (projectId === "name-availability" && request.method === "GET") {
    const name = url.searchParams.get("name") ?? ""
    requireValue(name.trim().length > 0 && name.length <= 64, "Enter a game title of up to 64 characters.")
    const slug = projectSlug(name)
    const taken = await db
      .select({ slug: projectHostnames.slug })
      .from(projectHostnames)
      .where(eq(projectHostnames.slug, slug))
      .get()
    return Response.json({ available: !taken, slug }, { headers: { "cache-control": "no-store" } })
  }
  if (!projectId && request.method === "GET") {
    return Response.json({
      projects: await db
        .select()
        .from(projects)
        .where(and(eq(projects.ownerId, ownerId), sql`${projects.lifecycle} != 'deleted'`)),
      deletedProjectIds: (
        await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.ownerId, ownerId), eq(projects.lifecycle, "deleted")))
      ).map((row) => row.id),
      ...(url.searchParams.get("summary") === "true" ? { summaries: await projectSummaries(env, ownerId) } : {})
    })
  }
  if (!projectId && request.method === "POST") {
    const body = await jsonBody(request)
    const id = typeof body.id === "string" ? body.id : crypto.randomUUID()
    requireValue(idPattern.test(id), "Invalid project ID.")
    requireValue(
      typeof body.name === "string" && body.name.trim().length > 0 && body.name.length <= 64,
      "Enter a project name."
    )
    const configuration = record(body.configuration)
    requireValue(typeof configuration.sandbox === "boolean", "Choose the project environments.")
    const existing = await db.select().from(projects).where(eq(projects.id, id)).get()
    if (existing) {
      if (existing.ownerId !== ownerId) throw new HttpError(409, "id_unavailable", "Project ID is unavailable.")
      if (existing.lifecycle !== "active") throw new HttpError(410, "project_deleted", "This project has been deleted.")
      const slug = await reserveProjectSlug(env.DATABASE, id, existing.name)
      return Response.json({ ...existing, slug })
    }
    const now = new Date().toISOString()
    try {
      await db.batch([
        db.insert(projects).values({
          id,
          ownerId,
          name: body.name.trim(),
          configuration,
          metadata: record(body.metadata ?? {}),
          createdAt: now,
          updatedAt: now
        }),
        db.insert(environments).values([
          { id: `${id}:production`, projectId: id, name: "production", enabled: true },
          { id: `${id}:sandbox`, projectId: id, name: "sandbox", enabled: configuration.sandbox }
        ]),
        ...(body.requireUniqueName === true
          ? [db.insert(projectHostnames).values({ projectId: id, slug: projectSlug(body.name.trim()) })]
          : [])
      ])
    } catch (error) {
      if (
        body.requireUniqueName === true &&
        (await db
          .select()
          .from(projectHostnames)
          .where(eq(projectHostnames.slug, projectSlug(body.name.trim())))
          .get())
      )
        throw new HttpError(
          409,
          "name_unavailable",
          `The name "${body.name.trim()}" is already taken! Please choose a unique name.`
        )
      throw error
    }
    const slug = await reserveProjectSlug(env.DATABASE, id, body.name.trim())
    const provisioning = import("./provisioning")
      .then(({ provisionProjectDomain }) => provisionProjectDomain(env, id, slug))
      .catch(() => console.warn("initial_domain_provisioning_pending"))
    if (ctx) ctx.waitUntil(provisioning)
    else await provisioning
    return Response.json({ id, name: body.name.trim(), slug, configuration, revision: 1 }, { status: 201 })
  }
  requireValue(projectId && idPattern.test(projectId), "Invalid project ID.")
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .get()
  if (!project) throw new HttpError(404, "not_found", "Project not found.")
  if (!operation && request.method === "DELETE") return deleteProject(request, env, ownerId, projectId, ctx)
  if (operation === "deletion" && !resourceId && request.method === "GET")
    return Response.json(await deletionStatus(env, projectId))
  if (project.lifecycle !== "active") throw new HttpError(409, "project_deleting", "This project is being deleted.")
  if (operation === "listing" && resourceId === "media") return updateListingMedia(request, env, ownerId, projectId)
  if (operation === "listing" && !resourceId) return projectListing(request, env, ownerId, projectId)
  if (operation === "release-changes" && request.method === "GET") return releaseChanges(request, env, projectId)
  if (operation === "github" && resourceId === "connect" && request.method === "POST")
    return connectGitHub(env, ownerId, projectId, project.configuration)
  if (operation === "github" && resourceId === "deploy" && request.method === "POST") {
    requireValue(project.configuration.mode !== "multiplayer", "Multiplayer runtime deployment is not enabled.")
    return queueGitHubBuild(request, env, projectId)
  }
  if (operation === "previews" && resourceId && url.pathname.endsWith("/close") && request.method === "POST") {
    const preview = await env.DATABASE.prepare(
      "SELECT environment FROM github_events WHERE id=? AND project_id=? AND pull_request IS NOT NULL"
    )
      .bind(decodeURIComponent(resourceId), projectId)
      .first<{ environment: string }>()
    if (!preview) throw new HttpError(404, "not_found", "Preview not found.")
    await env.DATABASE.batch([
      env.DATABASE.prepare(
        "UPDATE environments SET enabled=0,current_release_id=NULL,generation=generation+1 WHERE project_id=? AND name=?"
      ).bind(projectId, preview.environment),
      env.DATABASE.prepare("UPDATE github_events SET status='closed' WHERE project_id=? AND environment=?").bind(
        projectId,
        preview.environment
      )
    ])
    return Response.json({ status: "closed" })
  }
  if (operation === "domains") return domainRoute(request, env, projectId, resourceId)
  if (operation === "previews" && resourceId && url.pathname.endsWith("/retry") && request.method === "POST")
    return retryGitHubPreview(env, projectId, decodeURIComponent(resourceId))
  if (operation === "telemetry")
    return withProjectResource(env, projectId, () => telemetryRoute(request, env, projectId, resourceId))
  if (operation === "state" && request.method === "GET") {
    const results = await env.DATABASE.batch([
      env.DATABASE.prepare(
        "SELECT e.name,e.enabled,e.current_release_id AS currentReleaseId,h.hostname FROM environments e LEFT JOIN hosting_slots h ON h.project_id=e.project_id AND h.environment=e.name WHERE e.project_id=?"
      ).bind(projectId),
      env.DATABASE.prepare(
        "SELECT r.id,r.build_id AS buildId,r.status,r.environment,r.created_at AS createdAt,r.artifact_digest AS artifactDigest,r.media_warnings AS mediaWarnings,r.url,(SELECT COUNT(*) FROM releases older WHERE older.project_id=r.project_id AND older.rowid<=r.rowid) AS versionNumber,g.commit_sha AS commitSha,g.branch,g.title AS sourceTitle FROM releases r LEFT JOIN github_events g ON g.deployment_id=r.build_id WHERE r.project_id=? AND (r.rowid IN (SELECT recent.rowid FROM releases recent WHERE recent.project_id=r.project_id ORDER BY recent.rowid DESC LIMIT 100) OR r.id IN (SELECT current_release_id FROM environments WHERE project_id=r.project_id AND enabled=1)) ORDER BY r.rowid DESC"
      ).bind(projectId),
      env.DATABASE.prepare(
        "SELECT id,release_id AS releaseId,environment,status,operation,expected_release_id AS previousReleaseId,created_at AS createdAt FROM deployments WHERE project_id=? ORDER BY created_at DESC LIMIT 100"
      ).bind(projectId),
      env.DATABASE.prepare(
        "SELECT l.sequence,l.message,l.created_at AS createdAt,d.environment,d.release_id AS releaseId FROM logs l JOIN deployments d ON d.id=l.deployment_id WHERE d.project_id=? ORDER BY l.sequence DESC LIMIT 500"
      ).bind(projectId),
      env.DATABASE.prepare(
        "SELECT hostname,environment,status,verification_token AS verificationToken FROM domains WHERE project_id=? ORDER BY created_at"
      ).bind(projectId),
      env.DATABASE.prepare("SELECT repository FROM github_connections WHERE project_id=?").bind(projectId),
      env.DATABASE.prepare(
        "SELECT g.id,g.pull_request AS number,g.title,g.branch,g.commit_sha AS commitSha,g.created_at AS updated,d.release_id AS versionId,e.current_release_id AS currentVersionId,COALESCE(d.status,g.status) AS status,h.hostname FROM github_events g LEFT JOIN deployments d ON d.id=g.deployment_id LEFT JOIN hosting_slots h ON h.project_id=g.project_id AND h.environment=g.environment LEFT JOIN environments e ON e.project_id=g.project_id AND e.name=g.environment WHERE g.project_id=? AND g.pull_request IS NOT NULL AND g.status!='closed' AND g.rowid=(SELECT MAX(latest.rowid) FROM github_events latest WHERE latest.project_id=g.project_id AND latest.environment=g.environment) ORDER BY g.rowid DESC LIMIT 100"
      ).bind(projectId)
    ])
    return Response.json({
      activity: (await env.DATABASE.prepare("SELECT views,plays FROM game_activity_totals WHERE project_id=?")
        .bind(projectId)
        .first()) ?? { views: 0, plays: 0 },
      environments: results[0]!.results,
      releases: results[1]!.results.map((release) => ({
        ...record(release),
        mediaWarnings: mediaWarnings(record(release).mediaWarnings)
      })),
      deployments: results[2]!.results,
      logs: results[3]!.results,
      domains: results[4]!.results,
      repository: results[5]!.results[0] ? record(results[5]!.results[0]).repository : null,
      previews: results[6]!.results,
      capabilities: { builds: env.BUILDS_ENABLED === "true", domains: true, github: githubConfigured(env) }
    })
  }
  if (operation && ["deployments", "promotions", "rollbacks"].includes(operation)) {
    if (request.method === "POST" && project.configuration.mode === "multiplayer")
      throw new HttpError(422, "unsupported_runtime", "Multiplayer runtime deployment is not enabled.")
    return deploymentRoute(request, env, projectId, ownerId, operation, resourceId)
  }
  if (!operation && request.method === "GET") {
    const rows = await db.select().from(environments).where(eq(environments.projectId, projectId))
    const address = await env.DATABASE.prepare("SELECT slug FROM project_hostnames WHERE project_id=?")
      .bind(projectId)
      .first<{ slug: string }>()
    return Response.json({
      ...project,
      ...(address ? { hostname: projectHostname(address.slug, "production", env.HOSTING_TEST === "true") } : {}),
      environments: Object.fromEntries(
        rows.map((row) => [row.name, { enabled: row.enabled, currentReleaseId: row.currentReleaseId }])
      )
    })
  }
  if (!operation && request.method === "PATCH") {
    const body = await jsonBody(request)
    const configuration = record(body.configuration)
    requireValue(
      typeof body.name === "string" && body.name.trim().length > 0 && body.name.length <= 64,
      "Enter a project name."
    )
    requireValue(
      Number.isInteger(body.revision) && typeof configuration.sandbox === "boolean",
      "Revision and environments are required."
    )
    const [, changed] = await db.batch([
      db
        .update(environments)
        .set({ enabled: configuration.sandbox })
        .where(
          and(
            eq(environments.projectId, projectId),
            eq(environments.name, "sandbox"),
            sql`EXISTS (SELECT 1 FROM projects WHERE id=${projectId} AND revision=${Number(body.revision)})`
          )
        ),
      db
        .update(projects)
        .set({
          name: body.name.trim(),
          configuration,
          metadata: record(body.metadata ?? {}),
          revision: Number(body.revision) + 1,
          updatedAt: new Date().toISOString()
        })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.revision, Number(body.revision)),
            eq(projects.lifecycle, "active")
          )
        )
        .returning()
    ])
    if (!changed.length) throw new HttpError(409, "conflict", "This project changed. Reload before saving.")
    return Response.json(changed[0])
  }
  if (operation === "uploads" && !resourceId && request.method === "POST") {
    const body = await jsonBody(request)
    requireValue(
      body.format === "spawn-source-v1" && typeof body.sha256 === "string" && /^[a-f0-9]{64}$/.test(body.sha256),
      "Invalid source format or digest."
    )
    requireValue(
      Number.isInteger(body.sizeBytes) && Number(body.sizeBytes) > 0 && Number(body.sizeBytes) <= MAX_SOURCE_BYTES,
      "Invalid source size."
    )
    const key = request.headers.get("idempotency-key")
    requireValue(key && /^[A-Za-z0-9_-]{1,128}$/.test(key), "An idempotency key is required.")
    const id = createHash("sha256").update(`${projectId}:upload:${key}`).digest("hex")
    await db
      .insert(uploads)
      .values({
        id,
        projectId,
        sha256: body.sha256,
        sizeBytes: Number(body.sizeBytes),
        status: "pending",
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
      })
      .onConflictDoNothing()
    const stored = await db
      .select()
      .from(uploads)
      .where(and(eq(uploads.id, id), eq(uploads.projectId, projectId)))
      .get()
    if (!stored || stored.sha256 !== body.sha256 || stored.sizeBytes !== Number(body.sizeBytes))
      throw new HttpError(409, "idempotency_conflict", "This request key was used for different source.")
    if (stored.expiresAt < new Date().toISOString())
      throw new HttpError(410, "upload_expired", "This upload expired. Start a new upload.")
    return Response.json({ id }, { status: 201 })
  }
  if (operation === "uploads" && resourceId && request.method === "PUT") {
    const upload = await db
      .select()
      .from(uploads)
      .where(and(eq(uploads.id, resourceId), eq(uploads.projectId, projectId)))
      .get()
    if (!upload || upload.expiresAt < new Date().toISOString())
      throw new HttpError(404, "upload_expired", "Upload not found or expired.")
    requireValue(request.headers.get("x-content-sha256") === upload.sha256, "Source digest mismatch.")
    const bytes = await boundedBody(request, MAX_SOURCE_BYTES)
    requireValue(bytes.length === upload.sizeBytes, "Source size mismatch.")
    decodeSource(bytes, upload.sha256)
    await putProjectArtifact(env, projectId, `sources/${projectId}/${resourceId}.gz`, bytes, { sha256: upload.sha256 })
    await db.update(uploads).set({ status: "ready" }).where(eq(uploads.id, resourceId))
    return Response.json({ id: resourceId, sha256: upload.sha256, sizeBytes: bytes.length })
  }
  if (operation === "releases" && request.method === "GET") {
    const cursor = Number(url.searchParams.get("cursor") ?? Number.MAX_SAFE_INTEGER)
    requireValue(Number.isSafeInteger(cursor) && cursor > 0, "Invalid release cursor.")
    const rows = await env.DATABASE.prepare(
      "SELECT rowid AS cursor,id, build_id AS buildId, status, environment, created_at AS createdAt, url FROM releases WHERE project_id = ? AND rowid<? ORDER BY rowid DESC LIMIT 100"
    )
      .bind(projectId, cursor)
      .all<{ cursor: number }>()
    return Response.json({
      releases: rows.results,
      ...(rows.results.length === 100 ? { nextCursor: String(rows.results.at(-1)!.cursor) } : {})
    })
  }
  throw new HttpError(404, "not_found", "Not found.")
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(maintainAgentAuthorization(env))
    ctx.waitUntil(deliverInvitations(env))
    ctx.waitUntil(processProjectDeletions(env))
    const { processBuildQueue } = await import("./build-queue")
    await processBuildQueue(env)
    await maintainPlatform(env)
    const { processGitHubEvents } = await import("./github-jobs")
    await processGitHubEvents(env)
  },
  async fetch(request, env, ctx?: ExecutionContext) {
    try {
      const result = await route(request, env, ctx)
      const response = new Response(result.body, result)
      response.headers.set("cache-control", "no-store")
      response.headers.set("x-content-type-options", "nosniff")
      return response
    } catch (error) {
      if (error instanceof HttpError)
        return Response.json(
          { error: { code: error.code, message: error.message } },
          {
            status: error.status,
            headers: {
              "cache-control": "no-store",
              ...(error.status === 429 ? { "retry-after": "60" } : {}),
              ...(error.status === 401
                ? {
                    "www-authenticate": `Bearer resource_metadata="${agentIssuer(env)}/.well-known/oauth-protected-resource"`
                  }
                : {})
            }
          }
        )
      console.error(
        JSON.stringify({
          event: "request_failed",
          requestId: crypto.randomUUID(),
          errorType: error instanceof Error ? error.name : "unknown"
        })
      )
      return Response.json(
        { error: { code: "internal_error", message: "The request could not be completed." } },
        { status: 500, headers: { "cache-control": "no-store" } }
      )
    }
  }
} satisfies ExportedHandler<Env>
