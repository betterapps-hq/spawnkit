import { createFileRoute } from "@tanstack/react-router"
import { CloudPage } from "@/components/public/cloud-page"
export const Route = createFileRoute("/cloud")({
  head: () => ({
    meta: [
      { title: "Your game. Our cloud. — SpawnKit" },
      {
        name: "description",
        content:
          "Explore SpawnKit game hosting, staging, preview environments, Colyseus multiplayer, and AI-ready telemetry."
      }
    ]
  }),
  component: CloudPage
})
