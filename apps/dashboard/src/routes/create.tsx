import { createFileRoute } from "@tanstack/react-router"
import { CreatePage } from "@/components/public/create-page"
import { publicPageHead } from "@/lib/seo"
export const Route = createFileRoute("/create")({
  head: () => publicPageHead("/create"),
  component: CreatePage
})
