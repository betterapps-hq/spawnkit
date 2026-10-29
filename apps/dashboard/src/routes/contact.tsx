import { createFileRoute } from "@tanstack/react-router"
import { ContactPage } from "@/components/public/company-pages"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/contact")({
  head: () => publicPageHead("/contact"),
  component: ContactPage
})
