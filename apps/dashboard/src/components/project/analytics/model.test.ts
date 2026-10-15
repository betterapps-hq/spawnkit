import { describe, expect, it } from "vitest"
import { analyticsFixture } from "./fixtures"
import { health, issueImpact, percentile, scopeWindow, selectSessions, series, sessionEvents } from "./model"

describe("Analytics observation contracts", () => {
  const scope = { environment: "production", release: "all", hours: 24 }
  it("isolates environment, release and adjacent time windows", () => {
    const current = selectSessions(analyticsFixture, scope)
    const previous = selectSessions(analyticsFixture, scope, true)
    expect(current.length).toBeGreaterThan(500)
    expect(current.every((session) => session.environment === "production")).toBe(true)
    expect(current.every((session) => session.time > analyticsFixture.now - 24 * 3_600_000)).toBe(true)
    expect(previous.some((session) => current.some((other) => other.id === session.id))).toBe(false)
    const release = selectSessions(analyticsFixture, { ...scope, release: "1.8.3" })
    expect(release.length).toBeLessThan(current.length)
    expect(release.every((session) => session.release === "1.8.3")).toBe(true)
    expect(selectSessions(analyticsFixture, { ...scope, release: "missing" })).toEqual([])
  })
  it("uses one denominator for cards, issue groups and chart buckets", () => {
    const sessions = selectSessions(analyticsFixture, scope)
    const stats = health(sessions),
      points = series(sessions, analyticsFixture.now, scope.hours)
    const issues = issueImpact(analyticsFixture.issues, sessions)
    expect(points.reduce((sum, point) => sum + point.count, 0)).toBe(stats.sessions)
    expect(points.reduce((sum, point) => sum + point.errors, 0)).toBe(stats.errors)
    expect(issues.reduce((sum, issue) => sum + issue.sessions.length, 0)).toBe(stats.errors)
    expect(stats.errorFree).toBe(((sessions.length - stats.errors) / sessions.length) * 100)
  })
  it("uses nearest-rank percentiles without mutating observations", () => {
    const values = [100, 1, 5, 3, 2]
    expect(percentile(values, 0.5)).toBe(3)
    expect(percentile(values)).toBe(100)
    expect(values).toEqual([100, 1, 5, 3, 2])
    expect(percentile([])).toBe(0)
  })
  it("does not label an empty cohort as healthy", () => {
    expect(health([]).sessions).toBe(0)
    expect(health([]).errorFree).toBe(0)
  })
  it("includes both selected UTC days exactly once and compares the preceding range", () => {
    const from = Date.UTC(2026, 9, 12),
      until = Date.UTC(2026, 9, 14)
    const data = {
      ...analyticsFixture,
      sessions: [from - 1, from, until - 1, until].map((time, index) => ({
        ...analyticsFixture.sessions[0]!,
        id: String(index),
        environment: "production" as const,
        time
      }))
    }
    const selection = { ...scope, period: { key: "custom" as const, range: { from: "2026-10-12", to: "2026-10-13" } } }
    const current = selectSessions(data, selection)
    expect(current.map((session) => session.time)).toEqual([from, until - 1])
    expect(selectSessions(data, selection, true).map((session) => session.time)).toEqual([from - 1])
    expect(scopeWindow(data, selection, true)).toEqual({ from: from - (until - from), until: from })
    expect(series(current, until, 48).reduce((sum, point) => sum + point.count, 0)).toBe(2)
  })
  it("keeps event identity, timestamps and session correlation consistent", () => {
    const events = analyticsFixture.sessions.flatMap(sessionEvents)
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length)
    expect(events.every((event) => event.time <= analyticsFixture.now)).toBe(true)
    expect(events.every((event) => event.attributes["session.id"] === event.session.id)).toBe(true)
    const rendering = analyticsFixture.sessions.find((session) => session.issueId === "SPN-238")!
    expect(sessionEvents(rendering).find((event) => event.level === "error")?.name).toBe("renderer.context_lost")
  })
})
