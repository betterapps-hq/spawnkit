import { createProjectPlan } from "@spawn/templates"
import { colyseusServices, hostingPlans, hostingRegions } from "@spawn/templates/catalog"
import { defaultProjectDraft, projectSlug, type ProjectDraft } from "@/components/project/creation-model"
import type { ProjectModel, Region } from "@/components/project/model"
import { readDomainConfigurations, type DomainConfiguration } from "./domain-config"
import { githubError } from "./github-selection"
import { estimateProject } from "./pricing"

export interface LocalProject {
  id: string
  name: string
  configuration?: ProjectDraft
  productionBranch?: string
  domainConfigurations?: DomainConfiguration[]
}
export class ProjectInputError extends Error {}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export function readProjectDraft(value: unknown): ProjectDraft {
  if (
    !object(value) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.trim().length > 64 ||
    !["single", "multiplayer"].includes(String(value.mode)) ||
    !["none", "postgresql", "sqlite"].includes(String(value.database)) ||
    typeof value.sandbox !== "boolean" ||
    typeof value.previews !== "boolean" ||
    !Array.isArray(value.services) ||
    value.services.some((id) => !colyseusServices.some((service) => service.id === id)) ||
    !Array.isArray(value.addons) ||
    !object(value.github) ||
    !["none", "create", "connect"].includes(String(value.github.mode)) ||
    !["private", "public"].includes(String(value.github.visibility)) ||
    typeof value.github.name !== "string" ||
    typeof value.github.url !== "string" ||
    !Array.isArray(value.productionLocations) ||
    !Array.isArray(value.sandboxLocations)
  )
    throw new Error("Check your project configuration.")
  const draft = value as unknown as ProjectDraft
  createProjectPlan({
    name: projectSlug(draft.name),
    template: draft.template,
    addons: draft.addons,
    physics: draft.physics,
    ui: draft.ui,
    telemetry: draft.telemetry
  })
  const sourceError = githubError(draft.github)
  if (sourceError) throw new Error(sourceError)
  for (const locations of [draft.productionLocations, draft.sandboxLocations]) {
    const seen = new Set<string>()
    for (const location of locations) {
      if (
        !object(location) ||
        typeof location.id !== "string" ||
        typeof location.region !== "string" ||
        typeof location.hours !== "number" ||
        !Number.isFinite(location.hours) ||
        location.hours < 0 ||
        location.hours > 744 ||
        seen.has(location.region) ||
        !hostingRegions.some((region) => region.id === location.region) ||
        !hostingPlans.some((plan) => plan.id === location.planId && plan.rates[location.region as string])
      )
        throw new Error("Check your runtime regions and resources.")
      seen.add(location.region)
    }
  }
  if (
    draft.mode === "multiplayer" &&
    (!draft.productionLocations.length || (draft.sandbox && !draft.sandboxLocations.length))
  )
    throw new Error("Choose at least one region for each enabled multiplayer environment.")
  return {
    ...draft,
    name: draft.name.trim(),
    previews: draft.github.mode !== "none" && draft.previews,
    productionLocations: draft.productionLocations.length
      ? draft.productionLocations
      : defaultProjectDraft.productionLocations,
    sandboxLocations: draft.sandboxLocations.length ? draft.sandboxLocations : defaultProjectDraft.sandboxLocations
  }
}

export function readProjectRecords(raw: string | null): LocalProject[] {
  if (!raw) return []
  const value: unknown = JSON.parse(raw)
  if (!Array.isArray(value)) throw new Error("Saved projects could not be read.")
  const ids = new Set<string>()
  return value.map((item: unknown) => {
    if (
      !object(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim()
    )
      throw new Error("Saved projects could not be read.")
    ids.add(item.id)
    const configuration = item.configuration === undefined ? undefined : readProjectDraft(item.configuration)
    const domainConfigurations =
      item.domainConfigurations === undefined ? undefined : readDomainConfigurations(item.domainConfigurations)
    if (domainConfigurations?.some((domain) => domain.environment === "sandbox") && !configuration?.sandbox)
      throw new Error("A Sandbox domain requires an enabled Sandbox.")
    return {
      ...item,
      id: item.id,
      name: item.name,
      ...(configuration ? { configuration } : {}),
      ...(domainConfigurations ? { domainConfigurations } : {})
    } as LocalProject
  })
}

export function projectRecordModel(record: LocalProject): ProjectModel {
  const draft = record.configuration ?? { ...defaultProjectDraft, name: record.name }
  const regions = (environment: "production" | "sandbox"): Region[] =>
    (draft.mode === "multiplayer"
      ? draft[environment === "production" ? "productionLocations" : "sandboxLocations"]
      : []
    ).map((location) => {
      const plan = hostingPlans.find((item) => item.id === location.planId)!
      return {
        id: location.region,
        city: hostingRegions.find((item) => item.id === location.region)!.city,
        cores: plan.cores,
        ram: plan.ramGb,
        cpu: 0,
        memory: 0,
        players: 0,
        status: "unprovisioned"
      }
    })
  const estimate = estimateProject({
    multiplayer: draft.mode === "multiplayer",
    services: draft.services.length > 0,
    sandbox: draft.sandbox,
    locations: (draft.mode === "multiplayer"
      ? [
          ...draft.productionLocations.map((location) => ({ ...location, environment: "production" as const })),
          ...(draft.sandbox
            ? draft.sandboxLocations.map((location) => ({ ...location, environment: "sandbox" as const }))
            : [])
        ]
      : []
    ).map((location) => ({
      ...location,
      rate: hostingPlans.find((plan) => plan.id === location.planId)!.rates[location.region]![location.environment]
    }))
  })
  return {
    id: record.id,
    name: record.name,
    slug: projectSlug(record.name),
    connected: false,
    productionBranch: record.productionBranch ?? "main",
    engine: draft.template,
    artwork: `/templates/${draft.template}.webp`,
    mode: draft.mode,
    configuration: draft,
    services: colyseusServices.filter((service) => draft.services.includes(service.id)).map((service) => service.name),
    database: draft.database,
    repository: null,
    domains: (record.domainConfigurations ?? []).map((domain) => ({
      ...domain,
      id: domain.hostname,
      primary: false,
      status: "unverified",
      certificate: "pending",
      checked: null,
      issue: null,
      records: []
    })),
    production: { name: "production", url: "", release: null, status: "empty", regions: regions("production") },
    sandbox: draft.sandbox
      ? { name: "sandbox", url: "", release: null, status: "empty", regions: regions("sandbox") }
      : null,
    releases: [],
    previews: [],
    previewsEnabled: false,
    deployments: [],
    players: [],
    logs: [],
    metrics: { players: 0, rooms: 0, errors: 0, requests: "0", traffic: [] },
    monthlyEstimate: estimate.total
  }
}

export function saveProjectRecord(records: LocalProject[], id: string, configuration: ProjectDraft): LocalProject[] {
  if (records.some((project) => project.id !== id && project.name.toLowerCase() === configuration.name.toLowerCase()))
    throw new ProjectInputError("A project with that name already exists.")
  const existing = records.find((project) => project.id === id)
  if (!configuration.sandbox && existing?.domainConfigurations?.some((domain) => domain.environment === "sandbox"))
    throw new ProjectInputError("Remove the Sandbox domains before disabling Sandbox.")
  const next = { ...existing, id, name: configuration.name, configuration }
  return existing ? records.map((project) => (project.id === id ? next : project)) : [...records, next]
}
