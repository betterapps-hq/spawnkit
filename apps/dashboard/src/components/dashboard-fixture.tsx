import { useState, type ComponentProps } from "react"
import { DashboardView } from "../Dashboard"
import { readDomainConfigurations } from "../lib/domain-config"
import { ProjectInputError, readProjectDraft, readProjectRecords, saveProjectRecord } from "../lib/project-records"
import { defaultProjectDraft } from "./project/creation-model"
import type { ActionHandler } from "./project/model"

// Design fixtures never call authenticated platform services or provision resources.
export function DashboardFixture(props: Omit<ComponentProps<typeof DashboardView>, "saved" | "cloudEnabled">) {
  const key = `spawn:workspaces:v1:${props.session.user.id}`
  const [projects, setProjects] = useState(() => readProjectRecords(localStorage.getItem(key)))
  const onAction: ActionHandler = async (action) => {
    let next = projects
    let id = action.projectId
    if (action.kind === "create-project" || action.kind === "save-project") {
      if (action.kind === "create-project") id = crypto.randomUUID()
      next = saveProjectRecord(projects, id, readProjectDraft(action.values))
    } else {
      const existing = projects.find((project) => project.id === id)
      if (!existing) throw new Error("Project not found.")
      if (action.kind === "save-domain") {
        const [domain] = readDomainConfigurations([action.values])
        if (!domain) throw new Error("Invalid domain.")
        if (projects.some((project) => project.domainConfigurations?.some((item) => item.hostname === domain.hostname)))
          throw new ProjectInputError("Domain is already configured.")
        next = projects.map((project) =>
          project.id === id
            ? { ...project, domainConfigurations: [...(project.domainConfigurations ?? []), domain] }
            : project
        )
      } else if (action.kind === "remove-domain")
        next = projects.map((project) =>
          project.id === id
            ? {
                ...project,
                domainConfigurations: (project.domainConfigurations ?? []).filter(
                  (domain) => domain.hostname !== action.values.domainId
                )
              }
            : project
        )
      else if (action.kind === "save-settings")
        next = projects.map((project) =>
          project.id === id
            ? {
                ...project,
                name: String(action.values.name),
                productionBranch: String(action.values.branch),
                configuration: readProjectDraft({
                  ...defaultProjectDraft,
                  ...project.configuration,
                  name: action.values.name,
                  telemetry: action.values.telemetry
                })
              }
            : project
        )
      else throw new Error("This action requires a connected platform in the application.")
    }
    localStorage.setItem(key, JSON.stringify(next))
    setProjects(next)
    return { projectId: id }
  }
  return <DashboardView {...props} saved={{ projects, states: {}, ready: true, error: "", onAction }} />
}
