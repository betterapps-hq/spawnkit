import type { ReactNode } from "react"
import { Badge } from "../ui/badge"

const environments = {
  production: {
    label: "Production",
    className:
      "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
  },
  staging: {
    label: "Staging",
    className:
      "border-violet-200 dark:border-violet-500/25 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
  },
  preview: { label: "Preview", className: "" }
}

/** Shared environment identity; health and build status use StatusBadge separately. */
export function EnvironmentBadge({
  environment,
  children
}: {
  environment: keyof typeof environments | "sandbox"
  children?: ReactNode
}) {
  const style = environments[environment === "sandbox" ? "staging" : environment]
  return (
    <Badge variant={environment === "preview" ? "secondary" : "outline"} className={`text-[10px] ${style.className}`}>
      {children ?? (environment === "sandbox" ? "Sandbox" : style.label)}
    </Badge>
  )
}
