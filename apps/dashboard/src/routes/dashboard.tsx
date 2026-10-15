import { createFileRoute, redirect } from "@tanstack/react-router"
import type { DeploymentView, ProjectPage } from "@/components/project/model"
import { getCatalog, getSession } from "@/lib/server"
import { App } from "../App"
const pages = new Set([
  "projects",
  "create",
  "configure",
  "overview",
  "deployments",
  "domains",
  "analytics",
  "logs",
  "users",
  "settings",
  "backend"
])
export const Route = createFileRoute("/dashboard")({
  validateSearch: (
    search: Record<string, unknown>
  ): {
    page?: ProjectPage
    project?: string | undefined
    version?: string | undefined
    environment?: string | undefined
    tab?: DeploymentView | undefined
  } => {
    const page =
      search.view === "templates"
        ? "create"
        : typeof search.page === "string" && pages.has(search.page)
          ? (search.page as ProjectPage)
          : "projects"
    const project = typeof search.project === "string" && search.project.length <= 200 ? search.project : undefined
    return {
      page: !project && page !== "create" ? "projects" : page,
      project,
      tab:
        page === "deployments" &&
        (search.tab === "environments" || search.tab === "releases" || search.tab === "activity")
          ? search.tab
          : undefined,
      environment:
        page === "deployments" && typeof search.environment === "string" && search.environment.length <= 256
          ? search.environment
          : undefined,
      version: page === "deployments" && typeof search.version === "string" ? search.version : undefined
    }
  },
  loader: async () => {
    const session = await getSession()
    if (!session.user) throw redirect({ to: "/sign-in" })
    return { user: session.user, catalog: await getCatalog() }
  },
  component: App
})
