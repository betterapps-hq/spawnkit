import type { ProjectState } from "./cloud-project-model"

export const PROJECT_STALE_MS = 60_000
const ACTIVE_REFRESH_MS = 5_000

export function projectRefreshInterval(state?: ProjectState): number | false {
  return state?.deployments.some((deployment) => ["queued", "building", "activating"].includes(deployment.status)) ||
    state?.previews.some(
      (preview) =>
        (preview.status === null && Date.now() - Date.parse(preview.updated) < 120_000) ||
        (preview.status !== null && ["queued", "building", "activating"].includes(preview.status))
    )
    ? ACTIVE_REFRESH_MS
    : false
}
