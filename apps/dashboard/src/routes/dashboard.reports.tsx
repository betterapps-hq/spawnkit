import { createFileRoute } from "@tanstack/react-router"
import { App } from "../App"
export const Route = createFileRoute("/dashboard/reports")({ component: () => <App location={{ page: "reports" }} /> })
