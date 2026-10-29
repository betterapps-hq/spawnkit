import { createFileRoute } from "@tanstack/react-router"
import { App } from "../App"
export const Route = createFileRoute("/dashboard/new")({
  component: () => <App location={{ page: "create" }} />
})
