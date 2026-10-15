import { createFileRoute } from "@tanstack/react-router"
import { ContactPage } from "@/components/public/company-pages"
export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — SpawnKit" }, { name: "robots", content: "noindex" }] }),
  component: ContactPage
})
