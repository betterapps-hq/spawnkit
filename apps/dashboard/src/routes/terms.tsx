import { createFileRoute } from "@tanstack/react-router"
import { PolicyPlaceholder } from "@/components/public/company-pages"
export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of service — SpawnKit" }, { name: "robots", content: "noindex" }] }),
  component: () => <PolicyPlaceholder kind="terms" />
})
