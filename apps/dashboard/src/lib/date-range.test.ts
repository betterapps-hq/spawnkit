import { describe, expect, it } from "vitest"
import {
  addDays,
  addMonths,
  createPeriod,
  isDay,
  periodBounds,
  presetRange,
  rangeDays,
  rangeError,
  rangeLabel
} from "./date-range"

describe("UTC date ranges", () => {
  const now = Date.UTC(2026, 9, 14, 18)
  it("uses complete preceding days and calendar boundaries for presets", () => {
    expect(presetRange("last7", "2026-10-14")).toEqual({ from: "2026-10-07", to: "2026-10-13" })
    expect(presetRange("lastMonth", "2024-03-15")).toEqual({ from: "2024-02-01", to: "2024-02-29" })
    expect(presetRange("lastQuarter", "2026-01-03")).toEqual({ from: "2025-10-01", to: "2025-12-31" })
    expect(presetRange("lastWeek", "2026-10-14")).toEqual({ from: "2026-10-04", to: "2026-10-10" })
    expect(presetRange("last12Months", "2026-10-14")).toEqual({ from: "2025-10-01", to: "2026-09-30" })
    expect(presetRange("lastYear", "2026-10-14")).toEqual({ from: "2025-01-01", to: "2025-12-31" })
    expect(rangeDays(presetRange("last365", "2024-03-15"))).toBe(365)
  })
  it("keeps daylight-saving transitions, leap days and year changes in UTC", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09")
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29")
    expect(addMonths("2026-01", -1)).toBe("2025-12")
    expect(rangeDays({ from: "2026-03-07", to: "2026-03-09" })).toBe(3)
    expect(rangeLabel({ from: "2025-12-31", to: "2026-01-02" })).toBe("Dec 31, 2025 – Jan 2, 2026")
  })
  it("uses inclusive calendar dates with an exclusive end, and truncates today at the clock", () => {
    expect(periodBounds(createPeriod("yesterday", now), now)).toEqual({
      from: Date.UTC(2026, 9, 13),
      until: Date.UTC(2026, 9, 14)
    })
    expect(periodBounds(createPeriod("today", now), now)).toEqual({ from: Date.UTC(2026, 9, 14), until: now + 1 })
    expect(periodBounds(createPeriod("last6h", now), now)).toEqual({ from: now - 6 * 3_600_000, until: now + 1 })
    expect(createPeriod("monthToDate", now, true).range).toEqual({ from: "2026-10-01", to: "2026-10-13" })
    // There is no complete month-to-date day on the first of the month.
    const empty = createPeriod("monthToDate", Date.UTC(2026, 9, 1, 12), true)
    expect(rangeError(empty.range, "2026-09-30")).not.toBeNull()
  })
  it("rejects malformed, reversed, future and unbounded ranges", () => {
    for (const invalid of ["", "2026-02-29", "2026-13-01", "2026-00-00", "2026-10-32", "26-1-1"])
      expect(isDay(invalid)).toBe(false)
    expect(isDay("2024-02-29")).toBe(true)
    expect(rangeError({ from: "2026-10-13", to: "2026-10-12" }, "2026-10-14")).toContain("Start date")
    expect(rangeError({ from: "2026-10-13", to: "2026-10-15" }, "2026-10-14")).toContain("on or before")
    expect(rangeError({ from: "2020-01-01", to: "2020-01-02" }, "2026-10-14")).toContain("three years")
    expect(rangeError({ from: "2026-10-12", to: "2026-10-12" }, "2026-10-14")).toBeNull()
  })
})
