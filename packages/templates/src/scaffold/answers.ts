import { requestArgv, type Answers } from "@buildkitgg/scaffolder"
import {
  isAddonId,
  physicsOptions,
  telemetryOptions,
  templates,
  uiOptions,
  type AddonId,
  type PhysicsId,
  type TelemetryId,
  type TemplateId,
  type UiId
} from "../catalog"
import type { starterKits } from "../kits"

export type { Answers } from "@buildkitgg/scaffolder"

/**
 * A game as the dashboard and the kits choose it, in the ids `@spawn/templates/catalog` shows. Saved projects keep these
 * ids, so they stay the dashboard's vocabulary and `gameAnswers` turns them into the engine's.
 */
export interface GameChoices {
  name?: string
  template: TemplateId
  physics?: PhysicsId
  ui?: UiId
  telemetry?: TelemetryId
  /** Testing tools and the entity system. */
  addons?: readonly AddonId[]
}

const scope = "@spawnkit/"
const uiAddons: Record<Exclude<UiId, "none">, string> = { html: "html-ui", pixi: "pixi-ui", babylon: "babylon-gui" }
const telemetryAddons: Record<Exclude<TelemetryId, "none">, string> = {
  platform: "platform-telemetry",
  sentry: "sentry"
}
const simulations = ["bitecs", "koota"] as const satisfies readonly AddonId[]
// In the order the templates offer them, so the same tools always make the same command.
const tools = ["vitest", "playwright", "storybook"] as const satisfies readonly AddonId[]

/**
 * The engine answers for a game. Every slot is answered, so `spawn init` in a terminal asks nothing the dashboard
 * already chose. Throws when a choice doesn't exist or doesn't work with the renderer. The name isn't checked here: use
 * `validateProjectName`.
 */
export function gameAnswers(choices: GameChoices): Answers {
  const template = templates.find((entry) => entry.id === choices.template)
  if (!template) throw new Error(`There's no template named ${choices.template}.`)
  const physics = physicsOptions.find((entry) => entry.id === (choices.physics ?? "none"))
  if (!physics) throw new Error(`There's no physics named ${choices.physics}.`)
  if (!(physics.renderers as readonly string[]).includes(template.id))
    throw new Error(
      `${physics.name} doesn't work with ${template.name}. Choose physics that ${template.name} supports.`
    )
  const ui = uiOptions.find((entry) => entry.id === (choices.ui ?? "html"))
  if (!ui) throw new Error(`There's no game interface named ${choices.ui}.`)
  if (!(ui.renderers as readonly string[]).includes(template.id))
    throw new Error(
      `${ui.name} doesn't work with ${template.name}. Choose an interface that ${template.name} supports.`
    )
  const telemetry = telemetryOptions.find((entry) => entry.id === (choices.telemetry ?? "none"))
  if (!telemetry) throw new Error(`There's no telemetry named ${choices.telemetry}.`)
  const addons = choices.addons ?? []
  const unknown = addons.find((id) => !isAddonId(id))
  if (unknown) throw new Error(`There's no add-on named ${unknown}.`)
  const ecs = simulations.filter((id) => addons.includes(id))
  if (ecs.length > 1) throw new Error("bitECS and Koota can't be combined. Choose one entity system.")
  const optional = tools.filter((id) => addons.includes(id)).map((id) => scope + id)
  return {
    template: template.id,
    ...(choices.name === undefined ? {} : { name: choices.name }),
    slots: {
      physics: physics.id === "none" ? null : scope + physics.id,
      ui: ui.id === "none" ? null : scope + uiAddons[ui.id],
      simulation: scope + (ecs[0] ?? "plain"),
      telemetry: telemetry.id === "none" ? null : scope + telemetryAddons[telemetry.id]
    },
    // `spawn init` without `--with` leaves this out, and the request has to match it to plan the same lock.
    ...(optional.length > 0 ? { optional } : {})
  }
}

/** The `spawn` arguments that create this game, as the engine renders the request. */
export function initArgv(answers: Answers): string[] {
  return requestArgv({ intent: { command: "init", answers } })
}

type StarterKit = (typeof starterKits)[number]

/** A kit's saved answers: its renderer and physics, the HTML interface and Vitest. The catalog's preset of the same id. */
export function kitAnswers(kit: Pick<StarterKit, "template" | "physics">): Omit<Answers, "name"> {
  return gameAnswers({
    template: kit.template,
    physics: kit.physics,
    ui: "html",
    telemetry: "none",
    addons: ["vitest"]
  })
}

/** The project name a kit download uses, which is also its folder in the ZIP. */
export function kitProjectName(kit: Pick<StarterKit, "id">): string {
  return `${kit.id}-game`
}

/**
 * The `spawn` arguments that create a kit: `init --preset <kit> <name>`. The engine renders requests, not presets, so
 * this is the one command written by hand. Tests check it plans the same files as the kit's answers.
 */
export function kitArgv(kit: Pick<StarterKit, "id">): string[] {
  return ["init", "--preset", kit.id, kitProjectName(kit)]
}
