import { HttpError } from "./http"

export async function requireActiveProject(env: Env, projectId: string) {
  const active = await env.DATABASE.prepare("SELECT id FROM projects WHERE id=? AND lifecycle='active'")
    .bind(projectId)
    .first()
  if (!active) throw new HttpError(409, "project_deleting", "This project is being deleted.")
}

/** Deletion drains these leases before removing external resources. */
export async function withProjectResource<T>(env: Env, projectId: string, work: () => Promise<T>) {
  const id = crypto.randomUUID()
  const lease = await env.DATABASE.prepare(
    "INSERT INTO project_resource_operations(id,project_id,expires_at) SELECT ?,id,? FROM projects WHERE id=? AND lifecycle='active' RETURNING id"
  )
    .bind(id, Date.now() + 20 * 60_000, projectId)
    .first()
  if (!lease) throw new HttpError(409, "project_deleting", "This project is being deleted.")
  try {
    return await work()
  } finally {
    await env.DATABASE.prepare("DELETE FROM project_resource_operations WHERE id=?").bind(id).run()
  }
}

/** A late write cannot leave an object behind after a deletion fence. */
export async function putProjectArtifact(
  env: Env,
  projectId: string,
  key: string,
  bytes: Uint8Array,
  options?: R2PutOptions
) {
  if (!key.startsWith(`sources/${projectId}/`) && !key.startsWith(`releases/${projectId}/`))
    throw new Error("Invalid project artifact key")
  await withProjectResource(env, projectId, async () => {
    await env.ARTIFACTS.put(key, bytes, options)
    try {
      await requireActiveProject(env, projectId)
    } catch (error) {
      await env.ARTIFACTS.delete(key)
      throw error
    }
  })
}
