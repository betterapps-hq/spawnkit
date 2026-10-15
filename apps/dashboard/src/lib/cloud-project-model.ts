import type { EnvironmentName, ProjectModel, Release } from "@/components/project/model"

type CloudEnvironment = EnvironmentName | `preview-${number}`

export interface ProjectState {
  environments: { name: CloudEnvironment; enabled: number; currentReleaseId: string | null; hostname: string | null }[]
  releases: {
    id: string
    buildId: string
    status: Release["status"]
    environment: CloudEnvironment
    createdAt: string
    artifactDigest: string | null
    url: string | null
    versionNumber: number
    commitSha: string | null
    branch: string | null
    sourceTitle: string | null
  }[]
  deployments: {
    id: string
    releaseId: string
    environment: CloudEnvironment
    status: string
    operation: string
    previousReleaseId: string | null
    createdAt: string
  }[]
  logs: { sequence: number; message: string; createdAt: string; environment: EnvironmentName; releaseId: string }[]
  domains: { hostname: string; environment: EnvironmentName; status: string; verificationToken: string }[]
  capabilities: { builds: boolean; domains: boolean; github: boolean }
  repository: string | null
  previews: {
    id: string
    number: number
    title: string
    branch: string
    commitSha: string
    updated: string
    currentVersionId?: string | null
    versionId: string | null
    status: string | null
    hostname: string | null
  }[]
}

export function applyCloudState(project: ProjectModel, state?: ProjectState): ProjectModel {
  if (!state) return project
  const releases: Release[] = state.releases.map((release) => ({
    id: release.id,
    number: release.versionNumber,
    title: release.sourceTitle ?? `Version ${release.versionNumber}`,
    branch: release.branch ?? "",
    commit: release.commitSha ?? "",
    actor: "",
    time: release.createdAt,
    duration: "",
    environment: release.environment.startsWith("preview-") ? "preview" : (release.environment as EnvironmentName),
    status: release.status,
    compatible: release.status === "ready",
    retained: Boolean(release.artifactDigest),
    build: {
      source: release.commitSha ? "GitHub" : "CLI",
      artifact: release.artifactDigest ? { digest: release.artifactDigest, size: "", files: 0 } : null,
      checks: [],
      changes: [],
      logs: state.logs
        .filter((line) => line.releaseId === release.id)
        .reverse()
        .map((line) => line.message),
      configVersion: "1"
    }
  }))
  const environment = (name: EnvironmentName) => {
    const current = state.environments.find((row) => row.name === name)
    const base = name === "production" ? project.production : project.sandbox
    if (!current?.enabled) return null
    const release = releases.find((row) => row.id === current.currentReleaseId) ?? null
    return {
      name,
      url: current.hostname ?? "",
      release,
      status: release ? ("healthy" as const) : ("empty" as const),
      regions: base?.regions ?? []
    }
  }
  return {
    ...project,
    connected: true,
    capabilities: state.capabilities,
    repository: state.repository,
    previews: (state.previews ?? []).map((preview) => ({
      id: preview.id,
      environmentId: `preview-${preview.number}`,
      currentVersionId: preview.currentVersionId ?? null,
      number: preview.number,
      title: preview.title,
      branch: preview.branch,
      commit: preview.commitSha,
      actor: "GitHub",
      state:
        preview.status === "succeeded"
          ? "ready"
          : preview.status === "failed"
            ? "failed"
            : preview.status === "superseded"
              ? "outdated"
              : "building",
      url: preview.hostname ?? "",
      versionId: preview.versionId ?? "",
      updated: preview.updated,
      isolation: "Separate environment and address"
    })),
    releases,
    production: environment("production") ?? project.production,
    sandbox: environment("sandbox"),
    deployments: state.deployments.map((row) => ({
      id: row.id,
      versionId: row.releaseId,
      previousVersionId: row.previousReleaseId,
      environment: row.environment.startsWith("preview-") ? "preview" : (row.environment as EnvironmentName),
      kind: row.operation === "promotions" ? "promote" : row.operation === "rollbacks" ? "rollback" : "deploy",
      state:
        row.status === "succeeded"
          ? "live"
          : row.status === "superseded"
            ? "superseded"
            : row.status === "failed"
              ? "failed"
              : "rolling-out",
      actor: "",
      time: row.createdAt,
      regions: []
    })),
    logs: state.logs
      .slice()
      .reverse()
      .map((row) => ({
        id: String(row.sequence),
        time: row.createdAt,
        level: "info",
        environment: row.environment,
        region: "",
        message: row.message,
        release: row.releaseId
      })),
    domains: state.domains.map((row) => ({
      id: row.hostname,
      hostname: row.hostname,
      environment: row.environment,
      primary: false,
      status: row.status === "active" ? "active" : "pending-dns",
      certificate: row.status === "active" ? "active" : "pending",
      checked: null,
      issue:
        row.status === "verified"
          ? "Ownership verified. Routing and certificate provisioning are pending platform domain setup."
          : null,
      records: [
        {
          type: "TXT",
          name: `_spawn.${row.hostname}`,
          value: row.verificationToken,
          verified: row.status === "verified" || row.status === "active"
        }
      ]
    }))
  }
}
