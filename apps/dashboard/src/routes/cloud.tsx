import { createFileRoute } from "@tanstack/react-router"
import { CloudPage } from "@/components/public/cloud-page"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/cloud")({
  head: () => publicPageHead("/cloud"),
  component: CloudPage
})
