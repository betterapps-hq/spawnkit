import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { health, number, percent, type AnalyticsData, type AnalyticsSession } from "./model"
import { Blank, Breakdown, Panel } from "./primitives"
import { releaseAdoption, searchReleases, type ReleaseEntry } from "./release-catalog"

const PAGE_SIZE = 10
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

export function ReleaseHealth({
  data,
  sessions,
  catalog,
  onRelease,
  onCompare
}: {
  data: AnalyticsData
  sessions: AnalyticsSession[]
  catalog: ReleaseEntry[]
  onRelease: (version: string) => void
  onCompare: (version: string, trigger: HTMLButtonElement) => void
}) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const matches = useMemo(() => searchReleases(catalog, query), [catalog, query])
  const offset = Math.min(page, Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1)) * PAGE_SIZE
  const adoption = useMemo(() => releaseAdoption(sessions), [sessions])
  const cohorts = useMemo(() => {
    const groups = new Map<string, AnalyticsSession[]>()
    for (const session of sessions) {
      const group = groups.get(session.release) ?? []
      group.push(session)
      groups.set(session.release, group)
    }
    return new Map(
      [...groups].map(([version, group]) => [
        version,
        {
          ...health(group),
          newIssues: data.issues.filter(
            (issue) => issue.firstRelease === version && group.some((session) => session.issueId === issue.id)
          ).length
        }
      ])
    )
  }, [sessions, data.issues])
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Release health</h2>
      <div className="an-release-health-layout">
        <section className="an-panel" aria-label="Release history">
          <div className="an-release-history-search an-search">
            <Search />
            <Input
              aria-label="Search release history"
              placeholder="Version or commit…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
            />
          </div>
          {matches.length ? (
            <table className="an-release-history">
              <caption className="sr-only">Releases, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Release</th>
                  <th scope="col">Sessions</th>
                  <th scope="col">Issue-free</th>
                  <th scope="col">New issues</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {matches.slice(offset, offset + PAGE_SIZE).map((release) => {
                  const stats = cohorts.get(release.version)
                  return (
                    <tr key={release.version}>
                      <th scope="row">
                        <button
                          className="an-text-link an-release-version"
                          aria-label={`View issues in ${release.version}`}
                          onClick={() => onRelease(release.version)}
                        >
                          {release.version}
                        </button>
                        <span className="an-release-date">
                          {release.createdAt !== undefined
                            ? date.format(release.createdAt)
                            : release.firstObservedAt !== undefined
                              ? `First seen ${date.format(release.firstObservedAt)}`
                              : ""}
                        </span>
                      </th>
                      <td data-label="Sessions">{number(stats?.sessions ?? 0)}</td>
                      <td data-label="Issue-free">{stats ? percent(stats.errorFree) : "—"}</td>
                      <td data-label="New issues">
                        {stats ? (
                          <span className={stats.newIssues ? "an-negative" : "text-muted-foreground"}>
                            {stats.newIssues}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-normal text-muted-foreground"
                          aria-label={`Compare ${release.version}`}
                          disabled={catalog.length < 2}
                          onClick={(event) => onCompare(release.version, event.currentTarget)}
                        >
                          Compare
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <Blank title="No matching releases" description="Try another version or commit." />
          )}
          <div className="an-release-picker-footer">
            <output aria-live="polite">
              {matches.length
                ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, matches.length)} of ${number(matches.length)}`
                : "0 releases"}
            </output>
            {matches.length > PAGE_SIZE && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Previous release page"
                  disabled={offset === 0}
                  onClick={() => setPage(offset / PAGE_SIZE - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Next release page"
                  disabled={offset + PAGE_SIZE >= matches.length}
                  onClick={() => setPage(offset / PAGE_SIZE + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        </section>
        <Panel title="Release adoption" subtitle="Session share">
          {sessions.length ? (
            <Breakdown total={sessions.length} values={adoption} />
          ) : (
            <Blank title="No matching sessions" description="Try a wider date range." />
          )}
        </Panel>
      </div>
    </div>
  )
}
