import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getCatalog, getSession } from "@/lib/server"
export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const session = await getSession()
    if (!session.user) throw redirect({ to: "/sign-in" })
    return { user: session.user, catalog: await getCatalog() }
  },
  component: Outlet
})
