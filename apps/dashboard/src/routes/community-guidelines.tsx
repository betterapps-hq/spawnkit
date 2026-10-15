import { createFileRoute } from "@tanstack/react-router"
import { GuidelinesPage } from "@/components/public/info-page"
export const Route = createFileRoute("/community-guidelines")({
  head: () => ({ meta: [{ title: "Community guidelines — SpawnKit" }] }),
  component: GuidelinesPage
})
