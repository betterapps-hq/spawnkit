import { TabsList, TabsTrigger } from "../../ui/tabs"

export function DeploymentViewTabs({ activity = false }: { activity?: boolean }) {
  return (
    <TabsList aria-label="Deployment views" className="max-w-full">
      <TabsTrigger value="environments" className="px-3">
        Environments
      </TabsTrigger>
      <TabsTrigger value="releases" className="px-3">
        Releases
      </TabsTrigger>
      {activity && (
        <TabsTrigger value="activity" className="px-3">
          Activity
        </TabsTrigger>
      )}
    </TabsList>
  )
}
