import { useMediaQuery } from "@mantine/hooks"
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import {
  addDays,
  addMonths,
  createPeriod,
  dayKey,
  isDay,
  periodLabel,
  presetGroups,
  rangeError,
  recentPresets,
  type DatePeriod,
  type PeriodKey
} from "../lib/date-range"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet"
import "./date-range-picker.css"

/** Copacker's grouped preset/calendar interaction, adapted to Spawn's Radix-based Shadcn primitives. */
export function DateRangePicker({
  value,
  onChange,
  now,
  label = "Date range",
  recent = false,
  completeDays = false
}: {
  value: DatePeriod
  onChange: (period: DatePeriod) => void
  now: number
  label?: string
  recent?: boolean
  completeDays?: boolean
}) {
  const mobile = useMediaQuery("(max-width: 600px)")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const maxDay = completeDays ? addDays(dayKey(now), -1) : dayKey(now)
  const minDay = addDays(maxDay, -1097)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [group, setGroup] = useState<"main" | "last" | "toDate">("main")
  const [month, setMonth] = useState(value.range.to.slice(0, 7))
  const [anchor, setAnchor] = useState<string | null>(null)
  const [focusDay, setFocusDay] = useState(value.range.to)
  const calendar = useRef<HTMLTableElement>(null),
    moveFocus = useRef(false)
  const error = rangeError(draft.range, maxDay)
  const errorId = useId()
  useEffect(() => {
    if (moveFocus.current) {
      calendar.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus()
      moveFocus.current = false
    }
  }, [focusDay, month])
  function changeOpen(next: boolean) {
    if (next) {
      setDraft(value)
      setGroup("main")
      setMonth(value.range.to.slice(0, 7))
      setFocusDay(value.range.to)
      setAnchor(null)
    }
    setOpen(next)
  }
  function choosePreset(key: Exclude<PeriodKey, "custom">) {
    const next = createPeriod(key, now, completeDays)
    setDraft(next)
    setMonth(next.range.to.slice(0, 7))
    setFocusDay(next.range.to)
    setAnchor(null)
  }
  function chooseDay(day: string) {
    setFocusDay(day)
    if (!anchor) {
      setAnchor(day)
      setDraft({ key: "custom", range: { from: day, to: day } })
    } else {
      setDraft({ key: "custom", range: anchor <= day ? { from: anchor, to: day } : { from: day, to: anchor } })
      setAnchor(null)
    }
  }
  function typeDate(end: "from" | "to", value: string) {
    setDraft((previous) => ({ key: "custom", range: { ...previous.range, [end]: value } }))
    setAnchor(null)
    if (isDay(value) && value >= minDay && value <= maxDay) {
      setMonth(value.slice(0, 7))
      setFocusDay(value)
    }
  }
  function navigateMonth(amount: number) {
    const next = addMonths(month, amount)
    setMonth(next)
    setFocusDay(next === maxDay.slice(0, 7) ? maxDay : next === minDay.slice(0, 7) ? minDay : `${next}-01`)
  }
  function calendarKey(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday }[
      event.key
    ]
    let next = offset === undefined ? null : addDays(day, offset)
    if (event.key === "PageUp" || event.key === "PageDown") {
      const nextMonth = addMonths(day.slice(0, 7), event.key === "PageUp" ? -1 : 1)
      next = `${nextMonth}-${day.slice(8)}`
      if (!isDay(next)) next = addDays(`${addMonths(nextMonth, 1)}-01`, -1)
    }
    if (!next) return
    event.preventDefault()
    next = next < minDay ? minDay : next > maxDay ? maxDay : next
    moveFocus.current = true
    setFocusDay(next)
    setMonth(next.slice(0, 7))
  }
  const formatDay = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    })
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  })
  const lead = new Date(`${month}-01T00:00:00Z`).getUTCDay()
  const length = Number(addDays(`${addMonths(month, 1)}-01`, -1).slice(8))
  const weeks = Array.from({ length: Math.ceil((lead + length) / 7) }, (_, row) =>
    Array.from({ length: 7 }, (_, col) => {
      const index = row * 7 + col - lead
      return index < 0 || index >= length ? null : addDays(`${month}-01`, index)
    })
  )
  const presetButton = (option: { key: Exclude<PeriodKey, "custom">; label: string }) => (
    <button
      key={option.key}
      type="button"
      className="date-preset"
      aria-pressed={draft.key === option.key}
      disabled={Boolean(rangeError(createPeriod(option.key, now, completeDays).range, maxDay))}
      onClick={() => choosePreset(option.key)}
    >
      {option.label}
    </button>
  )
  const groupButton = (key: "last" | "toDate", text: string) => (
    <button
      type="button"
      className="date-preset"
      aria-pressed={presetGroups[key].some((option) => option.key === draft.key)}
      onClick={() => setGroup(key)}
    >
      {text}
      <ChevronRight className="size-4" />
    </button>
  )
  const trigger = (
    <Button
      ref={triggerRef}
      variant="outline"
      className="date-range-trigger"
      aria-label={`${label}: ${periodLabel(value)}`}
      title={`${value.range.from} to ${value.range.to} (UTC)`}
    >
      <CalendarDays className="size-4 text-muted-foreground" />
      <span>{periodLabel(value)}</span>
      <ChevronDown className="size-3.5 text-muted-foreground" />
    </Button>
  )
  const content = (
    <>
      <div className="date-picker-layout">
        <div className="date-presets" aria-label="Date presets">
          {group === "main" ? (
            <>
              {recent && (
                <>
                  <div className="date-preset-group">Recent</div>
                  {recentPresets.map(presetButton)}
                  <div className="date-divider" />
                </>
              )}
              {presetGroups.single.filter((option) => !completeDays || option.key !== "today").map(presetButton)}
              <div className="date-divider" />
              {groupButton("last", "Last")}
              {groupButton("toDate", "Period to date")}
              <div className="date-divider" />
              <button
                type="button"
                className="date-preset"
                aria-pressed={draft.key === "custom"}
                onClick={() => {
                  setDraft((previous) => ({ ...previous, key: "custom" }))
                  setAnchor(null)
                }}
              >
                Custom range
              </button>
            </>
          ) : (
            <>
              <button type="button" className="date-preset date-preset-back" onClick={() => setGroup("main")}>
                <ArrowLeft className="size-4" />
                {group === "last" ? "Last" : "Period to date"}
              </button>
              {presetGroups[group].map(presetButton)}
            </>
          )}
        </div>
        <div className="date-calendar-panel">
          <div className="date-inputs">
            <label htmlFor={`${errorId}-start`}>
              Start date
              <Input
                id={`${errorId}-start`}
                type="date"
                aria-label="Start date"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                value={draft.range.from}
                min={minDay}
                max={maxDay}
                onChange={(event) => typeDate("from", event.target.value)}
              />
            </label>
            <ArrowRight className="size-4 text-muted-foreground" />
            <label htmlFor={`${errorId}-end`}>
              End date
              <Input
                id={`${errorId}-end`}
                type="date"
                aria-label="End date"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                value={draft.range.to}
                min={minDay}
                max={maxDay}
                onChange={(event) => typeDate("to", event.target.value)}
              />
            </label>
          </div>
          <div className="date-calendar-heading">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              disabled={month <= minDay.slice(0, 7)}
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft />
            </Button>
            <span aria-live="polite">{monthLabel}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              disabled={month >= maxDay.slice(0, 7)}
              onClick={() => navigateMonth(1)}
            >
              <ChevronRight />
            </Button>
          </div>
          {/* The calendar implements an interactive ARIA grid with roving focus and arrow navigation. */}
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role */}
          <table ref={calendar} className="date-calendar" role="grid" aria-label={monthLabel}>
            <thead>
              <tr>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <th key={day} scope="col">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, row) => (
                <tr key={row}>
                  {week.map((day, col) => {
                    const edge = day === draft.range.from || day === draft.range.to
                    const selected = day !== null && day >= draft.range.from && day <= draft.range.to
                    return (
                      <td key={day ?? `blank-${col}`} aria-selected={selected} data-between={selected && !edge}>
                        {day && (
                          <button
                            type="button"
                            data-day={day}
                            data-edge={edge}
                            aria-label={formatDay(day)}
                            aria-current={day === dayKey(now) ? "date" : undefined}
                            tabIndex={day === focusDay ? 0 : -1}
                            disabled={day > maxDay || day < minDay}
                            onKeyDown={(event) => calendarKey(event, day)}
                            onClick={() => chooseDay(day)}
                          >
                            {Number(day.slice(8))}
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {error && (
            <p id={errorId} role="alert" className="date-range-error">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="date-picker-footer">
        <span>{completeDays ? "Complete days (UTC)" : "UTC"}</span>
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={Boolean(error)}
          onClick={() => {
            setOpen(false)
            onChange(draft)
          }}
        >
          Apply
        </Button>
      </div>
    </>
  )
  function restoreFocus(event: Event) {
    event.preventDefault()
    if (document.activeElement === document.body || contentRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus()
    }
  }
  return mobile ? (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        ref={contentRef}
        side="bottom"
        className="date-range-sheet"
        showCloseButton={false}
        aria-label={`Choose ${label.toLowerCase()}`}
        aria-labelledby={undefined}
        aria-describedby={undefined}
        onCloseAutoFocus={restoreFocus}
      >
        <SheetTitle className="date-sheet-title">Date range</SheetTitle>
        {content}
      </SheetContent>
    </Sheet>
  ) : (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        aria-hidden={!open}
        inert={!open}
        align="end"
        collisionPadding={12}
        className="date-range-popover"
        aria-label={`Choose ${label.toLowerCase()}`}
        onCloseAutoFocus={restoreFocus}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
