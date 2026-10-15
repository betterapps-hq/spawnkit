import { ArrowRight } from "lucide-react"
import { useMemo, useState } from "react"
import type { DatePeriod, DayRange } from "../../../lib/date-range"
import { DateRangePicker } from "../../date-range-picker"
import { Button } from "../../ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import { TrendChart } from "./charts"
import { DAY, engagement, retention, retentionSummary, shortDate } from "./engagement"
import { number, percent, type AnalyticsData, type AnalyticsScope } from "./model"
import { Blank, Metric, Panel } from "./primitives"
function PlayerMetrics({ data, scope, range }: { data: AnalyticsData; scope: AnalyticsScope; range: DayRange }) {
  const current = useMemo(() => engagement(data, scope, 0, range), [data, scope, range])
  const before = useMemo(() => engagement(data, scope, 1, range), [data, scope, range])
  const previousPeriod = useMemo(() => engagement(data, scope, current.days, range), [data, scope, current.days, range])
  const delta = (value: number, previous: number) =>
    previous ? `${value >= previous ? "+" : ""}${((value / previous - 1) * 100).toFixed(1)}%` : "No baseline"
  const asOf = `${shortDate(current.end - DAY)} UTC`
  return (
    <div className="an-metrics">
      <Metric
        label="Daily active players"
        value={current.dailyAvailable ? number(current.dau) : "—"}
        change={current.dailyAvailable && before.dailyAvailable ? delta(current.dau, before.dau) : "No baseline"}
        good={current.dau >= before.dau}
        detail={`Distinct players active on ${asOf}, the last selected day. Compared with the preceding day.`}
      />
      <Metric
        label="Monthly active players"
        value={current.monthlyAvailable ? number(current.mau) : "—"}
        change={current.monthlyAvailable && before.monthlyAvailable ? delta(current.mau, before.mau) : "No baseline"}
        good={current.mau >= before.mau}
        detail={`Distinct players over 30 complete days ending ${asOf}, regardless of the selected range length. Compared with the rolling window one day earlier.`}
      />
      <Metric
        label="Hours played"
        value={current.period.available ? number(Math.round(current.period.hours)) : "—"}
        change={
          current.period.available && previousPeriod.period.available
            ? delta(current.period.hours, previousPeriod.period.hours)
            : "No baseline"
        }
        good={current.period.hours >= previousPeriod.period.hours}
        detail="Active play time in the selected range, excluding idle and background time. Compared with the preceding range of equal length."
      />
      <Metric
        label="Playtime / player"
        value={
          current.period.available && current.period.players ? `${current.period.minutesPerPlayer.toFixed(1)}m` : "—"
        }
        change={
          current.period.available && previousPeriod.period.available
            ? delta(current.period.minutesPerPlayer, previousPeriod.period.minutesPerPlayer)
            : "No baseline"
        }
        good={current.period.minutesPerPlayer >= previousPeriod.period.minutesPerPlayer}
        detail="Active minutes divided by distinct players in the selected range. Compared with the preceding range of equal length."
      />
    </div>
  )
}
function PlayerTrend({ data, scope, range }: { data: AnalyticsData; scope: AnalyticsScope; range: DayRange }) {
  const stats = useMemo(() => engagement(data, scope, 0, range), [data, scope, range])
  const [metric, setMetric] = useState<"players" | "hours">("players")
  return (
    <Panel
      title={metric === "players" ? "Active players" : "Hours played"}
      action={
        <div className="an-segment" aria-label="Player chart metric">
          <button aria-pressed={metric === "players"} onClick={() => setMetric("players")}>
            Players
          </button>
          <button aria-pressed={metric === "hours"} onClick={() => setMetric("hours")}>
            Playtime
          </button>
        </div>
      }
    >
      <div className="an-chart-legend">
        <span>
          <i className="an-dot bg-primary" />
          {metric === "players" ? "Daily active" : "Hours"}
        </span>
        {metric === "players" && (
          <span>
            <i className="an-dot" style={{ background: "var(--an-good)" }} />
            New players
          </span>
        )}
        <span className="ml-auto">
          {stats.days} {stats.days === 1 ? "day" : "days"} (UTC)
        </span>
      </div>
      <TrendChart
        points={stats.trend}
        height={250}
        label={
          metric === "players"
            ? `Daily active and new players over ${stats.days} days`
            : `Active hours played over ${stats.days} days`
        }
        fields={
          metric === "players"
            ? [
                { key: "players", label: "Active players", color: "var(--primary)" },
                { key: "newPlayers", label: "New players", color: "var(--an-good)" }
              ]
            : [{ key: "hours", label: "Hours", color: "var(--primary)" }]
        }
      />
      {stats.period.available && (
        <div className="an-player-mix">
          <span>
            <strong>{number(stats.period.newPlayers)}</strong> new players
          </span>
          <span>
            <strong>{number(stats.period.returningPlayers)}</strong> returning
          </span>
        </div>
      )}
    </Panel>
  )
}
export function AnalyticsPlayers({
  data,
  scope,
  period,
  onPeriodChange,
  onSessions
}: {
  data: AnalyticsData
  scope: AnalyticsScope
  period: DatePeriod
  onPeriodChange: (period: DatePeriod) => void
  onSessions: () => void
}) {
  const stats = useMemo(() => engagement(data, scope, 0, period.range), [data, scope, period.range])
  const [selected, setSelected] = useState<number | null>(null)
  const [cohortPage, setCohortPage] = useState(0)
  const [returnDay, setReturnDay] = useState(1)
  const heading = (
    <div className="an-section-line an-player-heading">
      <h2>Engagement</h2>
      <DateRangePicker
        label="Player date range"
        completeDays
        now={data.now}
        value={period}
        onChange={(next) => {
          onPeriodChange(next)
          setCohortPage(0)
          setSelected(null)
        }}
      />
    </div>
  )
  if (!stats.dailyAvailable)
    return (
      <div className="space-y-5">
        {heading}
        <Blank
          title="No complete player activity yet"
          description="No complete activity is available for the last selected day in this environment."
        />
      </div>
    )
  const oldest = Math.max(stats.start, stats.coveredFrom)
  const cohortDays = Array.from(
    { length: Math.min(8, Math.max(0, Math.round((stats.end - oldest) / DAY) - cohortPage * 8)) },
    (_, i) => stats.end - (i + 1 + cohortPage * 8) * DAY
  )
  const cohortRetention = (cohort: number, day: number) =>
    retention(stats.cohortFacts, stats.cohortUntil, cohort, day, stats.coveredFrom)
  const days = [1, 3, 7, 14, 30]
  return (
    <div className="space-y-5">
      {heading}
      <div className="an-section-line">
        <span>Active players as of {shortDate(stats.end - DAY)} UTC</span>
        <button className="an-text-link ml-auto" onClick={onSessions}>
          Sessions <ArrowRight className="size-3.5" />
        </button>
      </div>
      <PlayerMetrics data={data} scope={scope} range={period.range} />
      <div className="an-engagement-strip">
        <div>
          <span>Weekly active</span>
          <strong>{stats.weeklyAvailable ? number(stats.wau) : "—"}</strong>
        </div>
        <div>
          <span>DAU / MAU</span>
          <strong>{stats.monthlyAvailable && stats.mau ? percent(stats.stickiness) : "—"}</strong>
        </div>
        <div>
          <span>Sessions / player</span>
          <strong>
            {stats.period.available && stats.period.players ? stats.period.sessionsPerPlayer.toFixed(1) : "—"}
          </strong>
        </div>
        <div>
          <span>Avg. session</span>
          <strong>
            {stats.period.available && stats.period.minutesPerSession
              ? `${stats.period.minutesPerSession.toFixed(1)}m`
              : "—"}
          </strong>
        </div>
      </div>
      <PlayerTrend data={data} scope={scope} range={period.range} />
      <div className="an-player-grid">
        <Panel
          title="Retention"
          action={
            <Tooltip>
              <TooltipTrigger className="an-caption">Eligible cohorts</TooltipTrigger>
              <TooltipContent className="max-w-64">
                First played within the selected range. Returns observed through {shortDate(stats.cohortUntil - DAY)}{" "}
                UTC; incomplete return days are excluded.
              </TooltipContent>
            </Tooltip>
          }
        >
          <div className="an-retention-summary">
            {[1, 7, 30].map((day) => {
              const value = retentionSummary(stats.cohortFacts, stats.cohortUntil, day, stats.coveredFrom, {
                from: stats.start,
                until: stats.end
              })
              return (
                <div key={day}>
                  <span>Day {day}</span>
                  <strong>{value.rate === null ? "—" : percent(value.rate)}</strong>
                  <small>{number(value.total)} new players</small>
                </div>
              )
            })}
          </div>
        </Panel>
        <Panel title="Level completion" action={<span className="an-caption">Selected range</span>}>
          <div className="an-completion">
            <strong>
              {stats.period.available && stats.period.levelStarts
                ? percent((stats.period.levelCompletions / stats.period.levelStarts) * 100)
                : "—"}
            </strong>
            <div className="an-progress-track">
              <span
                style={{
                  width: `${stats.period.available && stats.period.levelStarts ? (stats.period.levelCompletions / stats.period.levelStarts) * 100 : 0}%`
                }}
              />
            </div>
            <span>
              {stats.period.available
                ? `${number(stats.period.levelCompletions)} completed / ${number(stats.period.levelStarts)} started`
                : "Incomplete coverage"}
            </span>
          </div>
        </Panel>
      </div>
      <Panel
        title="Retention by cohort"
        action={
          <>
            <span className="an-caption an-cohort-desktop">Exact-day returns</span>
            <select
              className="an-native-select an-cohort-mobile"
              aria-label="Cohort return day"
              value={returnDay}
              onChange={(event) => setReturnDay(Number(event.target.value))}
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  Day {day}
                </option>
              ))}
            </select>
          </>
        }
      >
        <div className="an-table-scroll">
          <table className="an-table an-retention-table">
            <thead>
              <tr>
                <th>First played (UTC)</th>
                <th>Players</th>
                {days.map((day) => (
                  <th key={day} className={day === returnDay ? undefined : "an-cohort-desktop"}>
                    Day {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortDays.map((cohort) => (
                <tr key={cohort}>
                  <td>
                    <button
                      className="an-text-link"
                      aria-pressed={selected === cohort}
                      onClick={() => setSelected(cohort)}
                    >
                      {shortDate(cohort)}
                    </button>
                  </td>
                  <td>{cohortRetention(cohort, 1).total}</td>
                  {days.map((day) => {
                    const result = cohortRetention(cohort, day)
                    return (
                      <td key={day} className={day === returnDay ? undefined : "an-cohort-desktop"}>
                        <span
                          className="an-heat-cell"
                          title={
                            result.rate === null
                              ? "Return day not complete or no eligible players"
                              : `${result.returned} of ${result.total} returned`
                          }
                          style={
                            result.rate === null
                              ? undefined
                              : {
                                  background: `color-mix(in srgb, var(--primary) ${Math.round(result.rate * 0.65 + 8)}%, var(--card))`
                                }
                          }
                        >
                          {result.rate === null ? "—" : percent(result.rate)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="an-panel-footer an-cohort-pagination justify-between">
          <span>
            {cohortDays.length
              ? `${shortDate(cohortDays.at(-1)!)} – ${shortDate(cohortDays[0]!)}`
              : "No eligible cohorts"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={cohortPage === 0}
              onClick={() => {
                setSelected(null)
                setCohortPage((page) => page - 1)
              }}
            >
              Newer cohorts
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!cohortDays.length || cohortDays.at(-1)! <= oldest}
              onClick={() => {
                setSelected(null)
                setCohortPage((page) => page + 1)
              }}
            >
              Older cohorts
            </Button>
          </div>
        </div>
      </Panel>
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent className="an-cohort-sheet w-full overflow-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected === null ? "Cohort" : `${shortDate(selected)} cohort`}</SheetTitle>
            <SheetDescription>Players whose first activity was on this UTC day.</SheetDescription>
          </SheetHeader>
          {selected !== null && (
            <div className="space-y-6 px-5 pb-6">
              <div className="an-retention-summary">
                {[1, 7, 30].map((day) => {
                  const result = cohortRetention(selected, day)
                  return (
                    <div key={day}>
                      <span>Day {day}</span>
                      <strong>{result.rate === null ? "—" : percent(result.rate)}</strong>
                      <small>
                        {result.returned === null ? "Not available" : `${result.returned} / ${result.total} returned`}
                      </small>
                    </div>
                  )
                })}
              </div>
              <TrendChart
                points={days.map((day) => ({ label: `Day ${day}`, rate: cohortRetention(selected, day).rate }))}
                fields={[{ key: "rate", label: "Returned (%)", color: "var(--primary)" }]}
                label="Selected cohort exact-day retention"
                height={190}
              />
              <h3 className="text-sm font-medium">Compare return days</h3>
              <div className="an-segment" aria-label="Compare retention day">
                {days.map((day) => (
                  <button key={day} aria-pressed={returnDay === day} onClick={() => setReturnDay(day)}>
                    D{day}
                  </button>
                ))}
              </div>
              {(() => {
                const current = cohortRetention(selected, returnDay),
                  before = cohortRetention(selected - DAY, returnDay)
                return (
                  <div className="an-cohort-comparison">
                    <strong>{current.rate === null ? "—" : percent(current.rate)}</strong>
                    <span>returned on day {returnDay}</span>
                    <p>
                      {current.rate !== null && before.rate !== null
                        ? `${current.rate >= before.rate ? "+" : ""}${(current.rate - before.rate).toFixed(1)} pp vs. ${shortDate(selected - DAY)} cohort (${before.returned}/${before.total})`
                        : "Comparison not available"}
                    </p>
                  </div>
                )
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
