import { periodBounds, periodLabel, rangeLabel, type DatePeriod } from "../../../lib/date-range"

export type AnalyticsTab =
  | "overview"
  | "players"
  | "issues"
  | "performance"
  | "sessions"
  | "explore"
  | "releases"
  | "alerts"
export type IssueStatus = "unresolved" | "resolved" | "archived"
export interface AnalyticsIssue {
  id: string
  title: string
  message: string
  location: string
  category: "Error" | "Performance"
  priority: "High" | "Medium" | "Low"
  state: "Regressed" | "New" | "Ongoing"
  owner: string
  status: IssueStatus
  firstRelease: string
  hypothesis: string
  source: string[]
  sourceStartLine?: number
  operation?: "saveMs" | "loadMs" | "frameMs"
}
export interface AnalyticsSession {
  id: string
  time: number
  environment: "production" | "sandbox"
  release: string
  device: "Desktop" | "Mobile" | "Tablet"
  browser: string
  region: string
  scene: string
  duration: number
  loadMs: number
  frameMs: number
  saveMs: number
  completed: boolean
  operationFailures?: Partial<Record<"saveMs" | "loadMs" | "frameMs", string>>
  issueId?: string
}
export interface AnalyticsData {
  now: number
  sessions: AnalyticsSession[]
  issues: AnalyticsIssue[]
  /** Project release catalog, independent of the selected diagnostic window. */
  releases?: AnalyticsRelease[]
  playerDays?: PlayerDay[]
  /** Complete UTC-day rollups for [from, until). Missing coverage is unknown, not zero. */
  playerCoverage?: { environment: AnalyticsSession["environment"]; from: number; until: number }[]
}
export interface AnalyticsRelease {
  version: string
  createdAt?: number
  commit?: string
}
/** Daily facts from consented, pseudonymous player activity. Never inferred from session IDs. */
export interface PlayerDay {
  playerId: string
  firstSeen: number
  day: number
  environment: AnalyticsSession["environment"]
  release: string
  activeSeconds: number
  sessions: number
  levelStarts: number
  /** Completed attempts joined to their start-day cohort, including finishes after midnight. */
  levelCompletions: number
}
export interface AnalyticsScope {
  environment: string
  release: string
  hours: number
  period?: DatePeriod | undefined
}
export interface AnalyticsEvent {
  id: string
  session: AnalyticsSession
  time: number
  name: string
  level: "info" | "error"
  duration: number
  attributes: Record<string, string | number | boolean>
}
export function scopeWindow(data: AnalyticsData, scope: AnalyticsScope, previous = false) {
  const current = scope.period
    ? periodBounds(scope.period, data.now)
    : { from: data.now - scope.hours * 3_600_000, until: data.now + 1 }
  const duration = current.until - current.from
  return previous ? { from: current.from - duration, until: current.from } : current
}
export function scopeDates(scope: AnalyticsScope) {
  return scope.period
    ? `${periodLabel(scope.period)}${scope.period.key === "custom" ? "" : ` (${rangeLabel(scope.period.range)})`} UTC`
    : `Last ${scope.hours}h`
}
export function selectSessions(data: AnalyticsData, scope: AnalyticsScope, previous = false) {
  const { from, until } = scopeWindow(data, scope, previous)
  return data.sessions.filter(
    (session) =>
      session.environment === scope.environment &&
      (scope.release === "all" || session.release === scope.release) &&
      session.time >= from &&
      session.time < until
  )
}
export const number = (value: number) => new Intl.NumberFormat("en-US").format(value)
export const percent = (value: number) => `${value.toFixed(1)}%`
export function percentile(values: number[], quantile = 0.95) {
  if (!values.length) return 0
  return [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * quantile) - 1)]!
}
export function health(sessions: AnalyticsSession[]) {
  const errors = sessions.filter((session) => Boolean(session.issueId)).length
  return {
    sessions: sessions.length,
    errors,
    errorFree: sessions.length ? ((sessions.length - errors) / sessions.length) * 100 : 0,
    load: percentile(sessions.map((session) => session.loadMs)),
    frame: percentile(sessions.map((session) => session.frameMs)),
    save: percentile(sessions.map((session) => session.saveMs))
  }
}
export function series(sessions: AnalyticsSession[], now: number, hours: number) {
  return Array.from({ length: 24 }, (_, index) => {
    const start = now - hours * 3_600_000 + index * hours * 150_000
    const subset = sessions.filter((session) => session.time >= start && session.time < start + hours * 150_000)
    return { time: start, count: subset.length, errors: subset.filter((session) => session.issueId).length }
  })
}
export function sessionEvents(session: AnalyticsSession): AnalyticsEvent[] {
  const failure: Record<string, string> = {
    "SPN-241": "checkpoint.failed",
    "SPN-238": "renderer.context_lost",
    "SPN-229": "room.join_failed",
    "SPN-236": "inventory.equip_failed",
    "SPN-222": "asset.request_failed"
  }
  const names = [
    "session.started",
    "scene.loaded",
    "level.entered",
    session.issueId === "SPN-217"
      ? "frame.budget_exceeded"
      : session.completed
        ? "checkpoint.saved"
        : (failure[session.issueId!] ?? "operation.failed"),
    "session.ended"
  ]
  return names.map((name, index) => ({
    id: `${session.id}-${index}`,
    session,
    time: session.time + (session.duration * 1000 * index) / 4,
    name,
    level: index === 3 && !session.completed ? "error" : "info",
    duration: index === 1 ? session.loadMs : index === 3 ? session.saveMs : 0,
    attributes: {
      "session.id": session.id,
      scene: session.scene,
      device: session.device,
      release: session.release,
      "deployment.environment.name": session.environment,
      "frame.p95_ms": session.frameMs,
      checkpoint: 3
    }
  }))
}
export function issueImpact(issues: AnalyticsIssue[], sessions: AnalyticsSession[]) {
  return issues
    .map((issue) => ({ ...issue, sessions: sessions.filter((session) => session.issueId === issue.id) }))
    .filter((issue) => issue.sessions.length)
    .sort((a, b) => b.sessions.length - a.sessions.length)
}
