/** Only current releases are needed for account cards; histories and logs stay project-scoped. */
export async function projectSummaries(env: Env, ownerId: string) {
  const rows = await env.DATABASE.prepare(
    `SELECT e.project_id AS projectId,e.name,e.enabled,e.current_release_id AS currentReleaseId,h.hostname,
      r.id,r.build_id AS buildId,r.status,r.environment,r.created_at AS createdAt,r.artifact_digest AS artifactDigest,r.url,
      (SELECT COUNT(*) FROM releases older WHERE older.project_id=r.project_id AND older.rowid<=r.rowid) AS versionNumber
      FROM environments e JOIN projects p ON p.id=e.project_id
      LEFT JOIN hosting_slots h ON h.project_id=e.project_id AND h.environment=e.name
      LEFT JOIN releases r ON r.id=e.current_release_id AND r.project_id=e.project_id
      WHERE p.owner_id=? AND e.name IN ('production','sandbox')`
  )
    .bind(ownerId)
    .all<{
      projectId: string
      name: string
      enabled: number
      currentReleaseId: string | null
      hostname: string | null
      id: string | null
      buildId: string
      status: string
      environment: string
      createdAt: string
      artifactDigest: string | null
      url: string | null
      versionNumber: number
    }>()
  return rows.results
}
