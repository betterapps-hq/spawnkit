import { useClerk, useUser } from "@clerk/tanstack-react-start"
import { useQuery } from "@tanstack/react-query"
import { Dashboard } from "./Dashboard"
import { getCatalog } from "./lib/server"
import { Route } from "./routes/dashboard"
export function App() {
  const { signOut, openUserProfile } = useClerk()
  const { user } = useUser()
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: catalog } = useQuery({ queryKey: ["catalog"], queryFn: () => getCatalog(), initialData: data.catalog })
  return (
    <Dashboard
      key={data.user.id}
      catalog={catalog}
      session={{ user: data.user }}
      location={{
        page: search.page ?? "projects",
        projectId: search.project,
        versionId: search.version,
        environmentId: search.environment,
        deploymentView: search.tab
      }}
      onNavigate={(next) =>
        void navigate({
          search: {
            page: next.page,
            project: next.projectId,
            version: next.versionId,
            environment: next.environmentId,
            tab: next.deploymentView
          }
        })
      }
      onSignOut={() => void signOut({ redirectUrl: "/sign-in" })}
      onManageAccount={() => openUserProfile()}
      accountName={user?.fullName ?? data.user.firstName ?? data.user.email}
      accountImage={user?.imageUrl}
    />
  )
}
