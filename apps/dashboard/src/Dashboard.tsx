import { type templates, type addons } from "@spawn/templates/catalog"
import { useMemo, type ComponentProps } from "react"
import type { StudioLocation } from "./components/project/model"
import { Notice } from "./components/project/primitives"
import { ProjectStudio } from "./components/project/studio"
import { applyCloudState } from "./lib/cloud-project-model"
import { useCloudProjects } from "./lib/cloud-projects"
import { projectRecordModel } from "./lib/project-records"

export function Dashboard(props: Omit<ComponentProps<typeof DashboardView>, "saved" | "cloudEnabled">) {
  const saved = useCloudProjects(props.session.user.id)
  return <DashboardView {...props} saved={saved} cloudEnabled />
}

export function DashboardView({
  saved,
  cloudEnabled = false,
  catalog,
  session,
  initialView = "dashboard",
  location,
  onNavigate,
  onSignOut,
  onManageAccount,
  accountName,
  accountImage
}: {
  saved: ReturnType<typeof useCloudProjects>
  cloudEnabled?: boolean
  catalog: { templates: typeof templates; addons: typeof addons }
  session: { user: { id: string; email: string; firstName: string | null } }
  initialView?: "dashboard" | "templates"
  location?: StudioLocation | undefined
  onNavigate?: ((next: StudioLocation) => void) | undefined
  onSignOut: () => void
  onManageAccount?: (() => void) | undefined
  accountName?: string | undefined
  accountImage?: string | undefined
}) {
  const projects = useMemo(
    () => saved.projects.map((project) => applyCloudState(projectRecordModel(project), saved.states[project.id])),
    [saved.projects, saved.states]
  )
  const placeholder = useMemo(() => projectRecordModel({ id: "", name: "" }), [])
  const missing =
    saved.ready && !saved.error && location?.projectId && !projects.some((project) => project.id === location.projectId)
  return (
    <ProjectStudio
      key={session.user.id}
      telemetryEnabled
      project={projects[0] ?? placeholder}
      projects={projects}
      initialPage={initialView === "templates" ? "create" : "projects"}
      location={missing ? { page: "projects" } : location}
      onNavigate={onNavigate}
      templateCatalog={catalog.templates}
      cloudEnabled={cloudEnabled}
      storageReady={saved.ready}
      onAction={saved.error ? undefined : saved.onAction}
      banner={
        saved.error ? (
          <Notice>{saved.error}</Notice>
        ) : missing ? (
          <Notice>This project isn't available in this account.</Notice>
        ) : undefined
      }
      account={{
        name: accountName ?? session.user.firstName ?? session.user.email,
        email: session.user.email,
        imageUrl: accountImage,
        onManage: onManageAccount,
        onSignOut
      }}
    />
  )
}
