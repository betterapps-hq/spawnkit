import { createProjectPlan } from "@spawn/templates"
import { resolveComposition, selectedComponents } from "@spawn/templates/composition"
import { findStarterKit } from "@spawn/templates/kits"

export function starterKitPlan(id: string) {
  const kit = findStarterKit(id)
  if (!kit) throw new Error("Unknown starter kit")
  const selection = selectedComponents({
    name: `${kit.id}-game`,
    template: kit.template,
    physics: kit.physics,
    ui: "html",
    telemetry: "none",
    addons: ["vitest"]
  })
  const resolved = resolveComposition(`${kit.id}-game`, selection)
  if ("issue" in resolved) throw new Error(resolved.issue.message)
  return createProjectPlan(resolved.plan.options)
}
