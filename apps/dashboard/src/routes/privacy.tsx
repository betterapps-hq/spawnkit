import { createFileRoute } from "@tanstack/react-router"
import { PrivacyPolicyPage } from "@/components/public/privacy-policy"
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy — SpawnKit" }] }),
  component: PrivacyPolicyPage
})
