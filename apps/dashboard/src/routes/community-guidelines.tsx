import { createFileRoute } from "@tanstack/react-router"
import { GuidelinesPage } from "@/components/public/info-page"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/community-guidelines")({
  head: () => publicPageHead("/community-guidelines"),
  component: GuidelinesPage
})
