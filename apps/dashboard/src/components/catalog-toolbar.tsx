import { Search } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

export function CatalogToolbar({
  search,
  onSearch,
  dimension,
  onDimension,
  label,
  children
}: {
  search: string
  onSearch: (value: string) => void
  dimension: string
  onDimension: (value: string) => void
  label: string
  children?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="relative min-w-40 flex-1">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          aria-label={`Search ${label}`}
          placeholder={`Search ${label}…`}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="bg-card pl-9"
        />
      </div>
      {children}
      <fieldset aria-label="Dimensions" className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px]">
        {["all", "2d", "3d"].map((value) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={dimension === value}
            onClick={() => onDimension(value)}
            className={cn(
              "h-7 px-2 text-xs text-muted-foreground",
              dimension === value && "bg-background text-foreground shadow-sm"
            )}
          >
            {value === "all" ? "All" : value.toUpperCase()}
          </Button>
        ))}
      </fieldset>
    </div>
  )
}
