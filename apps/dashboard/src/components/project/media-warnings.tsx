import { TriangleAlert } from "lucide-react"
import type { Release } from "./model"

export function MediaWarnings({ warnings }: { warnings?: Release["build"]["mediaWarnings"] }) {
  if (!warnings?.length) return null
  return (
    <section
      aria-label="Media warnings"
      className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
      <div className="min-w-0 space-y-2">
        <h2 className="font-semibold">Some media could not be included</h2>
        <ul className="space-y-1.5 text-muted-foreground">
          {warnings.map((warning, index) => (
            <li key={index} className="break-words">
              <span className="font-medium text-foreground">
                {warning.kind === "cover" ? "Cover image" : "Trailer"} omitted:
              </span>{" "}
              {warning.message}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Update the file in your project and deploy again to include it.</p>
      </div>
    </section>
  )
}
