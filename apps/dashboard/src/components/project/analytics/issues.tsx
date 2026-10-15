import { ArrowLeft, ArrowUpRight, Archive, Check, CircleAlert, Search, UserRound } from "lucide-react"
import { useRef, useState } from "react"
import { CopyButton } from "../../copy-button"
import { SelectField } from "../../select-field"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import { AIInvestigation } from "./ai-investigation"
import type { Investigator } from "./investigation"
import {
  issueImpact,
  scopeDates,
  scopeWindow,
  number,
  percent,
  series,
  type AnalyticsData,
  type AnalyticsIssue,
  type AnalyticsSession,
  type AnalyticsScope,
  type IssueStatus
} from "./model"
import { ActivityChart, Blank, Breakdown, Panel, Spark, Tone } from "./primitives"

export function AnalyticsIssues({
  data,
  sessions,
  scope,
  onIssue
}: {
  data: AnalyticsData
  sessions: AnalyticsSession[]
  scope: AnalyticsScope
  onIssue: (id: string) => void
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("unresolved"),
    [priority, setPriority] = useState("all"),
    [sort, setSort] = useState("impact")
  const window = scopeWindow(data, scope)
  const all = issueImpact(data.issues, sessions)
  const issues = all.filter(
    (issue) =>
      (status === "all" || issue.status === status) &&
      (priority === "all" || issue.priority === priority) &&
      `${issue.id} ${issue.title} ${issue.message} ${issue.location} ${issue.owner}`
        .toLowerCase()
        .includes(search.toLowerCase())
  )
  if (sort === "recent")
    issues.sort(
      (a, b) =>
        Math.max(...b.sessions.map((session) => session.time)) - Math.max(...a.sessions.map((session) => session.time))
    )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Issues</h2>
          <p className="an-metadata mt-1 text-xs text-muted-foreground">
            <span>{all.filter((issue) => issue.status === "unresolved").length} unresolved groups</span>
            <span>{sessions.filter((session) => session.issueId).length} affected sessions</span>
          </p>
        </div>
      </div>
      <div className="an-filter-row">
        <div className="an-search">
          <Search />
          <Input
            aria-label="Search issues"
            placeholder="Search issues, owners, or files…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <SelectField
          className="w-36"
          label="Issue status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "unresolved", label: "Unresolved" },
            { value: "resolved", label: "Resolved" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All statuses" }
          ]}
        />
        <SelectField
          className="w-36"
          label="Issue priority"
          value={priority}
          onChange={setPriority}
          options={[
            { value: "all", label: "All priorities" },
            ...["High", "Medium", "Low"].map((value) => ({ value, label: value }))
          ]}
        />
        <SelectField
          className="w-44"
          label="Issue sorting"
          value={sort}
          onChange={setSort}
          options={[
            { value: "impact", label: "Most affected" },
            { value: "recent", label: "Last seen" }
          ]}
        />
      </div>
      <div className="an-panel">
        {issues.length ? (
          <div className="an-table-scroll">
            <table className="an-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>State</th>
                  <th>Trend</th>
                  <th>Sessions</th>
                  <th>Priority</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <button
                        className="an-issue-title"
                        aria-label={`Open ${issue.title}`}
                        onClick={() => onIssue(issue.id)}
                      >
                        <span className="an-error-square">
                          <CircleAlert className="size-4" />
                        </span>
                        <span>
                          <strong>{issue.title}</strong>
                          <small>{issue.message}</small>
                          <small className="an-metadata mt-1.5">
                            <span>{issue.id}</span>
                            <span>{issue.location}</span>
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <Tone
                        tone={issue.status === "resolved" ? "good" : issue.state === "Regressed" ? "bad" : "neutral"}
                      >
                        {issue.status === "unresolved" ? issue.state : issue.status}
                      </Tone>
                    </td>
                    <td>
                      <Spark
                        bad
                        values={series(issue.sessions, window.until, (window.until - window.from) / 3_600_000).map(
                          (point) => point.count
                        )}
                      />
                    </td>
                    <td className="tabular-nums">
                      <strong>{number(issue.sessions.length)}</strong>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {percent((issue.sessions.length / sessions.length) * 100)} of scope
                      </div>
                    </td>
                    <td>
                      <Tone
                        tone={issue.priority === "High" ? "bad" : issue.priority === "Medium" ? "warning" : "neutral"}
                      >
                        {issue.priority}
                      </Tone>
                    </td>
                    <td className="text-muted-foreground">{issue.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Blank
            title="No issues match this view"
            description="Try another filter."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("")
                  setStatus("all")
                  setPriority("all")
                }}
              >
                Clear issue filters
              </Button>
            }
          />
        )}
        <div className="an-panel-footer">
          {issues.length} of {all.length} issues
        </div>
      </div>
    </div>
  )
}

export function IssueInvestigation({
  issue,
  activity,
  sessions,
  data,
  scope,
  canEdit,
  investigator,
  active = true,
  backLabel = "Back to issues",
  onBack,
  onUpdate,
  onSession,
  onTrace
}: {
  issue: AnalyticsIssue
  activity: string[]
  sessions: AnalyticsSession[]
  data: AnalyticsData
  scope: AnalyticsScope
  canEdit: boolean
  investigator?: Investigator | null | undefined
  active?: boolean
  backLabel?: string
  onBack: () => void
  onUpdate: (id: string, patch: Partial<AnalyticsIssue>) => void
  onSession: (session: AnalyticsSession) => void
  onTrace: (session: AnalyticsSession, operation?: "saveMs" | "loadMs" | "frameMs") => void
}) {
  const window = scopeWindow(data, scope)
  const affected = sessions.filter((session) => session.issueId === issue.id)
  const [view, setView] = useState("stack")
  const evidenceRef = useRef<HTMLDivElement>(null)
  const latest = affected[0]
  function updateStatus(status: IssueStatus) {
    onUpdate(issue.id, { status })
  }
  const brief = `${issue.id}: ${issue.title}\n${issue.message}\nScope: ${scope.environment}, ${scopeDates(scope)}, release ${scope.release}\nAffected sessions: ${affected.length}\nLocation: ${issue.location}\nHypothesis (unverified): ${issue.hypothesis}`
  return (
    <div className="space-y-5">
      <button className="an-text-link" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {backLabel}
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <Tone tone="neutral">{issue.id}</Tone>
            <Tone tone={issue.status === "resolved" ? "good" : "bad"}>
              {issue.status === "unresolved" ? issue.state : issue.status}
            </Tone>
            <Tone tone="warning">{issue.priority} priority</Tone>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{issue.title}</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{issue.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!canEdit}
            onClick={() => updateStatus(issue.status === "resolved" ? "unresolved" : "resolved")}
          >
            <Check className="size-4" />
            {issue.status === "resolved" ? "Reopen issue" : "Resolve issue"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canEdit}
            onClick={() => updateStatus(issue.status === "archived" ? "unresolved" : "archived")}
          >
            <Archive className="size-4" />
            {issue.status === "archived" ? "Unarchive" : "Archive"}
          </Button>
          <CopyButton value={brief} label="Copy investigation brief" compact />
        </div>
      </div>
      <div className="an-investigation-grid">
        <div className="min-w-0 space-y-5">
          <AIInvestigation
            request={{ issue, sessions, scope, context: "" }}
            investigator={investigator}
            canEdit={canEdit}
            active={active}
            onEvidence={(evidence) => {
              if (evidence.source === "trace") {
                const session = affected.find((session) => session.id === evidence.sessionId)
                if (session) onTrace(session, evidence.operation)
              } else {
                setView(evidence.source === "sessions" ? "sessions" : "stack")
                requestAnimationFrame(() => {
                  evidenceRef.current?.focus({ preventScroll: true })
                  evidenceRef.current?.scrollIntoView({ block: "start" })
                })
              }
            }}
          />
          <Panel title="Occurrences" action={<Tone>{affected.length} sessions</Tone>}>
            <ActivityChart points={series(affected, window.until, (window.until - window.from) / 3_600_000)} />
          </Panel>
          <div ref={evidenceRef} tabIndex={-1} className="an-evidence-section scroll-mt-24 outline-none">
            <Tabs value={view} onValueChange={setView}>
              <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="stack">Stack trace</TabsTrigger>
                <TabsTrigger value="sessions">
                  Affected sessions <span className="an-count">{affected.length}</span>
                </TabsTrigger>
                <TabsTrigger value="activity">
                  Activity <span className="an-count">{activity.length}</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="stack" className="space-y-4 pt-2">
                <div className="an-panel">
                  <div className="an-panel-heading">
                    <div>
                      <h3>Exception stack</h3>
                    </div>
                    <Tone tone="purple">JavaScript</Tone>
                  </div>
                  <div className="an-stack-frame" data-active="true">
                    <span>{issue.location}</span>
                    <Tone tone={issue.category === "Error" ? "bad" : "warning"}>
                      {issue.category === "Error" ? "Exception" : "Slow frame"}
                    </Tone>
                  </div>
                  <div className="an-code" aria-label="Source context">
                    {issue.source.map((line, index) => (
                      <div
                        key={index}
                        data-highlight={
                          issue.sourceStartLine !== undefined &&
                          issue.sourceStartLine + index === Number(issue.location.split(":").at(-1))
                        }
                      >
                        <span>{issue.sourceStartLine === undefined ? "" : issue.sourceStartLine + index}</span>
                        <code>{line}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="sessions">
                <div className="an-panel mt-2">
                  {affected.slice(0, 8).map((session) => (
                    <button className="an-session-row" key={session.id} onClick={() => onSession(session)}>
                      <UserRound className="size-4 text-muted-foreground" />
                      <span className="font-mono text-xs">{session.id}</span>
                      <span className="an-metadata text-xs text-muted-foreground">
                        <span>{session.device}</span>
                        <span>{session.scene}</span>
                      </span>
                      <span className="ml-auto text-xs">{session.release}</span>
                      <ArrowUpRight className="size-3.5" />
                    </button>
                  ))}
                  {!affected.length && (
                    <Blank title="No occurrences in this scope" description="Choose another release or time range." />
                  )}
                  <div className="an-panel-footer">
                    Showing the latest {Math.min(8, affected.length)} of {affected.length} affected sessions
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="activity">
                <div className="an-panel mt-2 p-5">
                  {activity.length ? (
                    activity.map((entry, index) => (
                      <p className="border-l-2 border-primary/30 py-3 pl-4 text-sm" key={index}>
                        {entry}
                        <span className="ml-3 text-xs text-muted-foreground">Just now</span>
                      </p>
                    ))
                  ) : (
                    <p className="text-sm">No activity yet.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <aside className="space-y-4">
          <Panel title="Ownership">
            <div className="space-y-4 px-5 pb-5">
              <label className="block space-y-2 text-xs text-muted-foreground">
                Assigned team
                <select
                  aria-label="Assign issue"
                  disabled={!canEdit}
                  value={issue.owner}
                  onChange={(event) => {
                    onUpdate(issue.id, { owner: event.target.value })
                  }}
                  className="an-native-select w-full"
                >
                  {["Unassigned", "Gameplay", "Rendering", "Multiplayer", "Platform"].map((team) => (
                    <option key={team}>{team}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-xs text-muted-foreground">
                Priority
                <select
                  aria-label="Change issue priority"
                  disabled={!canEdit}
                  value={issue.priority}
                  onChange={(event) =>
                    onUpdate(issue.id, { priority: event.target.value as AnalyticsIssue["priority"] })
                  }
                  className="an-native-select w-full"
                >
                  {["High", "Medium", "Low"].map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
            </div>
          </Panel>
          <Panel title="Impact">
            <div className="px-5 pb-5">
              <div className="text-3xl font-semibold tabular-nums">{number(affected.length)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                affected sessions ({percent(sessions.length ? (affected.length / sessions.length) * 100 : 0)} of
                recorded sessions)
              </p>
              <dl className="an-detail-list mt-5">
                <div>
                  <dt>First release</dt>
                  <dd>{issue.firstRelease}</dd>
                </div>
                <div>
                  <dt>Last seen</dt>
                  <dd>{latest ? new Date(latest.time).toISOString().slice(11, 19) + " UTC" : "Outside scope"}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{issue.category}</dd>
                </div>
              </dl>
            </div>
          </Panel>
          <Panel title="Device breakdown">
            <Breakdown
              total={affected.length}
              values={["Desktop", "Mobile", "Tablet"].map((label) => ({
                label,
                value: affected.filter((session) => session.device === label).length
              }))}
            />
          </Panel>
          {latest && (
            <Button className="w-full" variant="outline" onClick={() => onSession(latest)}>
              Open latest session <ArrowUpRight className="size-4" />
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}
