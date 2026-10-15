import { ArrowRight, CircleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "../../ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import { TrendChart } from "./charts"
import { DAY, engagement, shortDate } from "./engagement"
import {
  health,
  issueImpact,
  number,
  percent,
  type AnalyticsData,
  type AnalyticsSession,
  type AnalyticsScope,
  type AnalyticsTab
} from "./model"
import { Panel, Tone } from "./primitives"

export function AnalyticsOverview({
  data,
  sessions,
  scope,
  previous,
  onIssue,
  onTab,
  diagnosticControls
}: {
  data: AnalyticsData
  sessions: AnalyticsSession[]
  scope: AnalyticsScope
  previous: AnalyticsSession[]

  onIssue: (id: string) => void
  onTab: (tab: AnalyticsTab) => void
  diagnosticControls: ReactNode
}) {
  const stats = health(sessions),
    before = health(previous),
    players = engagement(data, scope)

  const priority = { High: 0, Medium: 1, Low: 2 }

  const impact = issueImpact(
    data.issues.filter((issue) => issue.status === "unresolved"),
    sessions
  ).sort(
    (a, b) =>
      priority[a.priority] - priority[b.priority] ||
      Number(b.state === "Regressed") - Number(a.state === "Regressed") ||
      b.sessions.length - a.sessions.length
  )

  const top = impact[0]

  return (
    <div className="an-overview space-y-6">
      <section aria-label="Game health" className="space-y-4">
        <div className="an-section-line an-health-heading">
          <h2>Game health</h2>
          {diagnosticControls}
        </div>
        {top ? (
          <div className="an-priority-issue">
            <CircleAlert className="size-5 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Tone tone="bad">{top.state}</Tone>
                <span className="an-caption">{top.firstRelease}</span>
              </div>
              <h3>{top.title === "SaveConflictError" ? "Checkpoint saves are failing" : top.title}</h3>
              <p className="an-metadata">
                <span>{number(top.sessions.length)} affected sessions</span>
                <span>{top.owner}</span>
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onIssue(top.id)}>
              Open issue <ArrowRight className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="an-panel p-5 text-sm text-muted-foreground">
            {sessions.length ? "No unresolved issues" : "No matching diagnostic data"}
          </div>
        )}
        <div className="an-health-strip">
          <div>
            <Tooltip>
              <TooltipTrigger className="an-metric-definition">Issue-free sessions</TooltipTrigger>
              <TooltipContent className="max-w-64">
                Recorded sessions without a linked error or performance issue, divided by recorded sessions.
              </TooltipContent>
            </Tooltip>
            <strong>{sessions.length ? percent(stats.errorFree) : "—"}</strong>
            {previous.length > 0 && sessions.length > 0 && (
              <small className={stats.errorFree >= before.errorFree ? "an-positive" : "an-negative"}>
                {stats.errorFree >= before.errorFree ? "+" : ""}
                {(stats.errorFree - before.errorFree).toFixed(1)} pp
              </small>
            )}
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger className="an-metric-definition">Recorded sessions</TooltipTrigger>
              <TooltipContent className="max-w-64">
                Diagnostic sessions in this scope. Sampling can make this smaller than total player activity.
              </TooltipContent>
            </Tooltip>
            <strong>{number(stats.sessions)}</strong>
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger className="an-metric-definition">Scene load (p95)</TooltipTrigger>
              <TooltipContent className="max-w-64">
                95% of recorded scene loads were at or below this duration.
              </TooltipContent>
            </Tooltip>
            <strong>{sessions.length ? `${(stats.load / 1000).toFixed(2)}s` : "—"}</strong>
          </div>
          <div>
            <span>Save time (p95)</span>
            <strong>{sessions.length ? `${(stats.save / 1000).toFixed(2)}s` : "—"}</strong>
          </div>
        </div>
        <div className="an-overview-links">
          <button className="an-text-link" onClick={() => onTab("issues")}>
            {impact.length} unresolved issues <ArrowRight className="size-3.5" />
          </button>
          <button className="an-text-link" onClick={() => onTab("performance")}>
            Performance <ArrowRight className="size-3.5" />
          </button>
        </div>
      </section>
      <Panel
        title="Players"
        action={
          <button className="an-text-link" onClick={() => onTab("players")}>
            View engagement <ArrowRight className="size-3.5" />
          </button>
        }
      >
        <div className="an-player-brief-date">{shortDate(players.end - DAY)} UTC</div>
        {players.dailyAvailable ? (
          <>
            <div className="an-player-brief">
              <div>
                <span>Daily active</span>
                <strong>{number(players.dau)}</strong>
              </div>
              <div>
                <span>Monthly active</span>
                <strong>{players.monthlyAvailable ? number(players.mau) : "—"}</strong>
              </div>
              <div>
                <span>Hours played</span>
                <strong>{number(Math.round(players.hours))}</strong>
              </div>
            </div>
            <div className="an-chart-legend">
              <span>
                <i className="an-dot bg-primary" />
                Daily active players
              </span>
              <span className="ml-auto">30 days</span>
            </div>
            <TrendChart
              points={players.trend}
              height={175}
              label="Daily active players over 30 days"
              fields={[{ key: "players", label: "Active players", color: "var(--primary)" }]}
            />
          </>
        ) : (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No complete player activity yet</p>
        )}
      </Panel>
    </div>
  )
}
