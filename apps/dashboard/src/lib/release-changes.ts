import type { ReleaseChanges } from "@spawn/platform/releases"

export type LoadReleaseChanges = (
  projectId: string,
  from: string | undefined,
  to: string,
  signal: AbortSignal
) => Promise<ReleaseChanges>
export const loadReleaseChanges: LoadReleaseChanges = async (projectId, from, to, signal) => {
  const params = new URLSearchParams({ to, ...(from ? { from } : {}) })
  const response = await fetch(`/api/platform/v1/projects/${encodeURIComponent(projectId)}/release-changes?${params}`, {
    signal
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.message ?? "Changes could not be loaded.")
  return result as ReleaseChanges
}
