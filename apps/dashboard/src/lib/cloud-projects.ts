import { useQuery, useQueryClient } from "@tanstack/react-query"
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

interface CloudProject {
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
    configuration: project.configuration ?? { ...defaultProjectDraft, name: project.name },
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

export function useCloudProjects(userId: string) {
  const client = useQueryClient()
  const queryKey = ["projects", userId]
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      let result = await api<{ projects: CloudProject[] }>("/projects")
      const key = `spawn:workspaces:v1:${userId}`
      // The browser copy is a migration backup. Never remove it or overwrite cloud records.
      let old: LocalProject[] = []
      try {
        old = readProjectRecords(window.localStorage.getItem(key))
      } catch {
        /* Cloud access does not depend on browser storage. */
      }
      const missing = old.filter((project) => !result.projects.some((row) => row.id === project.id))
      for (const project of missing) await api("/projects", "POST", payload(project))
      if (missing.length) result = await api<{ projects: CloudProject[] }>("/projects")
      return Promise.all(
        result.projects.map(async (project) => ({
          ...project,
          state: await api<ProjectState>(`/projects/${project.id}/state`)
        }))
      )
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: 1
  })
  const onAction: ActionHandler = async (action) => {
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
    states: Object.fromEntries((query.data ?? []).map((project) => [project.id, project.state])),
    ready: !query.isPending,
    error: query.error?.message ?? "",
    onAction
  }
}
