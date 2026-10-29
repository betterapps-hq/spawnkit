import type { DeploymentView, ProjectPage, StudioLocation } from "@/components/project/model"

export const projectPages = new Set<ProjectPage>([
  "configure",
  "deployments",
  "domains",
  "analytics",
  "logs",
  "users",
  "backend",
  "settings"
])
export function deploymentSearch(search: Record<string, unknown>): {
  tab?: DeploymentView | undefined
  environment?: string | undefined
} {
  return {
    tab:
      search.tab === "environments" || search.tab === "releases" || search.tab === "activity" ? search.tab : undefined,
    environment:
      typeof search.environment === "string" && search.environment.length <= 256 ? search.environment : undefined
  }
}
export function dashboardDestination(location: StudioLocation) {
  if (location.page === "upload") return { to: "/dashboard/upload" as const }
  if (location.page === "manage") return { to: "/dashboard/manage" as const }
  if (location.page === "team") return { to: "/dashboard/team" as const }
  if (location.page === "reports") return { to: "/dashboard/reports" as const }
  if (location.page === "create") return { to: "/dashboard/new" as const }
  if (location.page === "submissions") return { to: "/dashboard/submissions" as const }
  if (location.page === "projects" || !location.projectId) return { to: "/dashboard" as const }
  const params = { projectId: location.projectId }
  if (location.page === "overview") return { to: "/dashboard/projects/$projectId" as const, params }
  if (location.page === "deployments" && location.versionId)
    return {
      to: "/dashboard/projects/$projectId/releases/$versionId" as const,
      params: { ...params, versionId: location.versionId }
    }
  return {
    to: "/dashboard/projects/$projectId/$page" as const,
    params: { ...params, page: location.page },
    search:
      location.page === "deployments"
        ? deploymentSearch({ tab: location.deploymentView, environment: location.environmentId })
        : {}
  }
}
