import { ArrowLeft, Bell, Code2, Database, RefreshCw } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPeriod, periodBounds } from "../../../lib/date-range"
import { DateRangePicker } from "../../date-range-picker"
import { SelectField } from "../../select-field"
import { Button } from "../../ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet"
import { AnalyticsAlerts } from "./alerts"
import { AnalyticsExplore } from "./explore"
import type { Investigator } from "./investigation"
import { AnalyticsIssues, IssueInvestigation } from "./issues"
import {
  selectSessions,
  type AnalyticsData,
  type AnalyticsIssue,
  type AnalyticsScope,
  type AnalyticsSession,
  type AnalyticsTab
} from "./model"
import { AnalyticsOverview } from "./overview"
import { AnalyticsPerformance, TraceInvestigation } from "./performance"
import { AnalyticsPlayers } from "./players"
import { Blank } from "./primitives"
import { releaseCatalog } from "./release-catalog"
import { ReleasePicker } from "./release-picker"
import { AnalyticsReleases } from "./releases"
import { AnalyticsSessions, SessionInvestigation } from "./sessions"
import "./analytics.css"

type Detail =
  | { type: "issue"; id: string }
  | { type: "session"; session: AnalyticsSession }
  | { type: "trace"; session: AnalyticsSession; operation: "saveMs" | "loadMs" | "frameMs" }
type DetailEntry = { detail: Detail; scope: AnalyticsScope }
type AnalyticsState = "ready" | "empty" | "loading" | "unavailable"
const names: Record<AnalyticsTab, string> = {
  overview: "Overview",
  players: "Players",
  issues: "Issues",
  performance: "Performance",
  releases: "Releases",
  explore: "Events",
  sessions: "Sessions",
  alerts: "Alerts"
}
const healthViews: AnalyticsTab[] = ["issues", "performance", "releases"]
const exploreViews: AnalyticsTab[] = ["explore", "sessions"]
const initialScope: AnalyticsScope = { environment: "production", release: "all", hours: 24 }
const detailView = (detail: Detail): AnalyticsTab =>
  detail.type === "issue" ? "issues" : detail.type === "session" ? "sessions" : "performance"
const detailKey = (detail: Detail) =>
  detail.type === "issue"
    ? `issue-${detail.id}`
    : `${detail.type}-${detail.session.id}${detail.type === "trace" ? `-${detail.operation}` : ""}`

/** Data and service adapters are supplied by the host; fixture modules are imported only by stories. */
export function AnalyticsWorkspace({
  data: source,
  initialTab = "overview",
  initialIssue,
  initialSession,
  initialTrace,
  state = "ready",
  canEdit = true,
  investigator
}: {
  data: AnalyticsData
  initialTab?: AnalyticsTab
  initialIssue?: string
  initialSession?: string
  initialTrace?: string
  state?: AnalyticsState
  canEdit?: boolean
  investigator?: Investigator | null | undefined
}) {
  const baseTab = initialTab === "alerts" ? "overview" : initialTab
  const [tab, setTab] = useState<AnalyticsTab>(
    initialIssue ? "issues" : initialTrace ? "performance" : initialSession ? "sessions" : baseTab
  )
  const [visited, setVisited] = useState<AnalyticsTab[]>([baseTab])
  const [scope, setScope] = useState(initialScope)
  const [playerPeriod, setPlayerPeriod] = useState(() => createPeriod("last30", source.now, true))
  const [alertScope, setAlertScope] = useState(initialScope)
  const [issues, setIssues] = useState(source.issues)
  const [origin, setOrigin] = useState<{ tab: AnalyticsTab; scope: AnalyticsScope }>({
    tab: baseTab,
    scope: initialScope
  })
  const [trail, setTrail] = useState<DetailEntry[]>(() => {
    if (initialIssue) return [{ detail: { type: "issue", id: initialIssue }, scope: initialScope }]
    const session = source.sessions.find((session) => session.id === (initialSession ?? initialTrace))
    return session
      ? [
          {
            detail: initialTrace ? { type: "trace", session, operation: "saveMs" } : { type: "session", session },
            scope: initialScope
          }
        ]
      : []
  })
  const [lastHealth, setLastHealth] = useState<AnalyticsTab>(healthViews.includes(baseTab) ? baseTab : "issues")
  const [lastExplore, setLastExplore] = useState<AnalyticsTab>(exploreViews.includes(baseTab) ? baseTab : "explore")
  const [alertsOpen, setAlertsOpen] = useState(initialTab === "alerts")
  const [alertsVisited, setAlertsVisited] = useState(initialTab === "alerts")
  const [activity, setActivity] = useState<Record<string, string[]>>({})
  const [coverage, setCoverage] = useState(false),
    [status, setStatus] = useState(state),
    [notice, setNotice] = useState("")
  const data = useMemo(
    () => ({ ...source, sessions: status === "empty" ? [] : source.sessions, issues }),
    [source, issues, status]
  )
  const sessions = useMemo(() => selectSessions(data, scope), [data, scope])
  const previous = useMemo(() => selectSessions(data, scope, true), [data, scope])
  const releaseSessions = useMemo(() => selectSessions(data, { ...scope, release: "all" }), [data, scope])
  const alertSessions = useMemo(
    () => selectSessions(data, { ...alertScope, environment: scope.environment }),
    [data, alertScope, scope.environment]
  )
  const releases = useMemo(() => releaseCatalog(data), [data])
  const detail = trail.at(-1)?.detail
  const section = tab === "overview" || tab === "players" ? tab : healthViews.includes(tab) ? "health" : "explore"
  const contentRef = useRef<HTMLDivElement>(null),
    focusNavigation = useRef(false)
  useEffect(() => {
    if (!focusNavigation.current) return
    focusNavigation.current = false
    contentRef.current?.focus({ preventScroll: true })
    contentRef.current?.scrollIntoView({ block: "start" })
  }, [trail, tab, alertsOpen])
  function selectView(next: AnalyticsTab) {
    setTab(next)
    setVisited((previous) => (previous.includes(next) ? previous : [...previous, next]))
    if (healthViews.includes(next)) setLastHealth(next)
    if (exploreViews.includes(next)) setLastExplore(next)
  }
  function navigate(next: AnalyticsTab) {
    focusNavigation.current = true
    if (next === "alerts") {
      setAlertScope(scope)
      setAlertsVisited(true)
      setAlertsOpen(true)
      return
    }
    setAlertsOpen(false)
    setTrail([])
    selectView(next)
    setNotice("")
  }
  function changeScope(patch: Partial<AnalyticsScope>) {
    setScope((current) => ({ ...current, ...patch }))
    setTrail([])
  }
  function pushDetail(next: Detail, nextScope = scope) {
    focusNavigation.current = true
    if (!trail.length) setOrigin({ tab, scope })
    const existing = trail.findIndex(
      (entry) =>
        detailKey(entry.detail) === detailKey(next) && JSON.stringify(entry.scope) === JSON.stringify(nextScope)
    )
    setTrail((previous) =>
      existing < 0 ? [...previous, { detail: next, scope: nextScope }] : previous.slice(0, existing + 1)
    )
    setScope(nextScope)
    selectView(detailView(next))
  }
  function goBack() {
    focusNavigation.current = true
    const parent = trail.at(-2)
    setTrail((previous) => previous.slice(0, -1))
    setScope(parent?.scope ?? origin.scope)
    selectView(parent ? detailView(parent.detail) : origin.tab)
  }
  const openIssue = (id: string) => pushDetail({ type: "issue", id })
  const openSession = (session: AnalyticsSession) => pushDetail({ type: "session", session })
  const openTrace = (session: AnalyticsSession, operation: "saveMs" | "loadMs" | "frameMs" = "saveMs") =>
    pushDetail({ type: "trace", session, operation })
  function updateIssue(id: string, patch: Partial<AnalyticsIssue>) {
    if (!canEdit) return
    const entries = [
      patch.owner ? `Assigned to ${patch.owner}.` : "",
      patch.priority ? `Priority changed to ${patch.priority}.` : "",
      patch.status ? `You ${patch.status === "unresolved" ? "reopened" : patch.status} this issue.` : ""
    ].filter(Boolean)
    setActivity((previous) => ({ ...previous, [id]: [...entries, ...(previous[id] ?? [])] }))
    setIssues((previous) => previous.map((issue) => (issue.id === id ? { ...issue, ...patch } : issue)))
    setNotice(`${id} updated.`)
  }
  function diagnosticControls(hideRelease = false, forAlerts = false): ReactNode {
    const current = forAlerts ? alertScope : scope
    const update = forAlerts
      ? (patch: Partial<AnalyticsScope>) => setAlertScope((previous) => ({ ...previous, ...patch }))
      : changeScope
    return (
      <div className="an-diagnostic-controls" aria-label="Diagnostic filters">
        {!hideRelease && (
          <ReleasePicker
            label="Analytics release"
            className="w-36"
            value={current.release}
            onChange={(release) => update({ release })}
            releases={releases}
            allowAll
          />
        )}
        <DateRangePicker
          label="Analytics date range"
          recent
          now={data.now}
          value={current.period ?? createPeriod("last24h", data.now)}
          onChange={(period) => {
            const bounds = periodBounds(period, data.now)
            update({ period, hours: (bounds.until - bounds.from) / 3_600_000 })
          }}
        />
      </div>
    )
  }
  const content = (id: AnalyticsTab) => {
    switch (id) {
      case "overview":
        return (
          <AnalyticsOverview
            data={data}
            sessions={sessions}
            scope={scope}
            previous={previous}
            onIssue={openIssue}
            onTab={navigate}
            diagnosticControls={diagnosticControls()}
          />
        )
      case "players":
        return (
          <AnalyticsPlayers
            key={scope.environment}
            data={data}
            scope={scope}
            period={playerPeriod}
            onPeriodChange={setPlayerPeriod}
            onSessions={() => navigate("sessions")}
          />
        )
      case "issues":
        return <AnalyticsIssues data={data} sessions={sessions} scope={scope} onIssue={openIssue} />
      case "performance":
        return <AnalyticsPerformance sessions={sessions} onTrace={openTrace} />
      case "sessions":
        return <AnalyticsSessions sessions={sessions} onSession={openSession} />
      case "explore":
        return <AnalyticsExplore sessions={sessions} onSession={openSession} />
      case "releases":
        return (
          <AnalyticsReleases
            data={data}
            sessions={releaseSessions}
            onIssue={(id) => pushDetail({ type: "issue", id }, { ...scope, release: "all" })}
            onRelease={(release) => {
              changeScope({ release })
              navigate("issues")
            }}
          />
        )
      case "alerts":
        return null
    }
  }
  const localViews = section === "health" ? healthViews : section === "explore" ? exploreViews : []
  return (
    <div className="analytics-workspace">
      <div className="an-workspace-tools">
        <SelectField
          label="Analytics environment"
          className="w-40"
          value={scope.environment}
          onChange={(environment) => changeScope({ environment })}
          options={[
            { value: "production", label: "Production" },
            { value: "sandbox", label: "Sandbox" }
          ]}
        />
        <div className="flex items-center gap-3">
          {!canEdit && <span className="an-scope-note">Read only</span>}
          <Button variant="outline" size="sm" aria-pressed={alertsOpen} onClick={() => navigate("alerts")}>
            <Bell className="size-3.5" />
            Alerts
          </Button>
        </div>
      </div>
      <nav className="an-tabs an-primary-nav" aria-label="Analytics sections">
        {[
          { id: "overview", label: "Overview", view: "overview" as const },
          { id: "players", label: "Players", view: "players" as const },
          { id: "health", label: "Health", view: lastHealth },
          { id: "explore", label: "Explore", view: lastExplore }
        ].map((item) => (
          <button
            key={item.id}
            aria-current={!alertsOpen && section === item.id ? "page" : undefined}
            onClick={() => navigate(item.view)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="an-content" ref={contentRef} tabIndex={-1}>
        {alertsOpen && (
          <div className="an-utility-heading">
            <button
              className="an-text-link"
              onClick={() => {
                focusNavigation.current = true
                setAlertsOpen(false)
              }}
            >
              <ArrowLeft className="size-4" />
              Back to {detail ? detail.type : names[tab].toLowerCase()}
            </button>
            {diagnosticControls(false, true)}
          </div>
        )}
        {alertsVisited && (
          <div hidden={!alertsOpen}>
            <AnalyticsAlerts sessions={alertSessions} canEdit={canEdit} />
          </div>
        )}
        <div hidden={alertsOpen}>
          {localViews.length > 0 && (
            <div className="an-view-toolbar">
              <nav className="an-local-nav" aria-label={section === "health" ? "Health views" : "Explore datasets"}>
                {localViews.map((id) => (
                  <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => navigate(id)}>
                    {names[id]}
                    {id === "issues" && status === "ready" && (
                      <span className="an-count">
                        {
                          issues.filter(
                            (issue) =>
                              issue.status === "unresolved" && sessions.some((session) => session.issueId === issue.id)
                          ).length
                        }
                      </span>
                    )}
                  </button>
                ))}
              </nav>
              {diagnosticControls(tab === "releases")}
            </div>
          )}
          {status === "ready" &&
            visited.map((id) => (
              <div
                key={id}
                hidden={
                  id !== tab ||
                  Boolean(detail) ||
                  (!sessions.length && !["releases", "players", "overview"].includes(id))
                }
              >
                {content(id)}
              </div>
            ))}
          {status === "loading" ? (
            <div aria-busy="true" aria-label="Loading analytics" className="an-loading">
              <span className="sr-only">Loading analytics…</span>
              <div className="an-metrics">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} />
                ))}
              </div>
              <div className="an-loading-chart" />
            </div>
          ) : status === "unavailable" ? (
            <Blank
              title="Analytics couldn't be loaded"
              description="Try again in a moment."
              action={
                <Button variant="outline" onClick={() => setStatus("ready")}>
                  <RefreshCw className="size-4" />
                  Retry connection
                </Button>
              }
            />
          ) : status === "empty" ? (
            <Blank
              title="No telemetry yet"
              description="Connect your game to start collecting events."
              action={
                <Button onClick={() => setCoverage(true)}>
                  <Code2 className="size-4" />
                  Set up telemetry
                </Button>
              }
            />
          ) : !sessions.length && !["releases", "players", "overview"].includes(tab) ? (
            <Blank
              title="No matching data"
              description="Try another release or time range."
              action={
                <Button variant="outline" onClick={() => changeScope({ release: "all", hours: 24, period: undefined })}>
                  Reset release and dates
                </Button>
              }
            />
          ) : (
            trail.map((entry, index) => {
              const current = entry.detail,
                active = index === trail.length - 1
              const backLabel = `Back to ${index ? trail[index - 1]!.detail.type : names[origin.tab].toLowerCase()}`
              const scopedSessions = selectSessions(data, entry.scope)
              const issue = current.type === "issue" ? issues.find((issue) => issue.id === current.id) : undefined
              return (
                <div key={`${detailKey(current)}-${JSON.stringify(entry.scope)}`} hidden={!active}>
                  {issue && (
                    <IssueInvestigation
                      issue={issue}
                      activity={activity[issue.id] ?? []}
                      sessions={scopedSessions}
                      data={data}
                      scope={entry.scope}
                      canEdit={canEdit}
                      investigator={investigator}
                      active={active && !alertsOpen}
                      backLabel={backLabel}
                      onBack={goBack}
                      onUpdate={updateIssue}
                      onSession={openSession}
                      onTrace={openTrace}
                    />
                  )}
                  {current.type === "session" && (
                    <SessionInvestigation
                      session={current.session}
                      data={data}
                      backLabel={backLabel}
                      onBack={goBack}
                      onIssue={openIssue}
                      onTrace={openTrace}
                    />
                  )}
                  {current.type === "trace" && (
                    <TraceInvestigation
                      session={current.session}
                      operation={current.operation}
                      backLabel={backLabel}
                      onBack={goBack}
                      onSession={openSession}
                    />
                  )}
                </div>
              )
            })
          )}
          <output className="an-status-message block">{notice}</output>
        </div>
      </div>
      <Sheet open={coverage} onOpenChange={setCoverage}>
        <SheetContent className="w-full overflow-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Connect your game</SheetTitle>
            <SheetDescription>Install the SDK and send your first event.</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-5 pb-6">
            <div className="an-coverage-item">
              <Code2 />
              <div>
                <h3>1. Instrument your game</h3>
                <p>Install @spawn/telemetry with your tenant endpoint and public write key.</p>
              </div>
            </div>
            <div className="an-coverage-item">
              <Database />
              <div>
                <h3>2. Verify tenant delivery</h3>
                <p>Send a test event, then check ingestion health in Analytics.</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
