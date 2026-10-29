import { createFileRoute } from "@tanstack/react-router"
import { PrivacyPolicyPage } from "@/components/public/privacy-policy"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/privacy")({
  head: () => publicPageHead("/privacy"),
  component: PrivacyPolicyPage
})
