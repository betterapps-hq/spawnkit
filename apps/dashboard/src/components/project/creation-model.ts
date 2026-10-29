import { gameAnswers, initArgv, type Answers } from "@spawn/templates/answers"
import type { TemplateId, AddonId, PhysicsId, UiId, TelemetryId, ServiceId } from "@spawn/templates/catalog"
import type { GitHubSelection } from "@/lib/github-selection"
import type { ComputeLocation } from "../compute-regions"

export interface ProjectDraft {
  name: string
  template: TemplateId
  mode: "single" | "multiplayer"
  addons: AddonId[]
  physics: PhysicsId
  ui: UiId
  telemetry: TelemetryId
  services: ServiceId[]
  database: "none" | "postgresql" | "sqlite"
  github: GitHubSelection
  sandbox: boolean
  previews: boolean
  productionLocations: ComputeLocation[]
  sandboxLocations: ComputeLocation[]
}

export const defaultProjectDraft: ProjectDraft = {
  name: "",
  template: "pixi",
  mode: "single",
  addons: ["vitest"],
  physics: "none",
  ui: "html",
  telemetry: "none",
  services: [],
  database: "none",
  github: { mode: "none", name: "my-game", visibility: "private", url: "" },
  sandbox: false,
  previews: false,
  productionLocations: [{ id: "production-1", region: "us-new-jersey", planId: "standard-1c-2gb", hours: 730 }],
  sandboxLocations: [{ id: "sandbox-1", region: "us-new-jersey", planId: "standard-1c-2gb", hours: 100 }]
}

export function projectSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
/** The engine answers for a draft's game. Throws when its choices don't make a game. */
export function draftAnswers(draft: ProjectDraft): Answers {
  return gameAnswers({ ...draft, name: projectSlug(draft.name) || "my-game" })
}
/**
 * `spawn init` for a draft, from the engine's rendering of its request. A saved configuration that no longer makes a
 * game falls back to the wizard, which asks for everything.
 */
export function scaffoldCommand(draft: ProjectDraft) {
  return `npx @spawnkit/cli ${scaffoldArgv(draft).join(" ")}`
}
function scaffoldArgv(draft: ProjectDraft) {
  try {
    return initArgv(draftAnswers(draft))
  } catch {
    return ["init"]
  }
}
