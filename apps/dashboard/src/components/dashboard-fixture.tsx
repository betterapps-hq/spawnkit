import { useCallback, useEffect, useState, type ComponentProps } from "react"
import { DashboardView } from "../Dashboard"
import { readDomainConfigurations } from "../lib/domain-config"
import { ProjectInputError, readProjectDraft, readProjectRecords, saveProjectRecord } from "../lib/project-records"
import { defaultProjectDraft } from "./project/creation-model"
import type { ActionHandler } from "./project/model"

// Design fixtures never call authenticated platform services or provision resources.
type FixtureProps = Omit<ComponentProps<typeof DashboardView>, "saved" | "cloudEnabled">
export function DashboardFixture(props: FixtureProps) {
  return <StoredDashboardFixture key={props.session.user.id} {...props} />
}
function StoredDashboardFixture(props: FixtureProps) {
  const key = `spawn:workspaces:v1:${props.session.user.id}`
  const read = useCallback(() => {
    try {
      return { projects: readProjectRecords(localStorage.getItem(key)), error: "" }
    } catch {
      return { projects: [], error: "Saved projects could not be read. Existing data has been kept." }
    }
  }, [key])
  const [{ projects, error }, setSaved] = useState(read)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === key || event.key === null)) setSaved(read())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [key, read])
  const onAction: ActionHandler = async (action) => {
    const current = read()
    if (current.error) {
      setSaved(current)
      throw new ProjectInputError(current.error)
    }
    const projects = current.projects
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
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      throw new ProjectInputError(
        "Your changes were not saved. Keep this page open and try again when storage is available."
      )
    }
    setSaved({ projects: next, error: "" })
    return { projectId: id }
  }
  return <DashboardView {...props} saved={{ projects, states: {}, ready: true, error, onAction }} />
}
