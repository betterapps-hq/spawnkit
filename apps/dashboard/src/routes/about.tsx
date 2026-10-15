import { createFileRoute } from "@tanstack/react-router"
import { AboutPage } from "@/components/public/info-page"
export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About SpawnKit" }] }),
  component: AboutPage
})
