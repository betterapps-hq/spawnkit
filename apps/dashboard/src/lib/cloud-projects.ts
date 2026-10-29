import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { defaultProjectDraft } from "@/components/project/creation-model"
import type { ActionHandler } from "@/components/project/model"
import type { ProjectState } from "./cloud-project-model"
import {
  ProjectInputError,
  readProjectDraft,
  readProjectRecords,
  saveProjectRecord,
  type LocalProject
} from "./project-records"
import { PROJECT_STALE_MS, projectRefreshInterval } from "./project-refresh"

interface CloudProject {
  lifecycle?: "active" | "deleting"
  id: string
  name: string
  configuration: Record<string, unknown>
  metadata?: { productionBranch?: string; domainConfigurations?: unknown[] }
  revision: number
  state?: ProjectState
}

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/platform/v1${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(method === "POST" ? { "idempotency-key": crypto.randomUUID() } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const result = await response.json()
  if (!response.ok) {
    const message = result.error?.message ?? "Project service unavailable."
    if (response.status >= 400 && response.status < 500) throw new ProjectInputError(message)
    throw new Error(message)
  }
  return result as T
}

function payload(project: LocalProject) {
  return {
    id: project.id,
    name: project.name,
    configuration: project.configuration,
    metadata: { productionBranch: project.productionBranch, domainConfigurations: project.domainConfigurations }
  }
}

function local(project: CloudProject): LocalProject {
  return readProjectRecords(
    JSON.stringify([
      {
        ...project.metadata,
        id: project.id,
        name: project.name,
        configuration: { ...defaultProjectDraft, ...project.configuration, name: project.name }
      }
    ])
  )[0]!
}

export function useCloudProjects(userId: string, selectedProjectId?: string) {
  const client = useQueryClient()
  const [pendingSubmission, setPendingSubmission] = useState<{ projectId: string; until: number } | null>(null)
  const queryKey = ["projects", userId]
  type Summary = ProjectState["environments"][number] & ProjectState["releases"][number] & { projectId: string }
  type Listing = { projects: CloudProject[]; summaries?: Summary[] }
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await api<Listing>("/projects?summary=true")
      return result.projects.map((project) => {
        const rows = (result.summaries ?? []).filter((row) => row.projectId === project.id)
        return {
          ...project,
          state: {
            lifecycle: project.lifecycle,
            environments: rows,
            releases: rows
              .filter((row) => row.id)
              .map((row) => ({ ...row, commitSha: null, branch: null, sourceTitle: null })),
            deployments: [],
            logs: [],
            domains: [],
            previews: [],
            repository: null,
            capabilities: { builds: false, domains: false, github: false }
          } satisfies ProjectState
        }
      })
    },
    staleTime: PROJECT_STALE_MS,
    refetchInterval: (query) => (query.state.data?.some((project) => project.lifecycle === "deleting") ? 5000 : false),
    refetchIntervalInBackground: false,
    retry: (count, error) => !(error instanceof ProjectInputError) && count < 1
  })
  const detail = useQuery({
    queryKey: [...queryKey, "state", selectedProjectId],
    enabled: Boolean(
      selectedProjectId &&
      query.data?.some((project) => project.id === selectedProjectId && project.lifecycle !== "deleting")
    ),
    queryFn: () => api<ProjectState>(`/projects/${selectedProjectId}/state`),
    staleTime: PROJECT_STALE_MS,
    refetchInterval: (query) =>
      query.state.status === "error"
        ? false
        : projectRefreshInterval(query.state.data) ||
          (pendingSubmission &&
          pendingSubmission.projectId === selectedProjectId &&
          pendingSubmission.until > Date.now()
            ? 5_000
            : false),
    refetchIntervalInBackground: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: (count, error) => !(error instanceof ProjectInputError) && count < 1
  })
  const onAction: ActionHandler = async (action) => {
    if (["deploy", "retry-preview"].includes(action.kind))
      setPendingSubmission({ projectId: action.projectId, until: Date.now() + 120_000 })
    if (action.kind === "retry-preview") {
      await api(
        `/projects/${action.projectId}/previews/${encodeURIComponent(String(action.values.previewId))}/retry`,
        "POST",
        {}
      )
      await client.invalidateQueries({ queryKey })
      return { projectId: action.projectId }
    }
    if (action.kind === "deploy" || action.kind === "close-preview") {
      await api(
        `/projects/${action.projectId}/${action.kind === "deploy" ? "github/deploy" : `previews/${encodeURIComponent(String(action.values.previewId))}/close`}`,
        "POST",
        { ...action.values, expectedReleaseId: action.values.expectedVersionId }
      )
      await client.invalidateQueries({ queryKey })
      return { projectId: action.projectId }
    }
    if (action.kind === "connect-repository") {
      const result = await api<{ url: string }>(`/projects/${action.projectId}/github/connect`, "POST", {})
      const target = new URL(result.url)
      if (target.origin !== "https://github.com") throw new Error("Invalid GitHub authorization address.")
      window.location.assign(target.href)
      return { projectId: action.projectId }
    }
    if (["promote", "rollback", "stage-version"].includes(action.kind)) {
      await api(`/projects/${action.projectId}/${action.kind === "promote" ? "promotions" : "rollbacks"}`, "POST", {
        releaseId: action.values.versionId,
        environment: action.values.environment,
        expectedReleaseId: action.values.expectedVersionId
      })
      await client.invalidateQueries({ queryKey })
      return { projectId: action.projectId }
    }
    if (["connect-domain", "save-domain", "verify-domain", "remove-domain"].includes(action.kind)) {
      const root = `/projects/${action.projectId}/domains`
      if (action.kind === "connect-domain" || action.kind === "save-domain") await api(root, "POST", action.values)
      else if (action.kind === "verify-domain")
        await api(`${root}/${encodeURIComponent(String(action.values.domainId))}/verify`, "POST", {})
      else await api(`${root}/${encodeURIComponent(String(action.values.domainId))}`, "DELETE")
      await client.invalidateQueries({ queryKey })
      return { projectId: action.projectId }
    }
    const rows = await api<{ projects: CloudProject[] }>("/projects")
    const records = rows.projects.map(local)
    let id = action.projectId
    let next: LocalProject | undefined
    if (action.kind === "create-project" || action.kind === "save-project") {
      if (action.kind === "create-project") id = crypto.randomUUID()
      next = saveProjectRecord(records, id, readProjectDraft(action.values)).find((row) => row.id === id)
    } else {
      const existing = records.find((row) => row.id === id)
      if (!existing) throw new Error("Project not found.")
      if (action.kind === "save-settings") {
        if (typeof action.values.branch !== "string" || !action.values.branch.trim())
          throw new Error("Enter a production branch.")
        next = {
          ...existing,
          name: String(action.values.name),
          productionBranch: action.values.branch.trim(),
          configuration: readProjectDraft({
            ...defaultProjectDraft,
            ...existing.configuration,
            name: action.values.name,
            telemetry: action.values.telemetry
          })
        }
      } else if (action.kind === "enable-sandbox" || action.kind === "enable-previews") {
        next = {
          ...existing,
          configuration: readProjectDraft({
            ...defaultProjectDraft,
            ...existing.configuration,
            name: existing.name,
            [action.kind === "enable-sandbox" ? "sandbox" : "previews"]: true
          })
        }
      } else throw new Error("This operation requires the deployment service.")
    }
    if (!next) throw new Error("Project not found.")
    const previous = rows.projects.find((row) => row.id === id)
    await api(previous ? `/projects/${id}` : "/projects", previous ? "PATCH" : "POST", {
      ...payload(next),
      revision: previous?.revision
    })
    await client.invalidateQueries({ queryKey })
    return { projectId: id }
  }
  return {
    projects: (query.data ?? []).map(local),
    states: {
      ...Object.fromEntries((query.data ?? []).map((project) => [project.id, project.state])),
      ...(selectedProjectId &&
      detail.data &&
      query.data?.find((project) => project.id === selectedProjectId)?.lifecycle !== "deleting"
        ? { [selectedProjectId]: detail.data }
        : {})
    },
    ready: !query.isPending && !(selectedProjectId && detail.isLoading),
    error: query.error?.message ?? detail.error?.message ?? "",
    onAction
  }
}
