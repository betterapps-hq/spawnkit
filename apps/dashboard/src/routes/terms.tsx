import { createFileRoute } from "@tanstack/react-router"
import { TermsOfServicePage } from "@/components/public/terms-of-service"
export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of service — SpawnKit" }] }),
  component: TermsOfServicePage
})
