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
export function scaffoldCommand(draft: ProjectDraft) {
  return `npx spawn init ${projectSlug(draft.name) || "my-game"} --template ${draft.template}${draft.addons.length ? ` --with ${draft.addons.join(",")}` : ""}${draft.physics !== "none" ? ` --physics ${draft.physics}` : ""}${draft.ui !== "html" ? ` --ui ${draft.ui}` : ""}${draft.telemetry !== "none" ? ` --telemetry ${draft.telemetry}` : ""}`
}
