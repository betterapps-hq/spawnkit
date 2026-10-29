import { BUILD_CONCURRENCY, BUILD_MAX_ATTEMPTS } from "../build-policy"
import { HttpError } from "./http"

export interface BuildReservation {
  deployment_id: string
  reserved: number
  finished: number
  attempts: number
  available_at: number
  outcome: "retry" | "failed" | "activate" | null
}

export async function buildReservation(env: Env, id: string) {
  return env.DATABASE.prepare("SELECT * FROM build_queue WHERE deployment_id=?").bind(id).first<BuildReservation>()
}

async function wakeBuild(env: Env, id: string) {
  try {
    await env.BUILD_JOBS.getByName(id).start(id)
    // Rotate long HTTPS waits through the bounded recovery sweep.
    await env.DATABASE.prepare("UPDATE deployments SET updated_at=? WHERE id=? AND status='activating'")
      .bind(new Date().toISOString(), id)
      .run()
  } catch {
    // The reservation is durable. The minute sweep retries this delivery.
    console.error(JSON.stringify({ event: "build_dispatch_pending", deploymentId: id }))
  }
}

export async function dispatchBuilds(env: Env) {
  if (env.BUILDS_ENABLED !== "true") return
  for (let slot = 0; slot < BUILD_CONCURRENCY; slot++) {
    // One SQL write selects AND reserves. Concurrent API/cron/completion calls
    // cannot over-admit, and no expiring lease can evict a still-running build.
    const job = await env.DATABASE.prepare(
      `UPDATE build_queue SET reserved=1,attempts=attempts+1,last_started_at=?,
         last_started_order=(SELECT COALESCE(MAX(last_started_order),0)+1 FROM build_queue)
       WHERE deployment_id=(
         SELECT q.deployment_id FROM build_queue q JOIN deployments d ON d.id=q.deployment_id
         WHERE q.reserved=0 AND q.finished=0 AND q.available_at<=? AND d.status='queued'
         ORDER BY
           (SELECT COUNT(*) FROM build_queue active WHERE active.owner_id=q.owner_id AND active.reserved=1),
           COALESCE((SELECT MAX(served.last_started_order) FROM build_queue served WHERE served.owner_id=q.owner_id),0),
           q.enqueued_at,q.deployment_id LIMIT 1
       ) AND (SELECT COUNT(*) FROM build_queue WHERE reserved=1) < ?
       RETURNING deployment_id`
    )
      .bind(new Date().toISOString(), Date.now(), BUILD_CONCURRENCY)
      .first<{ deployment_id: string }>()
    if (!job) break
    await wakeBuild(env, job.deployment_id)
  }
}

export async function enqueueBuild(env: Env, id: string) {
  await env.DATABASE.prepare(
    `INSERT INTO build_queue(deployment_id,owner_id,enqueued_at)
     SELECT d.id,p.owner_id,d.created_at FROM deployments d JOIN projects p ON p.id=d.project_id
     WHERE d.id=? AND d.status='queued' AND d.operation='deployments'
     ON CONFLICT(deployment_id) DO NOTHING`
  )
    .bind(id)
    .run()
  await dispatchBuilds(env)
}

export async function processBuildQueue(env: Env) {
  // Recover the gap between accepting a deployment and dispatching its job.
  await env.DATABASE.prepare(
    `INSERT INTO build_queue(deployment_id,owner_id,enqueued_at,reserved,attempts,last_started_at)
     SELECT d.id,p.owner_id,d.created_at,d.status != 'queued',d.status != 'queued',
            CASE WHEN d.status != 'queued' THEN d.updated_at END
     FROM deployments d JOIN projects p ON p.id=d.project_id
     WHERE d.operation='deployments' AND d.status IN ('queued','building','activating')
     ON CONFLICT(deployment_id) DO NOTHING`
  ).run()
  const recover = await env.DATABASE.prepare(
    `SELECT d.id FROM deployments d JOIN build_queue q ON q.deployment_id=d.id
     WHERE q.reserved=1 OR d.status='activating' ORDER BY q.reserved DESC,d.updated_at,d.id LIMIT 20`
  ).all<{ id: string }>()
  for (const job of recover.results) await wakeBuild(env, job.id)
  await dispatchBuilds(env)
}

/** Only infrastructure failures retry; invalid source and failed commands do not. */
export function buildRetryDelay(error: unknown, attempt: number): number | null {
  if (attempt >= BUILD_MAX_ATTEMPTS) return null
  if (error instanceof HttpError) {
    if (error.code === "build_budget_exhausted" || (error.status < 500 && ![408, 429].includes(error.status)))
      return null
  } else {
    if (!error || typeof error !== "object") return null
    const fault = error as { name?: string; code?: string; message?: string; retryable?: boolean; overloaded?: boolean }
    if (fault.retryable === false) return null
    const transient =
      fault.retryable === true ||
      fault.overloaded === true ||
      ["ContainerUnavailableError", "RPCTransportError"].includes(fault.name ?? "") ||
      ["CONTAINER_UNAVAILABLE", "RPC_TRANSPORT_ERROR", "ECONNRESET", "ETIMEDOUT"].includes(fault.code ?? "") ||
      /max(?:imum)?.*(?:instances|containers)|container.*capacity|capacity.*container|durable object.*(?:reset|overloaded)|network connection lost/i.test(
        fault.message ?? ""
      )
    if (!transient) return null
  }
  return Math.min(30_000 * 2 ** Math.max(0, attempt - 1), 300_000)
}

/** Called only after container destruction succeeds; all writes commit together. */
export async function finishBuildAttempt(env: Env, job: BuildReservation, releaseId: string) {
  const now = new Date().toISOString()
  const status = job.outcome === "retry" ? "queued" : job.outcome === "activate" ? "activating" : "failed"
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      `UPDATE deployments SET status=?,updated_at=? WHERE id=?
       AND status NOT IN ('succeeded','failed','superseded')
       AND EXISTS(SELECT 1 FROM build_queue WHERE deployment_id=? AND reserved=1 AND attempts=?)`
    ).bind(status, now, job.deployment_id, job.deployment_id, job.attempts),
    env.DATABASE.prepare(
      `UPDATE releases SET status=? WHERE id=? AND status != 'ready'
       AND EXISTS(SELECT 1 FROM build_queue WHERE deployment_id=? AND reserved=1 AND attempts=? AND outcome IN ('failed','retry'))`
    ).bind(job.outcome === "retry" ? "queued" : "failed", releaseId, job.deployment_id, job.attempts),
    env.DATABASE.prepare(
      "UPDATE build_queue SET reserved=0,finished=?,outcome=NULL WHERE deployment_id=? AND reserved=1 AND attempts=?"
    ).bind(job.outcome === "retry" ? 0 : 1, job.deployment_id, job.attempts)
  ])
  await dispatchBuilds(env)
}
