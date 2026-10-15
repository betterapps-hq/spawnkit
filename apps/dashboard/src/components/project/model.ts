import type { TemplateId } from "@spawn/templates/catalog"
import type { ProjectDraft } from "./creation-model"
export type ProjectPage =
  | "projects"
  | "create"
  | "configure"
  | "overview"
  | "deployments"
  | "domains"
  | "analytics"
  | "logs"
  | "users"
  | "settings"
  | "backend"
export type EnvironmentName = "production" | "sandbox"
type ReleaseStatus = "ready" | "building" | "failed" | "queued"
export interface Release {
  id: string
  number: number
  /** Optional source tag; the sequence number still determines release order. */
  label?: string
  title: string
  branch: string
  commit: string
  actor: string
  time: string
  duration: string
  /** Build origin; current environment pointers live on ProjectModel. */
  environment: EnvironmentName | "preview"
  status: ReleaseStatus
  compatible: boolean
  retained: boolean
  build: {
    source: "GitHub" | "CLI"
    artifact: { digest: string; size: string; files: number } | null
    checks: { name: string; status: "passed" | "failed" | "running" | "pending"; detail: string }[]
    changes: { path: string; added: number; removed: number }[]
    logs: string[]
    configVersion: string
  }
}
export interface PullRequestPreview {
  /** Stable environment identity; id identifies the latest build event for mutations. */
  environmentId?: string
  currentVersionId?: string | null
  id: string
  number: number
  title: string
  branch: string
  commit: string
  actor: string
  state: "ready" | "building" | "failed" | "outdated" | "closing" | "cleanup-failed"
  url: string
  versionId: string
  updated: string
  isolation: string
}
interface DeploymentEvent {
  id: string
  versionId: string
  previousVersionId: string | null
  environment: EnvironmentName | "preview"
  kind: "deploy" | "promote" | "rollback"
  state: "live" | "superseded" | "rolling-out" | "failed" | "draining"
  actor: string
  time: string
  regions: { name: string; state: "ready" | "pending" | "draining" | "failed"; players: number }[]
}
export interface Region {
  id: string
  city: string
  cores: number
  ram: number
  cpu: number
  memory: number
  players: number
  status: "healthy" | "degraded" | "paused" | "unprovisioned"
}
interface Environment {
  name: EnvironmentName
  url: string
  release: Release | null
  status: "healthy" | "degraded" | "paused" | "empty"
  regions: Region[]
}
export interface ProjectDomain {
  id: string
  hostname: string
  environment: EnvironmentName
  primary: boolean
  status: "unverified" | "pending-dns" | "issuing" | "active" | "error"
  certificate: "pending" | "active" | "error"
  checked: string | null
  issue: string | null
  records: { type: "CNAME" | "TXT"; name: string; value: string; verified: boolean }[]
}
export interface Player {
  id: string
  name: string
  email: string
  joined: string
  lastSeen: string
  status: "active" | "banned"
  saves: number
}
interface LogEntry {
  id: string
  time: string
  level: "info" | "warn" | "error"
  environment: EnvironmentName
  region: string
  message: string
  release: string
}
export interface ProjectModel {
  capabilities?: { builds: boolean; domains: boolean; github: boolean }
  connected?: boolean
  productionBranch?: string
  id: string
  name: string
  slug: string
  engine: TemplateId
  artwork: string
  mode: "single" | "multiplayer"
  services: string[]
  database: "none" | "postgresql" | "sqlite"
  repository: string | null
  domains: ProjectDomain[]
  production: Environment
  sandbox: Environment | null
  releases: Release[]
  previews: PullRequestPreview[]
  previewsEnabled: boolean
  deployments: DeploymentEvent[]
  players: Player[]
  logs: LogEntry[]
  metrics: { players: number; rooms: number; errors: number; requests: string; traffic: number[] }
  monthlyEstimate: number
  configuration?: ProjectDraft
}
type ProjectAction = {
  kind:
    | "deploy"
    | "promote"
    | "rollback"
    | "save-settings"
    | "connect-repository"
    | "save-backend"
    | "restart"
    | "enable-sandbox"
    | "create-project"
    | "save-project"
    | "moderate-player"
    | "stage-version"
    | "retry-preview"
    | "close-preview"
    | "enable-previews"
    | "connect-domain"
    | "save-domain"
    | "verify-domain"
    | "primary-domain"
    | "remove-domain"
  projectId: string
  values: Record<string, unknown>
}
export type ActionHandler = (action: ProjectAction) => Promise<void | { projectId: string }>
export type DeploymentView = "environments" | "releases" | "activity"
export interface StudioLocation {
  page: ProjectPage
  projectId?: string | undefined
  versionId?: string | undefined
  environmentId?: string | undefined
  deploymentView?: DeploymentView | undefined
}
export type OperationPanel =
  | "deploy"
  | "promote"
  | "rollback"
  | "restart"
  | "enable-sandbox"
  | "stage-version"
  | "retry-preview"
  | "close-preview"
  | "enable-previews"
