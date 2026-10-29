import { createFileRoute, notFound } from "@tanstack/react-router"
import { App } from "../App"
export const Route = createFileRoute("/dashboard/projects/$projectId/releases/$versionId")({
  beforeLoad: ({ params }) => {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(params.versionId)) throw notFound()
  },
  component: ReleaseRoute
})
function ReleaseRoute() {
  const { projectId, versionId } = Route.useParams()
  return <App location={{ page: "deployments", projectId, versionId }} />
}
