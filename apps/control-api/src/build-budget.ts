import { HttpError } from "./http"

/** One atomic INSERT arbitrates concurrent CLI and GitHub builds across all owner projects. */
export async function claimBuildBudget(env: Env, deploymentId: string, projectId: string) {
  const prior = await env.DATABASE.prepare("SELECT deployment_id FROM build_budget_claims WHERE deployment_id=?")
    .bind(deploymentId)
    .first()
  if (prior) return
  const day = new Date().toISOString().slice(0, 10)
  const ownerLimit = Number(env.BUILD_DAILY_OWNER_LIMIT ?? 50)
  const platformLimit = Number(env.BUILD_DAILY_PLATFORM_LIMIT ?? 200)
  if (![ownerLimit, platformLimit].every((limit) => Number.isSafeInteger(limit) && limit > 0))
    throw new Error("Invalid build budget configuration")
  const claimed = await env.DATABASE.prepare(
    `INSERT INTO build_budget_claims(deployment_id,owner_id,day)
     SELECT ?,p.owner_id,? FROM projects p WHERE p.id=?
       AND (SELECT COUNT(*) FROM build_budget_claims b WHERE b.owner_id=p.owner_id AND b.day=?) < ?
       AND (SELECT COUNT(*) FROM build_budget_claims b WHERE b.day=?) < ?
     ON CONFLICT(deployment_id) DO NOTHING RETURNING deployment_id`
  )
    .bind(deploymentId, day, projectId, day, ownerLimit, day, platformLimit)
    .first()
  // A duplicate delivery can race the initial read; it must reuse the original claim.
  const concurrentClaim =
    !claimed &&
    (await env.DATABASE.prepare("SELECT deployment_id FROM build_budget_claims WHERE deployment_id=?")
      .bind(deploymentId)
      .first())
  if (!claimed && !concurrentClaim)
    throw new HttpError(
      429,
      "build_budget_exhausted",
      "Daily build allowance reached. Retry after 00:00 UTC; the live game is unchanged."
    )
}
