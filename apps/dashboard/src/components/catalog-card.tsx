import type { TemplateId } from "@spawn/templates/catalog"
import { ArrowRight, Check } from "lucide-react"
import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { EngineBadge } from "./engine-badge"
import { Badge } from "./ui/badge"

export function CatalogGrid({ children, examples = false }: { children: ReactNode; examples?: boolean }) {
  return (
    <div className="@container">
      <div
        data-testid="catalog-grid"
        className={cn("grid gap-4 @min-[24rem]:grid-cols-2", examples && "@min-[48rem]:grid-cols-3")}
      >
        {children}
      </div>
    </div>
  )
}

export function CatalogCard({
  name,
  description,
  image,
  engine,
  dimension,
  genre,
  recommended,
  selected,
  onSelect
}: {
  name: string
  description: string
  image: string
  engine: TemplateId
  dimension: string
  genre?: string
  recommended?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const descriptionId = useId()
  const content = (
    <>
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={image}
          alt={onSelect ? "" : `${name} concept screenshot`}
          width="960"
          height="540"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <EngineBadge engine={engine} planned={!onSelect} />
        <span className="absolute right-3 top-3 z-10 rounded border border-white/60 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-[#292333]">
          {dimension.toUpperCase()}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold" aria-label={name}>
            {onSelect ? (
              <button
                type="button"
                aria-label={`Select ${name}`}
                aria-describedby={descriptionId}
                aria-pressed={selected}
                onClick={onSelect}
                className="after:absolute after:inset-0 after:z-20 focus-visible:outline-none"
              >
                {name}
              </button>
            ) : (
              name
            )}
          </h3>
          {onSelect && (
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                selected && "border-primary bg-primary text-white"
              )}
            >
              {selected && <Check className="size-3" />}
            </span>
          )}
        </div>
        <p id={descriptionId} className="mt-2 min-h-15 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
        <div className="mt-auto flex min-h-9 items-end gap-2 pt-4">
          {recommended && (
            <Badge variant="secondary" className="text-[9px]">
              Recommended
            </Badge>
          )}
          {genre && (
            <Badge variant="secondary" className="text-[9px]">
              {genre}
            </Badge>
          )}
          {onSelect ? (
            <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
          ) : (
            <span
              className="ml-auto text-[10px] text-muted-foreground"
              title="Game concept with illustrative artwork; no playable template yet."
            >
              Concept
            </span>
          )}
        </div>
      </div>
    </>
  )
  const className = cn(
    "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-left shadow-xs",
    selected && "border-primary ring-1 ring-primary"
  )
  return (
    <article
      className={cn(
        className,
        onSelect && "transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring"
      )}
    >
      {content}
    </article>
  )
}
