import { multiplayerProject } from "../fixtures"
import type { ProjectModel, Release } from "../model"
import { configurations, initialResources, type DeploymentPreset, type ResourceSettings } from "./configuration"
import { releases } from "./release-data"

type MapEnvironment = {
  id: string
  name: string
  branch: string
  release: string
  candidate?: string
  kind: "preview" | "staging" | "production"
  status: "Ready" | "Building" | "Failed"
}

/** Adapt canvas fixtures to existing dashboard pages without a second set of release identities. */
export function dashboardProject(
  environments: MapEnvironment[],
  resources: Record<string, ResourceSettings>,
  preset: DeploymentPreset,
  failed: boolean,
  retainedPreviews: MapEnvironment[],
  draining: boolean
): ProjectModel {
  const config = configurations[preset]
  const versions: Release[] = releases.map((release, index) => ({
    id: release.version,
    label: release.version,
    number: releases.length - index,
    title: release.commits[0]!.message,
    branch: "main",
    commit: release.sha,
    actor: release.commits[0]!.author,
    time: release.time,
    duration: "42s",
    environment: index === 0 ? "sandbox" : "production",
    status: index === 0 && failed ? "failed" : "ready",
    compatible: true,
    retained: !(index === 0 && failed),
    build: {
      source: "GitHub",
      configVersion: "cfg_8f31",
      artifact:
        index === 0 && failed ? null : { digest: `sha256:${release.sha.repeat(9)}0`, size: "8.42 MB", files: 42 },
      checks: [
        {
          name: "Build and tests",
          status: index === 0 && failed ? "failed" : "passed",
          detail: index === 0 && failed ? "matchmaking.reconnect.test.ts" : "Checks passed"
        }
      ],
      changes: [],
      logs:
        index === 0 && failed
          ? ["Build failed: matchmaking.reconnect.test.ts"]
          : ["Source received", "Build and tests passed", "Artifact stored"]
    }
  }))
  const previews = environments.filter((env) => env.kind === "preview")
  const previewVersions: Release[] = [...new Map(retainedPreviews.map((env) => [env.release, env])).values()].map(
    (env, index) => ({
      ...versions[0]!,
      id: env.release,
      label: env.name,
      number: versions.length + index + 1,
      title: env.branch,
      branch: env.branch,
      commit: env.release,
      environment: "preview",
      status: "ready",
      retained: true,
      build: {
        ...versions[0]!.build,
        artifact: { digest: `sha256:${env.release.repeat(9)}0`, size: "8.42 MB", files: 42 },
        checks: [{ name: "Build and tests", status: "passed", detail: "Serving build passed" }],
        logs: ["Build and tests passed", "Artifact stored"]
      }
    })
  )
  const environment = (id: "production" | "staging"): ProjectModel["production"] => {
    const env = environments.find((item) => item.id === id)!
    const settings = resources[id] ?? initialResources(id === "production", preset)
    return {
      name: id === "staging" ? "sandbox" : "production",
      status: "healthy",
      url: id === "production" ? multiplayerProject.production.url : multiplayerProject.sandbox!.url,
      release: versions.find((release) => release.id === env.release) ?? null,
      regions: Object.keys(settings.regions).map((city) => ({
        id: city.toLowerCase().replaceAll(" ", "-"),
        city,
        cores: Number.parseInt(settings.size),
        ram: Number.parseInt(settings.size.split("·")[1] ?? "0"),
        cpu: 0,
        memory: 0,
        players: 0,
        status: "healthy"
      }))
    }
  }
  return {
    ...multiplayerProject,
    mode: config.servers ? "multiplayer" : "single",
    database: config.database ? "postgresql" : "none",
    services: config.api ? multiplayerProject.services : [],
    production: environment("production"),
    sandbox: environment("staging"),
    releases: [...versions, ...previewVersions],
    previews: previews.map((env) => ({
      id: env.id,
      number: Number(env.id.slice(3)),
      title: env.branch,
      branch: env.branch,
      commit: env.candidate ?? env.release,
      actor: "Alex",
      state: env.status.toLowerCase() as "ready" | "building" | "failed",
      url: `${env.id}.thornwatch.spawnkit.cloud`,
      versionId: env.release,
      updated: "12m ago",
      isolation: "Isolated runtime and data"
    })),
    deployments: environments
      .filter((env) => env.kind !== "preview")
      .map((env) => ({
        id: `dep-${env.id}-${env.release}`,
        versionId: env.release,
        previousVersionId: null,
        environment: env.kind === "production" ? "production" : "sandbox",
        kind: "deploy",
        state: env.kind === "production" && draining ? "draining" : "live",
        actor: "Alex",
        time: "Current deployment",
        regions: environment(env.kind === "production" ? "production" : "staging").regions.map((region) => ({
          name: region.city,
          state: env.kind === "production" && draining ? "draining" : "ready",
          players: 0
        }))
      })),
    logs: []
  }
}
