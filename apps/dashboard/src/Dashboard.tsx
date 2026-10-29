import { useQuery } from "@tanstack/react-query"
import type { ComponentProps } from "react"
import { DashboardView } from "./dashboard-view"
import { useCloudProjects } from "./lib/cloud-projects"
import { getPublishingAccess } from "./lib/publishing"

export function Dashboard(props: Omit<ComponentProps<typeof DashboardView>, "saved" | "cloudEnabled">) {
  const saved = useCloudProjects(props.session.user.id, props.location?.projectId)
  const access = useQuery({
    queryKey: ["publishing-access", props.session.user.id],
    queryFn: () => getPublishingAccess()
  })
  return (
    <DashboardView
      {...props}
      saved={saved}
      cloudEnabled
      publishingAdmin={access.data?.admin ?? false}
      communityRole={access.data?.role ?? null}
    />
  )
}
