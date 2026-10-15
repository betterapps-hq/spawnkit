import { createFileRoute } from "@tanstack/react-router"
import { PolicyPlaceholder } from "@/components/public/company-pages"
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy — SpawnKit" }, { name: "robots", content: "noindex" }] }),
  component: () => <PolicyPlaceholder kind="privacy" />
})
