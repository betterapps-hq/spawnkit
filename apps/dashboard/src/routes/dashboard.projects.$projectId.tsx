import { createFileRoute, notFound, Outlet } from "@tanstack/react-router"
export const Route = createFileRoute("/dashboard/projects/$projectId")({
  beforeLoad: ({ params }) => {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(params.projectId)) throw notFound()
  },
  component: Outlet
})
