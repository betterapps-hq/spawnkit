import { createFileRoute } from "@tanstack/react-router"
import { App } from "../App"
export const Route = createFileRoute("/dashboard/projects/$projectId/")({ component: ProjectOverview })
function ProjectOverview() {
  const { projectId } = Route.useParams()
  return <App location={{ page: "overview", projectId }} />
}
