import { useClerk, useUser } from "@clerk/tanstack-react-start"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { StudioLocation } from "./components/project/model"
import { Dashboard } from "./Dashboard"
import { dashboardDestination } from "./lib/dashboard-routing"
import { getCatalog } from "./lib/server"
import { Route } from "./routes/dashboard"
export function App({ location }: { location: StudioLocation }) {
  const { signOut, openUserProfile } = useClerk()
  const { user } = useUser()
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const { data: catalog } = useQuery({ queryKey: ["catalog"], queryFn: () => getCatalog(), initialData: data.catalog })
  return (
    <Dashboard
      key={data.user.id}
      catalog={catalog}
      session={{ user: data.user }}
      location={location}
      onNavigate={(next) => void navigate(dashboardDestination(next))}
      onSignOut={() => void signOut({ redirectUrl: "/sign-in" })}
      onManageAccount={() => openUserProfile()}
      accountName={user?.fullName ?? data.user.firstName ?? data.user.email}
      accountImage={user?.imageUrl}
    />
  )
}
