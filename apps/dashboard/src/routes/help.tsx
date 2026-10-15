import { createFileRoute } from "@tanstack/react-router"
import { HelpPage } from "@/components/public/info-page"
export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Getting started — SpawnKit" }] }),
  component: HelpPage
})
