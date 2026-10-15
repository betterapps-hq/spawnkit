import { ArrowUpRight, Info } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import { TrendChart } from "./charts"
import { number, type series } from "./model"

export function Panel({
  title,
  subtitle,
  action,
  children,
  className
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("an-panel", className)}>
      <div className="an-panel-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
export function Tone({
  children,
  tone = "neutral"
}: {
  children: ReactNode
  tone?: "good" | "bad" | "warning" | "purple" | "neutral"
}) {
  return (
    <span className="an-tone" data-tone={tone}>
      {children}
    </span>
  )
}
export function Metric({
  label,
  value,
  change,
  good,
  neutral = false,
  detail
}: {
  label: string
  value: string
  change: string
  good: boolean
  neutral?: boolean
  detail: string
}) {
  return (
    <div className="an-metric">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger aria-label={`About ${label}`}>
            <Info className="size-3" />
          </TooltipTrigger>
          <TooltipContent className="max-w-64 leading-5">{detail}</TooltipContent>
        </Tooltip>
      </div>
      <div className="an-metric-value">{value}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={
            neutral || change === "No baseline"
              ? "text-muted-foreground text-[10px]"
              : good
                ? "an-positive"
                : "an-negative"
          }
        >
          {change}
        </span>
      </div>
    </div>
  )
}
export function Spark({ values, bad = false }: { values: number[]; bad?: boolean }) {
  const max = Math.max(...values, 1)
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 96 28"
      className={cn("h-7 w-24 shrink-0", bad ? "text-rose-500" : "text-primary")}
    >
      <polyline
        points={values
          .map((value, index) => `${(index * 96) / Math.max(1, values.length - 1)},${26 - (value / max) * 23}`)
          .join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
export function ActivityChart({ points, onInspect }: { points: ReturnType<typeof series>; onInspect?: () => void }) {
  const multipleDays =
    points.length > 1 &&
    new Date(points[0]!.time).toISOString().slice(0, 10) !== new Date(points.at(-1)!.time).toISOString().slice(0, 10)
  const timestamp = new Intl.DateTimeFormat("en-US", {
    ...(multipleDays && { month: "short", day: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC"
  })
  const onlyIssues = points.every((point) => point.count === point.errors)
  const fields = onlyIssues
    ? [{ key: "errors", label: "Affected sessions", color: "var(--an-bad)" }]
    : [
        { key: "count", label: "Sessions", color: "var(--primary)" },
        { key: "errors", label: "With issues", color: "var(--an-bad)" }
      ]
  return (
    <div className="pb-4">
      <div className="an-chart-legend">
        {fields.map((field) => (
          <span key={field.key}>
            <i className="an-dot" style={{ background: field.color }} />
            {field.label}
          </span>
        ))}
        <span className="ml-auto">UTC</span>
      </div>
      <TrendChart
        points={points.map((point) => ({ ...point, label: timestamp.format(point.time) }))}
        fields={fields}
        height={180}
        label="Sessions over the selected period"
      />
      {onInspect && (
        <button className="an-text-link mx-5 mt-1" onClick={onInspect}>
          Sessions <ArrowUpRight className="size-3.5" />
        </button>
      )}
    </div>
  )
}
export function Breakdown({
  values,
  total,
  onSelect,
  unit
}: {
  values: { label: string; value: number }[]
  total: number
  unit?: string
  onSelect?: (value: string) => void
}) {
  return (
    <div className="space-y-4 p-5 pt-1">
      {values.map((entry, index) => (
        <div key={entry.label}>
          <div className="mb-2 flex justify-between gap-3 text-xs">
            {onSelect ? (
              <button className="an-text-link" onClick={() => onSelect(entry.label)}>
                {entry.label}
              </button>
            ) : (
              <span>{entry.label}</span>
            )}
            <span className="tabular-nums text-muted-foreground">
              {number(entry.value)}
              {unit ?? <span className="ml-2">{total ? Math.round((entry.value / total) * 100) : 0}%</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${total ? (entry.value / total) * 100 : 0}%`,
                background: ["var(--primary)", "#a996d6", "#cdc1e7"][index % 3]
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
export function Blank({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="an-blank">
      <div className="an-empty-glyph" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
