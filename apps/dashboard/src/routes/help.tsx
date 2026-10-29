import { createFileRoute } from "@tanstack/react-router"
import { HelpPage } from "@/components/public/info-page"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/help")({
  head: () => publicPageHead("/help"),
  component: HelpPage
})
