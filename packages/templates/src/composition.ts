import { addons, physicsOptions, templates, uiOptions, telemetryOptions } from "./catalog"
import type { AddonId, PhysicsId, UiId, TelemetryId, TemplateId } from "./catalog"
import type { ProjectOptions } from "./index"

type Category = "renderer" | "physics" | "ui" | "ecs" | "telemetry" | "tool"
type Component = { id: string; name: string; category: Category; requires: string[]; value: string }
export const componentCatalog: Component[] = [
  ...templates.map((entry) => ({
    id: entry.id,
    name: entry.name,
    category: "renderer" as const,
    requires: [],
    value: entry.id
  })),
  ...physicsOptions.map((entry) => ({
    id: entry.id === "none" ? "no-physics" : entry.id,
    name: entry.name,
    category: "physics" as const,
    requires: entry.renderers.length === 1 ? [entry.renderers[0]!] : [],
    value: entry.id
  })),
  ...uiOptions.map((entry) => ({
    id: entry.id === "none" ? "no-ui" : entry.id === "babylon" ? "babylon-gui" : `${entry.id}-ui`,
    name: entry.name,
    category: "ui" as const,
    requires: entry.renderers.length === 1 ? [entry.renderers[0]!] : [],
    value: entry.id
  })),
  ...telemetryOptions.map((entry) => ({
    id: entry.id === "none" ? "no-telemetry" : entry.id === "platform" ? "platform-telemetry" : entry.id,
    name: entry.name,
    category: "telemetry" as const,
    requires: [],
    value: entry.id
  })),
  { id: "no-ecs", name: "Plain TypeScript", category: "ecs", requires: [], value: "none" },
  ...addons.map((entry) => ({
    id: entry.id,
    name: entry.name,
    category: entry.id === "bitecs" || entry.id === "koota" ? ("ecs" as const) : ("tool" as const),
    requires: [],
    value: entry.id
  }))
]
const component = (id: string) => {
  const found = componentCatalog.find((entry) => entry.id === id)
  if (!found) {
    const suggestions = componentCatalog
      .filter((entry) => entry.id.includes(id) || id.includes(entry.id))
      .map((entry) => entry.id)
    throw new Error(
      `Unknown add-on: ${id}.${suggestions.length ? ` Did you mean ${suggestions.join(", ")}?` : " Run spawn addons to see supported names."}`
    )
  }
  return found
}
export function selectedComponents(options: ProjectOptions): string[] {
  return [
    options.template,
    options.physics && options.physics !== "none" ? options.physics : "no-physics",
    options.ui === "none" ? "no-ui" : options.ui === "babylon" ? "babylon-gui" : `${options.ui ?? "html"}-ui`,
    options.telemetry === "platform"
      ? "platform-telemetry"
      : options.telemetry && options.telemetry !== "none"
        ? options.telemetry
        : "no-telemetry",
    ...(options.addons ?? []),
    ...(!options.addons?.some((id) => id === "bitecs" || id === "koota") ? ["no-ecs"] : [])
  ]
}
export type ResolutionChoice = { label: string; requested: string[]; replace: string[] }
export type ResolutionIssue = { message: string; choices: ResolutionChoice[] }
export type Composition = {
  options: ProjectOptions
  requested: string[]
  required: { id: string; by: string }[]
  added: string[]
  removed: string[]
  selected: string[]
}

export function resolveComposition(
  name: string,
  requested: string[],
  current?: ProjectOptions,
  replace: string[] = []
): { issue: ResolutionIssue } | { plan: Composition } {
  requested = [...new Set(requested)]
  requested.forEach(component)
  replace.forEach(component)
  const existing = current ? selectedComponents(current) : []
  for (const id of replace) {
    if (!existing.includes(id)) throw new Error(`Cannot replace ${id}: it is not selected in this game.`)
    if (component(id).category === "renderer")
      throw new Error("The renderer cannot be changed with add. Keep the existing renderer or create a separate game.")
    if (component(id).category === "tool") throw new Error("Tool removal is not supported by this operation.")
  }
  const required: { id: string; by: string }[] = []
  const desired = new Set(requested)
  const visit = (id: string, ancestors: string[]) => {
    if (ancestors.includes(id)) throw new Error(`Cyclic add-on dependency: ${[...ancestors, id].join(" -> ")}`)
    for (const dependency of component(id).requires) {
      if (
        !requested.includes(dependency) &&
        !existing.includes(dependency) &&
        !required.some((entry) => entry.id === dependency)
      )
        required.push({ id: dependency, by: id })
      desired.add(dependency)
      visit(dependency, [...ancestors, id])
    }
  }
  requested.forEach((id) => visit(id, []))
  const selected = new Set([
    ...existing.filter(
      (id) =>
        !replace.includes(id) &&
        !(
          id.startsWith("no-") &&
          [...desired].some((candidate) => candidate !== id && component(candidate).category === component(id).category)
        )
    ),
    ...desired
  ])
  for (const category of ["renderer", "physics", "ui", "ecs", "telemetry"] as const) {
    const members = [...selected].filter((id) => component(id).category === category)
    if (members.length <= 1) continue
    const installed = members.find((id) => existing.includes(id))
    const incoming = members.filter((id) => desired.has(id) && id !== installed)
    if (installed && incoming.length === 1) {
      const target = incoming[0]!
      const choices: ResolutionChoice[] = []
      // Only generated modules can be replaced; the renderer owns game code.
      if (category !== "renderer")
        choices.push({
          label: `Replace ${installed} with ${target} (edited files will be checked)`,
          requested: requested.filter((id) => id !== installed),
          replace: [...replace, installed]
        })
      const requester = requested.find((id) => component(id).requires.includes(target))
      if (category === "renderer" && requester) {
        const alternatives = componentCatalog.filter(
          (entry) =>
            entry.category === component(requester).category &&
            entry.id !== requester &&
            entry.requires.every((dependency) => existing.includes(dependency))
        )
        for (const alternative of alternatives)
          choices.push({
            label: `Keep ${installed}; use ${alternative.id}`,
            requested: requested.map((id) => (id === requester ? alternative.id : id)),
            replace
          })
      }
      return {
        issue: {
          message: `${incoming.join(", ")} conflicts with ${installed}.${category === "renderer" ? " The renderer cannot be changed with add." : " Replacing it requires your explicit choice."}`,
          choices
        }
      }
    }
    return {
      issue: {
        message: `${members.join(" and ")} cannot be combined. Choose one ${category} and its compatible add-ons.`,
        choices: members.map((keep) => ({
          label: `Use ${keep}`,
          requested: requested.filter(
            (id) => !members.some((other) => other !== keep && (id === other || component(id).requires.includes(other)))
          ),
          replace
        }))
      }
    }
  }
  if (![...selected].some((id) => component(id).category === "renderer"))
    return {
      issue: {
        message: "Choose a renderer for this game.",
        choices: templates.map((entry) => ({ label: entry.name, requested: [...requested, entry.id], replace }))
      }
    }
  for (const fallback of ["no-physics", "html-ui", "no-ecs", "no-telemetry"])
    if (![...selected].some((id) => component(id).category === component(fallback).category)) selected.add(fallback)
  for (const id of selected)
    for (const dependency of component(id).requires)
      if (!selected.has(dependency)) throw new Error(`${id} still requires ${dependency}. It cannot be removed.`)
  for (const id of replace)
    if (![...desired].some((candidate) => component(candidate).category === component(id).category))
      throw new Error(`--replace ${id} requires a replacement in the same category.`)
  const value = (category: Category) =>
    component([...selected].find((id) => component(id).category === category)!).value
  const options: ProjectOptions = {
    name,
    template: value("renderer") as TemplateId,
    physics: value("physics") as PhysicsId,
    ui: value("ui") as UiId,
    telemetry: value("telemetry") as TelemetryId,
    addons: [...selected].filter(
      (id) => component(id).category === "tool" || (component(id).category === "ecs" && id !== "no-ecs")
    ) as AddonId[]
  }
  return {
    plan: {
      options:
        current && selected.size === existing.length && existing.every((id) => selected.has(id)) ? current : options,
      selected: [...selected],
      requested,
      required,
      added: [...selected].filter((id) => !existing.includes(id)),
      removed: existing.filter((id) => !selected.has(id))
    }
  }
}
