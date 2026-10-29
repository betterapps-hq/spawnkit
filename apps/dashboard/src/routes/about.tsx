import { createFileRoute } from "@tanstack/react-router"
import { AboutPage } from "@/components/public/info-page"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/about")({
  head: () => publicPageHead("/about"),
  component: AboutPage
})
