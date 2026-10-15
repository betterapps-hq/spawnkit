import { hostingRegions, hostingPlans, colyseusServices, templates } from "@spawn/templates/catalog"
import { useState, type ComponentProps } from "react"
import { estimateProject } from "@/lib/pricing"
import type { ProjectDraft } from "./creation-model"
import { exampleDomain } from "./domain-fixtures"
import { domainIsReady } from "./domains"
import type { ActionHandler, ProjectModel, Region, Release } from "./model"
import { ProjectStudio } from "./studio"

// Storybook-only coordinator. Imported by stories, never by the application or page components.
// It lets designers exercise complete transitions without provisioning or changing real accounts.
export function InteractiveStudio(props: ComponentProps<typeof ProjectStudio>) {
  const [updates, setUpdates] = useState<Record<string, ProjectModel>>({})
  const resolve = (id: string) =>
    updates[id] ?? (props.project.id === id ? props.project : props.projects.find((project) => project.id === id))
  const onAction: ActionHandler = async (action) => {
    await props.onAction?.(action)
    await new Promise((resolve) => setTimeout(resolve, 450))
    const project = resolve(action.projectId)
    if (!project) return
    const version = project.releases.find((item) => item.id === action.values.versionId)
    let next = project
    if (action.kind === "connect-domain") {
      const environment = action.values.environment === "sandbox" ? "sandbox" : "production"
      const hostname = String(action.values.hostname)
      if (!project[environment] || project.domains.some((domain) => domain.hostname === hostname))
        throw new Error("Invalid domain assignment")
      next = { ...project, domains: [...project.domains, exampleDomain(hostname, environment)] }
    } else if (action.kind === "verify-domain") {
      next = {
        ...project,
        domains: project.domains.map((domain) =>
          domain.id === action.values.domainId
            ? {
                ...domain,
                checked: "just now",
                issue: null,
                status: domain.status === "issuing" || domain.status === "active" ? "active" : "issuing",
                certificate: domain.status === "issuing" || domain.status === "active" ? "active" : "pending",
                records: domain.records.map((record) => ({ ...record, verified: true }))
              }
            : domain
        )
      }
    } else if (action.kind === "primary-domain") {
      const selected = project.domains.find((domain) => domain.id === action.values.domainId)
      if (
        action.values.domainId &&
        (!selected || !domainIsReady(selected) || selected.environment !== action.values.environment)
      )
        throw new Error("Domain is not ready")
      next = {
        ...project,
        domains: project.domains.map((domain) =>
          domain.environment === action.values.environment
            ? { ...domain, primary: domain.id === action.values.domainId }
            : domain
        )
      }
    } else if (action.kind === "remove-domain") {
      next = { ...project, domains: project.domains.filter((domain) => domain.id !== action.values.domainId) }
    } else if (["promote", "rollback", "stage-version"].includes(action.kind) && version) {
      const target = action.kind === "stage-version" ? "sandbox" : "production"
      const environment = project[target]
      if (!environment || environment.release?.id !== (action.values.expectedVersionId ?? undefined))
        throw new Error("Environment conflict")
      const draining = project.mode === "multiplayer" && target === "production" && action.values.rollout === "drain"
      next = {
        ...project,
        [target]: { ...environment, release: version, status: "healthy" },
        deployments: [
          {
            id: `dep-demo-${project.deployments.length + 1}`,
            versionId: version.id,
            previousVersionId: environment.release?.id ?? null,
            environment: target,
            kind: action.kind === "rollback" ? "rollback" : action.kind === "promote" ? "promote" : "deploy",
            state: draining ? "draining" : "live",
            actor: "You",
            time: "Just now",
            regions: environment.regions.map((region) => ({
              name: region.city,
              state: draining ? "draining" : "ready",
              players: draining ? region.players : 0
            }))
          },
          ...project.deployments.map((event) =>
            event.environment === target && event.state === "live" ? { ...event, state: "superseded" as const } : event
          )
        ]
      }
    } else if (action.kind === "save-settings") {
      next = { ...project, name: String(action.values.name) }
    } else if (action.kind === "save-backend") {
      const updateRegions = (environment: "production" | "sandbox") => {
        const existing = project[environment]?.regions ?? []
        return (action.values[environment] as Pick<Region, "id" | "cores" | "ram">[]).map((region) => ({
          ...(existing.find((item) => item.id === region.id) ?? {
            city: hostingRegions.find((item) => item.id === region.id)?.city ?? region.id,
            cpu: 0,
            memory: 0,
            players: 0,
            status: "paused" as const
          }),
          ...region
        }))
      }
      next = {
        ...project,
        production: { ...project.production, regions: updateRegions("production") },
        sandbox: project.sandbox ? { ...project.sandbox, regions: updateRegions("sandbox") } : null
      }
    } else if (action.kind === "moderate-player") {
      next = {
        ...project,
        players: project.players.map((player) =>
          player.id === action.values.playerId
            ? { ...player, status: action.values.status === "banned" ? "banned" : "active" }
            : player
        )
      }
    } else if (action.kind === "enable-previews") next = { ...project, previewsEnabled: true }
    else if (action.kind === "close-preview")
      next = {
        ...project,
        previews: project.previews.map((preview) =>
          preview.id === action.values.previewId ? { ...preview, state: "closing" } : preview
        )
      }
    else if (action.kind === "retry-preview")
      next = {
        ...project,
        previews: project.previews.map((preview) =>
          preview.id === action.values.previewId ? { ...preview, state: "building" } : preview
        )
      }
    else if (action.kind === "enable-sandbox")
      next = {
        ...project,
        sandbox: {
          name: "sandbox",
          url: `sandbox.${project.slug}.example.com`,
          status: "empty",
          release: null,
          regions:
            project.mode === "multiplayer"
              ? project.production.regions.slice(0, 1).map((region) => ({ ...region, cpu: 0, memory: 0, players: 0 }))
              : []
        }
      }
    else if (action.kind === "deploy" && project.releases[0]) {
      const seed = project.releases[0]
      const number = Math.max(...project.releases.map((item) => item.number)) + 1
      const version: Release = {
        ...seed,
        id: `rel-${number}`,
        number,
        title: `Build from ${String(action.values.branch)}`,
        branch: String(action.values.branch),
        environment: action.values.environment === "sandbox" ? "sandbox" : "production",
        status: "queued",
        time: "Just now",
        duration: "—",
        retained: false,
        build: {
          ...seed.build,
          artifact: null,
          checks: seed.build.checks.map((check) => ({ ...check, status: "pending", detail: "Waiting for build" })),
          logs: ["Waiting for an isolated build runner…"]
        }
      }
      next = { ...project, releases: [version, ...project.releases] }
    }
    if (action.kind === "create-project") {
      const configuration = action.values as unknown as ProjectDraft & { slug: string }
      const id = `project-demo-${Object.keys(updates).length + 1}`
      const engine = templates.find((template) => template.id === configuration.template)!.id
      const regions = (environment: "production" | "sandbox"): Region[] =>
        (configuration.mode === "multiplayer"
          ? configuration[environment === "production" ? "productionLocations" : "sandboxLocations"]
          : []
        ).map((location) => {
          const plan = hostingPlans.find((plan) => plan.id === location.planId)!
          return {
            id: location.region,
            city: hostingRegions.find((region) => region.id === location.region)!.city,
            cores: plan.cores,
            ram: plan.ramGb,
            cpu: 0,
            memory: 0,
            players: 0,
            status: "paused"
          }
        })
      const estimate = estimateProject({
        multiplayer: configuration.mode === "multiplayer",
        services: configuration.services.length > 0,
        sandbox: configuration.sandbox,
        locations: (configuration.mode === "multiplayer"
          ? [
              ...configuration.productionLocations.map((location) => ({
                ...location,
                environment: "production" as const
              })),
              ...(configuration.sandbox
                ? configuration.sandboxLocations.map((location) => ({ ...location, environment: "sandbox" as const }))
                : [])
            ]
          : []
        ).map((location) => ({
          ...location,
          rate: hostingPlans.find((plan) => plan.id === location.planId)!.rates[location.region]![location.environment]
        }))
      })
      next = {
        ...project,
        id,
        name: String(action.values.name),
        slug: configuration.slug,
        engine,
        artwork: `/templates/${engine}.webp`,
        configuration,
        mode: configuration.mode,
        services: colyseusServices
          .filter((service) => configuration.services.includes(service.id))
          .map((service) => service.name),
        database: configuration.database,
        repository:
          configuration.github.mode === "none"
            ? null
            : configuration.github.mode === "create"
              ? `studio/${configuration.github.name}`
              : configuration.github.url.replace("https://github.com/", "").replace(/\/$/, ""),
        domains: [],
        previewsEnabled: configuration.github.mode !== "none" && configuration.previews,
        previews: [],
        players: [],
        logs: [],
        releases: [],
        deployments: [],
        sandbox: configuration.sandbox
          ? {
              name: "sandbox",
              url: `sandbox.${configuration.slug}.example.com`,
              status: "empty",
              release: null,
              regions: regions("sandbox")
            }
          : null,
        monthlyEstimate: estimate.total,
        production: {
          name: "production",
          url: `${configuration.slug}.example.com`,
          status: "empty",
          release: null,
          regions: regions("production")
        },
        metrics: { players: 0, rooms: 0, errors: 0, requests: "0", traffic: [] }
      }
    }
    setUpdates((current) => ({ ...current, [next.id]: next }))
    if (action.kind === "create-project") return { projectId: next.id }
  }
  return (
    <ProjectStudio
      {...props}
      project={updates[props.project.id] ?? props.project}
      projects={[
        ...props.projects.map((project) => updates[project.id] ?? project),
        ...Object.values(updates).filter(
          (project) => !props.projects.some((item) => item.id === project.id) && props.project.id !== project.id
        )
      ]}
      onAction={onAction}
    />
  )
}
