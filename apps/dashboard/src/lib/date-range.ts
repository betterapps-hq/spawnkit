// Adapted from Copacker's Shopify-style period picker. Calendar keys are UTC days.
const DAY_MS = 86_400_000
export const addDays = (key: string, count: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10)
export function addMonths(month: string, count: number) {
  const [year, index] = month.split("-").map(Number)
  return new Date(Date.UTC(year!, index! - 1 + count, 1)).toISOString().slice(0, 7)
}
export const dayKey = (time: number) => new Date(time).toISOString().slice(0, 10)
export type DayRange = { from: string; to: string }

export const presetGroups = {
  single: [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" }
  ],
  last: [
    { key: "last7", label: "Last 7 days" },
    { key: "last30", label: "Last 30 days" },
    { key: "last90", label: "Last 90 days" },
    { key: "last365", label: "Last 365 days" },
    { key: "lastWeek", label: "Last week" },
    { key: "lastMonth", label: "Last month" },
    { key: "lastQuarter", label: "Last quarter" },
    { key: "last12Months", label: "Last 12 months" },
    { key: "lastYear", label: "Last year" }
  ],
  toDate: [
    { key: "weekToDate", label: "Week to date" },
    { key: "monthToDate", label: "Month to date" },
    { key: "quarterToDate", label: "Quarter to date" },
    { key: "yearToDate", label: "Year to date" }
  ]
} as const

export type PresetKey = (typeof presetGroups)[keyof typeof presetGroups][number]["key"]
const presets: readonly { key: PresetKey; label: string }[] = Object.values(presetGroups).flat()

const month = (day: string) => day.slice(0, 7)
const endOfMonth = (key: string) => addDays(`${addMonths(key, 1)}-01`, -1)
const quarterStart = (day: string) => {
  const index = Number(day.slice(5, 7)) - 1
  return `${day.slice(0, 4)}-${String(index - (index % 3) + 1).padStart(2, "0")}`
}
// Weeks start on Sunday, as in Shopify's calendar.
const weekStart = (day: string) => addDays(day, -new Date(`${day}T00:00:00Z`).getUTCDay())

// The days a preset covers, ending today at the latest.
export function presetRange(key: PresetKey, today: string): DayRange {
  const yesterday = addDays(today, -1)
  const thisMonth = month(today)
  switch (key) {
    case "today":
      return { from: today, to: today }
    case "yesterday":
      return { from: yesterday, to: yesterday }
    case "last7":
      return { from: addDays(today, -7), to: yesterday }
    case "last30":
      return { from: addDays(today, -30), to: yesterday }
    case "last90":
      return { from: addDays(today, -90), to: yesterday }
    case "last365":
      return { from: addDays(today, -365), to: yesterday }
    case "lastWeek": {
      const start = addDays(weekStart(today), -7)
      return { from: start, to: addDays(start, 6) }
    }
    case "lastMonth": {
      const previous = addMonths(thisMonth, -1)
      return { from: `${previous}-01`, to: endOfMonth(previous) }
    }
    case "lastQuarter": {
      const start = addMonths(quarterStart(today), -3)
      return { from: `${start}-01`, to: endOfMonth(addMonths(start, 2)) }
    }
    case "last12Months":
      return { from: `${addMonths(thisMonth, -12)}-01`, to: endOfMonth(addMonths(thisMonth, -1)) }
    case "lastYear": {
      const year = Number(today.slice(0, 4)) - 1
      return { from: `${year}-01-01`, to: `${year}-12-31` }
    }
    case "weekToDate":
      return { from: weekStart(today), to: today }
    case "monthToDate":
      return { from: `${thisMonth}-01`, to: today }
    case "quarterToDate":
      return { from: `${quarterStart(today)}-01`, to: today }
    case "yearToDate":
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
  }
}

// Days from one day to another, both included.
export function rangeDays(range: DayRange) {
  return Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1
}

const dayFormat = (withYear: boolean, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    ...(withYear && { year: "numeric" }),
    timeZone: "UTC"
  })

// "Sep 26, 2026", or "Aug 27 – Sep 25, 2026" (with both years when they differ), in the given language.
export function rangeLabel(range: DayRange, locale = "en-US") {
  const day = (key: string, withYear: boolean) => dayFormat(withYear, locale).format(new Date(`${key}T00:00:00Z`))
  if (range.from === range.to) {
    return day(range.from, true)
  }
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4)
  return `${day(range.from, !sameYear)} – ${day(range.to, true)}`
}

export const recentPresets = [
  { key: "last1h", label: "Last hour", hours: 1 },
  { key: "last6h", label: "Last 6 hours", hours: 6 },
  { key: "last24h", label: "Last 24 hours", hours: 24 },
  { key: "last48h", label: "Last 48 hours", hours: 48 }
] as const
export type PeriodKey = PresetKey | (typeof recentPresets)[number]["key"] | "custom"
export type DatePeriod = { key: PeriodKey; range: DayRange }
export function isDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time) && dayKey(time) === value
}
export function rangeError(range: DayRange, maxDay: string) {
  if (!isDay(range.from) || !isDay(range.to)) return "Enter a valid start and end date."
  if (range.from > range.to) return "Start date must be on or before end date."
  if (range.to > maxDay) return `Choose a date on or before ${rangeLabel({ from: maxDay, to: maxDay })}.`
  if (rangeDays(range) > 1098 || range.from < addDays(maxDay, -1097)) return "Choose dates within the last three years."
  return null
}
export function createPeriod(key: Exclude<PeriodKey, "custom">, now: number, completeDays = false): DatePeriod {
  const recent = recentPresets.find((preset) => preset.key === key)
  if (recent) return { key, range: { from: dayKey(now - recent.hours * 3_600_000), to: dayKey(now) } }
  const range = presetRange(key as PresetKey, dayKey(now))
  const maxDay = completeDays ? addDays(dayKey(now), -1) : dayKey(now)
  return { key, range: { ...range, to: range.to > maxDay ? maxDay : range.to } }
}
export function periodLabel(period: DatePeriod) {
  return period.key === "custom"
    ? rangeLabel(period.range)
    : [...presets, ...recentPresets].find((preset) => preset.key === period.key)!.label
}
/** Half-open UTC interval; current-day selections stop at the supplied clock. */
export function periodBounds(period: DatePeriod, now: number) {
  const recent = recentPresets.find((preset) => preset.key === period.key)
  if (recent) return { from: now - recent.hours * 3_600_000, until: now + 1 }
  return {
    from: Date.parse(`${period.range.from}T00:00:00Z`),
    until: Math.min(Date.parse(`${addDays(period.range.to, 1)}T00:00:00Z`), now + 1)
  }
}
