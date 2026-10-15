import { createFileRoute } from "@tanstack/react-router"
import { CloudPage } from "@/components/public/cloud-page"
export const Route = createFileRoute("/cloud")({
  head: () => ({
    meta: [
      { title: "Game cloud & pricing — SpawnKit" },
      {
        name: "description",
        content:
          "Explore SpawnKit game hosting and pricing, staging, preview environments, Colyseus multiplayer, and AI-ready telemetry."
      }
    ]
  }),
  component: CloudPage
})
