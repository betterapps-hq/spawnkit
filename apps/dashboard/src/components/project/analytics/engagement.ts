import { addDays, type DayRange } from "../../../lib/date-range"
import type { AnalyticsData, AnalyticsScope, PlayerDay } from "./model"

export const DAY = 86_400_000
export const utcDay = (time: number) => Math.floor(time / DAY) * DAY
export const shortDate = (day: number) =>
  new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const distinct = (facts: PlayerDay[]) => new Set(facts.map((fact) => fact.playerId)).size

// Windows end at midnight. Partial days never masquerade as a complete DAU or retention cohort.
export function engagement(
  data: AnalyticsData,
  scope: Pick<AnalyticsScope, "environment">,
  offset = 0,
  range?: DayRange
) {
  const end =
    Math.min(utcDay(data.now), range ? Date.parse(`${addDays(range.to, 1)}T00:00:00Z`) : Infinity) - offset * DAY
  const start = range ? Date.parse(`${range.from}T00:00:00Z`) - offset * DAY : end - 30 * DAY
  const coverage = data.playerCoverage?.find((range) => range.environment === scope.environment)
  const coveredFrom = coverage?.from ?? end
  const coveredUntil = Math.min(coverage?.until ?? end, end)
  const covered = (from: number, until: number) => Boolean(coverage && from >= coveredFrom && until <= coveredUntil)
  const facts = (data.playerDays ?? []).filter(
    (fact) =>
      fact.environment === scope.environment && fact.day >= coveredFrom && fact.day < coveredUntil && fact.day < end
  )
  const window = (days: number) => facts.filter((fact) => fact.day >= end - days * DAY)
  const daily = window(1),
    monthly = window(30)
  const dau = distinct(daily),
    mau = distinct(monthly)
  const seconds = daily.reduce((sum, fact) => sum + fact.activeSeconds, 0)
  const sessions = daily.reduce((sum, fact) => sum + fact.sessions, 0)
  const periodFacts = facts.filter((fact) => fact.day >= start)
  const periodPlayers = distinct(periodFacts)
  const periodSeconds = periodFacts.reduce((sum, fact) => sum + fact.activeSeconds, 0)
  const periodSessions = periodFacts.reduce((sum, fact) => sum + fact.sessions, 0)
  const days = Math.max(0, Math.round((end - start) / DAY))
  const cohortUntil = Math.min(coverage?.until ?? utcDay(data.now), utcDay(data.now))
  return {
    start,
    end,
    days,
    cohortUntil,
    cohortFacts: (data.playerDays ?? []).filter(
      (fact) => fact.environment === scope.environment && fact.day >= coveredFrom && fact.day < cohortUntil
    ),
    period: {
      available: days > 0 && covered(start, end),
      players: periodPlayers,
      newPlayers: distinct(periodFacts.filter((fact) => fact.firstSeen >= start)),
      returningPlayers: distinct(periodFacts.filter((fact) => fact.firstSeen < start)),
      hours: periodSeconds / 3600,
      minutesPerPlayer: periodPlayers ? periodSeconds / 60 / periodPlayers : 0,
      minutesPerSession: periodSessions ? periodSeconds / 60 / periodSessions : 0,
      sessionsPerPlayer: periodPlayers ? periodSessions / periodPlayers : 0,
      levelStarts: periodFacts.reduce((sum, fact) => sum + fact.levelStarts, 0),
      levelCompletions: periodFacts.reduce((sum, fact) => sum + fact.levelCompletions, 0)
    },
    coveredFrom,
    coveredUntil,
    dailyAvailable: covered(end - DAY, end),
    weeklyAvailable: covered(end - 7 * DAY, end),
    monthlyAvailable: covered(end - 30 * DAY, end),
    facts,
    daily,
    dau,
    mau,
    wau: distinct(window(7)),
    hours: seconds / 3600,
    minutesPerPlayer: dau ? seconds / 60 / dau : 0,
    minutesPerSession: sessions ? seconds / 60 / sessions : 0,
    sessionsPerPlayer: dau ? sessions / dau : 0,
    stickiness: mau ? (dau / mau) * 100 : 0,
    newPlayers: distinct(daily.filter((fact) => utcDay(fact.firstSeen) === end - DAY)),
    levelStarts: daily.reduce((sum, fact) => sum + fact.levelStarts, 0),
    levelCompletions: daily.reduce((sum, fact) => sum + fact.levelCompletions, 0),
    trend: Array.from({ length: days }, (_, index) => {
      const day = start + index * DAY
      const rows = facts.filter((fact) => fact.day === day)
      return {
        day,
        label: shortDate(day),
        players: covered(day, day + DAY) ? distinct(rows) : null,
        newPlayers: covered(day, day + DAY) ? distinct(rows.filter((fact) => utcDay(fact.firstSeen) === day)) : null,
        hours: covered(day, day + DAY)
          ? Math.round(rows.reduce((sum, fact) => sum + fact.activeSeconds, 0) / 3600)
          : null
      }
    })
  }
}

/** Exact-day retention; null means the cohort has not yet had a complete return day. */
export function retention(
  facts: PlayerDay[],
  end: number,
  cohortDay: number,
  returnDay: number,
  coveredFrom = -Infinity
) {
  const cohort = new Set(
    facts.filter((fact) => fact.day === cohortDay && utcDay(fact.firstSeen) === cohortDay).map((fact) => fact.playerId)
  )
  if (cohortDay < coveredFrom || cohortDay + (returnDay + 1) * DAY > end || !cohort.size)
    return { total: cohort.size, returned: null, rate: null }
  const returned = new Set(
    facts
      .filter((fact) => fact.day === cohortDay + returnDay * DAY && cohort.has(fact.playerId))
      .map((fact) => fact.playerId)
  ).size
  return { total: cohort.size, returned, rate: (returned / cohort.size) * 100 }
}

export function retentionSummary(
  facts: PlayerDay[],
  end: number,
  returnDay: number,
  coveredFrom = -Infinity,
  cohorts?: { from: number; until: number }
) {
  let total = 0,
    returned = 0
  const start = cohorts?.from ?? end - (returnDay + 30) * DAY
  const until = cohorts?.until ?? end - returnDay * DAY
  for (let day = start; day < until; day += DAY) {
    const result = retention(facts, end, day, returnDay, coveredFrom)
    if (result.returned !== null) {
      total += result.total
      returned += result.returned
    }
  }
  return { total, returned, rate: total ? (returned / total) * 100 : null }
}
