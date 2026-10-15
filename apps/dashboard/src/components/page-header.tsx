import type { ReactNode } from "react"
export function PageHeader({
  title,
  description,
  actions,
  eyebrow
}: {
  title: string
  description?: string | undefined
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2" aria-label="Page actions">
          {actions}
        </div>
      )}
    </div>
  )
}
