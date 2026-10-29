import { createFileRoute, notFound } from "@tanstack/react-router"
import type { ProjectPage } from "@/components/project/model"
import { deploymentSearch, projectPages } from "@/lib/dashboard-routing"
import { App } from "../App"
export const Route = createFileRoute("/dashboard/projects/$projectId/$page")({
  validateSearch: deploymentSearch,
  beforeLoad: ({ params }) => {
    if (!projectPages.has(params.page as ProjectPage)) throw notFound()
  },
  component: ProjectPageRoute
})
function ProjectPageRoute() {
  const { projectId, page } = Route.useParams()
  const search = Route.useSearch()
  return (
    <App
      location={{ page: page as ProjectPage, projectId, environmentId: search.environment, deploymentView: search.tab }}
    />
  )
}
