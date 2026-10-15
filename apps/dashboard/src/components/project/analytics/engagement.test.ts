import { describe, expect, it } from "vitest"
import { DAY, engagement, retention, retentionSummary } from "./engagement"
import type { AnalyticsData, PlayerDay } from "./model"

const end = Date.UTC(2026, 9, 14)
const scope = { environment: "production", release: "all" }
function fact(playerId: string, age: number, firstAge = age, patch: Partial<PlayerDay> = {}): PlayerDay {
  return {
    playerId,
    day: end - age * DAY,
    firstSeen: end - firstAge * DAY,
    environment: "production",
    release: "1.0",
    activeSeconds: 1800,
    sessions: 2,
    levelStarts: 4,
    levelCompletions: 3,
    ...patch
  }
}
function data(playerDays: PlayerDay[]): AnalyticsData {
  return {
    now: end + 18 * 3_600_000,
    sessions: [],
    issues: [],
    playerDays,
    playerCoverage: (["production", "sandbox"] as const).map((environment) => ({
      environment,
      from: end - 64 * DAY,
      until: end
    }))
  }
}

describe("Player metrics", () => {
  it("deduplicates players across releases while summing additive activity", () => {
    const stats = engagement(
      data([
        fact("a", 1),
        fact("a", 1, 1, { release: "1.1" }),
        fact("b", 1),
        fact("c", 7),
        fact("d", 30),
        fact("e", 31),
        fact("partial", 0),
        fact("sandbox", 1, 1, { environment: "sandbox" })
      ]),
      scope
    )
    expect(stats.dau).toBe(2)
    expect(stats.wau).toBe(3)
    expect(stats.mau).toBe(4)
    expect(stats.hours).toBe(1.5)
    expect(stats.minutesPerPlayer).toBe(45)
    expect(stats.minutesPerSession).toBe(15)
    expect(stats.stickiness).toBe(50)
    expect(stats.trend.at(-1)?.players).toBe(stats.dau)
    expect(stats.end).toBe(end)
  })
  it("isolates environment and preserves player identity and retention through an upgrade", () => {
    const input = data([
      fact("existing", 1, 30, { release: "1.1" }),
      fact("upgraded", 2, 2, { release: "1.0" }),
      fact("upgraded", 1, 2, { release: "1.1" }),
      fact("new", 1, 1),
      fact("sandbox", 1, 1, { environment: "sandbox" })
    ])
    const stats = engagement(input, scope)
    expect(stats.dau).toBe(3)
    expect(stats.newPlayers).toBe(1)
    expect(retention(stats.facts, stats.end, end - 2 * DAY, 1).rate).toBe(100)
    expect(engagement(input, { ...scope, environment: "sandbox" }).dau).toBe(1)
  })
  it("distinguishes known zero activity from missing or partial rollups", () => {
    const complete = engagement(data([]), scope)
    expect(complete.dailyAvailable).toBe(true)
    expect(complete.dau).toBe(0)
    expect(complete.trend.at(-1)?.players).toBe(0)
    const missing = engagement({ ...data([fact("a", 1)]), playerCoverage: [] }, scope)
    expect(missing.dailyAvailable).toBe(false)
    expect(missing.trend.at(-1)?.players).toBeNull()
    const partial = engagement(
      { ...data([fact("a", 1)]), playerCoverage: [{ environment: "production", from: end - DAY, until: end }] },
      scope
    )
    expect(partial.dailyAvailable).toBe(true)
    expect(partial.monthlyAvailable).toBe(false)
    expect(partial.trend[0]?.players).toBeNull()
    expect(retention(partial.facts, partial.end, end - 2 * DAY, 1, partial.coveredFrom).rate).toBeNull()
  })
  it("keeps partial return days pending and counts exact-day returns once", () => {
    const facts = [fact("a", 8), fact("b", 8), fact("a", 1, 8), fact("a", 1, 8, { release: "1.1" }), fact("b", 2, 8)]
    expect(retention(facts, end, end - 8 * DAY, 7)).toEqual({ total: 2, returned: 1, rate: 50 })
    expect(retention(facts, end, end - 8 * DAY, 8)).toEqual({ total: 2, returned: null, rate: null })
    expect(retentionSummary(facts, end, 7)).toEqual({ total: 2, returned: 1, rate: 50 })
  })
  it("weights retention by cohort size, excludes unmatured cohorts, and leaves missing cohorts undefined", () => {
    const facts = [
      fact("a", 3),
      fact("b", 3),
      fact("c", 3),
      fact("a", 2, 3),
      fact("d", 2),
      fact("d", 1, 2),
      fact("pending", 1)
    ]
    expect(retentionSummary(facts, end, 1)).toEqual({ total: 4, returned: 2, rate: 50 })
    expect(retentionSummary([], end, 1).rate).toBeNull()
  })
  it("anchors active-player windows to a historical end while summing only the selected range", () => {
    const input = data([fact("a", 3), fact("a", 4, 4), fact("b", 4, 40), fact("c", 9), fact("outside", 2)])
    const range = { from: "2026-10-10", to: "2026-10-11" }
    const stats = engagement(input, scope, 0, range)
    expect(stats.end).toBe(end - 2 * DAY)
    expect(stats.days).toBe(2)
    expect(stats.dau).toBe(1)
    expect(stats.mau).toBe(3)
    expect(stats.period).toMatchObject({ available: true, players: 2, hours: 1.5, newPlayers: 1, returningPlayers: 1 })
    expect(stats.trend.map((point) => point.players)).toEqual([2, 1])
    const preceding = engagement(input, scope, stats.days, range)
    expect(preceding.end).toBe(stats.start)
    expect(preceding.period.hours).toBe(0)
  })
  it("keeps missing range totals unknown while showing covered daily observations", () => {
    const stats = engagement(data([fact("a", 1)]), scope, 0, { from: "2026-07-01", to: "2026-10-13" })
    expect(stats.period.available).toBe(false)
    expect(stats.dailyAvailable).toBe(true)
    expect(stats.trend[0]?.players).toBeNull()
    expect(stats.trend.at(-1)?.players).toBe(1)
  })
  it("observes returns after a selected acquisition range without mixing in other cohorts", () => {
    const stats = engagement(
      data([fact("a", 8), fact("b", 8), fact("a", 1, 8), fact("other", 2), fact("other", 1, 2)]),
      scope,
      0,
      { from: "2026-10-06", to: "2026-10-06" }
    )
    expect(stats.period.players).toBe(2)
    expect(
      retentionSummary(stats.cohortFacts, stats.cohortUntil, 7, stats.coveredFrom, {
        from: stats.start,
        until: stats.end
      })
    ).toEqual({ total: 2, returned: 1, rate: 50 })
  })
})
