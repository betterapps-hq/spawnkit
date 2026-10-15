import type { Release } from "./model"

export function releaseLabel(release: Release | null | undefined) {
  return release ? (release.label ?? `v${release.number}`) : "—"
}
