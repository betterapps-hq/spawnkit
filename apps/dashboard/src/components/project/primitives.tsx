import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, Pause, XCircle } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "../ui/badge"
import { Card } from "../ui/card"

const states = {
  unprovisioned: {
    label: "Not provisioned",
    icon: Clock3,
    className:
      "border-slate-200 dark:border-slate-500/25 bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300"
  },
  healthy: {
    label: "Healthy",
    icon: CheckCircle2,
    className:
      "border-emerald-200/70 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  },
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    className:
      "border-emerald-200/70 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  },
  active: {
    label: "Active",
    icon: CheckCircle2,
    className:
      "border-emerald-200/70 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  },
  building: {
    label: "Building",
    icon: LoaderCircle,
    className:
      "border-violet-200 dark:border-violet-500/25 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
  },
  queued: {
    label: "Queued",
    icon: Clock3,
    className:
      "border-slate-200 dark:border-slate-500/25 bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300"
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
  },
  banned: {
    label: "Banned",
    icon: XCircle,
    className: "border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
  },
  degraded: {
    label: "Needs attention",
    icon: AlertCircle,
    className:
      "border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300"
  },
  paused: {
    label: "Paused",
    icon: Pause,
    className:
      "border-slate-200 dark:border-slate-500/25 bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300"
  },
  empty: {
    label: "Not deployed",
    icon: Clock3,
    className:
      "border-slate-200 dark:border-slate-500/25 bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300"
  }
}
export function StatusBadge({ status }: { status: keyof typeof states }) {
  const { label, icon: Icon, className } = states[status]
  return (
    <Badge variant="outline" className={cn("gap-1.5 text-[10px] font-medium", className)}>
      <Icon className={cn("size-3", status === "building" && "animate-spin")} />
      {label}
    </Badge>
  )
}
export function Panel({
  title,
  action,
  children,
  className
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden p-0 shadow-xs", className)}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  )
}
export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl border bg-accent/40 text-primary">{icon}</span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
export function Metric({
  label,
  value,
  detail,
  trend
}: {
  label: string
  value: string
  detail: string
  trend?: number[]
}) {
  const points = trend?.map((n, i) => `${i * (120 / Math.max(1, trend.length - 1))},${40 - n * 0.35}`).join(" ")
  return (
    <Card className="relative min-w-0 gap-0 overflow-hidden p-5 shadow-xs">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
      {points && (
        <svg viewBox="0 0 120 44" className="absolute bottom-5 right-4 h-9 w-24 text-primary/45" aria-hidden="true">
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )}
    </Card>
  )
}
export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
        tone === "error"
          ? "border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300"
          : tone === "success"
            ? "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            : "border-primary/15 bg-accent/40 text-foreground"
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
