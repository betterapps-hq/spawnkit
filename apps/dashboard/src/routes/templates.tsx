import { isTemplateId, type TemplateId } from "@spawn/templates/catalog"
import { createFileRoute } from "@tanstack/react-router"
import { TemplatesPage } from "@/components/public/templates-page"
export const Route = createFileRoute("/templates")({
  validateSearch: (search: Record<string, unknown>): { engine?: TemplateId } =>
    typeof search.engine === "string" && isTemplateId(search.engine) ? { engine: search.engine } : {},
  head: () => ({
    meta: [
      { title: "Build your starter kit — SpawnKit" },
      {
        name: "description",
        content:
          "Choose PixiJS, Phaser, Babylon.js, or Three.js. Add physics, testing, and telemetry, then download a standalone game project."
      }
    ]
  }),
  component: TemplatesRoute
})
function TemplatesRoute() {
  const { engine } = Route.useSearch()
  return <TemplatesPage key={engine ?? "pixi"} initialEngine={engine ?? "pixi"} />
}
