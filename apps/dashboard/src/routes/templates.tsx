import { isTemplateId, type TemplateId } from "@spawn/templates/catalog"
import { createFileRoute } from "@tanstack/react-router"
import { TemplatesPage } from "@/components/public/templates-page"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/templates")({
  validateSearch: (search: Record<string, unknown>): { engine?: TemplateId } =>
    typeof search.engine === "string" && isTemplateId(search.engine) ? { engine: search.engine } : {},
  head: () => publicPageHead("/templates"),
  component: TemplatesRoute
})
function TemplatesRoute() {
  const { engine } = Route.useSearch()
  return <TemplatesPage key={engine ?? "pixi"} initialEngine={engine ?? "pixi"} />
}
