import { createFileRoute } from "@tanstack/react-router"
import { App } from "../App"
export const Route = createFileRoute("/dashboard/")({
  component: () => <App location={{ page: "projects" }} />
})
