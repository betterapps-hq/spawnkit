import { createFileRoute } from "@tanstack/react-router"
import { CreatePage } from "@/components/public/create-page"
export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Make your first game — SpawnKit" },
      {
        name: "description",
        content:
          "From your first idea to a playable web game. Start with a real game engine, a clean TypeScript project, and a path to the cloud."
      }
    ]
  }),
  component: CreatePage
})
