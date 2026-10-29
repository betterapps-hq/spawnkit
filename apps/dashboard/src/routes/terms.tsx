import { createFileRoute } from "@tanstack/react-router"
import { TermsOfServicePage } from "@/components/public/terms-of-service"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/terms")({
  head: () => publicPageHead("/terms"),
  component: TermsOfServicePage
})
