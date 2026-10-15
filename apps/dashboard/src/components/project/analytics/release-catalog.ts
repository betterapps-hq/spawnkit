import type { AnalyticsData, AnalyticsRelease, AnalyticsSession } from "./model"

export type ReleaseEntry = AnalyticsRelease & { firstObservedAt?: number }
const versions = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

/** Explicit release dates win; observed-only versions remain selectable without inventing a deploy date. */
export function releaseCatalog(data: Pick<AnalyticsData, "releases" | "sessions">): ReleaseEntry[] {
  const catalog = new Map<string, ReleaseEntry>(
    (data.releases ?? []).map((release) => [release.version, { ...release }])
  )
  for (const session of data.sessions) {
    const release = catalog.get(session.release) ?? { version: session.release }
    release.firstObservedAt = Math.min(release.firstObservedAt ?? Infinity, session.time)
    catalog.set(session.release, release)
  }
  const time = (release: ReleaseEntry) => release.createdAt ?? release.firstObservedAt ?? -Infinity
  return [...catalog.values()].sort((a, b) => time(b) - time(a) || versions.compare(b.version, a.version))
}

export function searchReleases(releases: ReleaseEntry[], query: string) {
  const term = query.trim().toLowerCase()
  if (!term) return releases
  const rank = (release: ReleaseEntry) => {
    const version = release.version.toLowerCase(),
      commit = release.commit?.toLowerCase() ?? ""
    if (version === term || commit === term) return 0
    if (version.startsWith(term) || commit.startsWith(term)) return 1
    if (version.includes(term) || commit.includes(term)) return 2
    return 3
  }
  return releases.filter((release) => rank(release) < 3).sort((a, b) => rank(a) - rank(b))
}

/** Bound the adoption chart without losing its denominator or dropping older clients. */
export function releaseAdoption(sessions: AnalyticsSession[]) {
  const counts = new Map<string, number>()
  for (const session of sessions) counts.set(session.release, (counts.get(session.release) ?? 0) + 1)
  const rows = [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || versions.compare(b.label, a.label))
  return rows.length <= 5
    ? rows
    : [
        ...rows.slice(0, 5),
        { label: `Other releases (${rows.length - 5})`, value: rows.slice(5).reduce((sum, row) => sum + row.value, 0) }
      ]
}
