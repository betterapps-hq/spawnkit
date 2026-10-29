import { findStarterKit } from "@spawn/templates/kits"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { KitPage } from "@/components/public/kit-page"
import { getStarterKitDetails } from "@/lib/kits"
import { pageHead } from "@/lib/seo"

export const Route = createFileRoute("/kits/$kit")({
  loader: async ({ params }) => {
    const kit = findStarterKit(params.kit)
    if (!kit) throw notFound()
    return { kit, details: await getStarterKitDetails({ data: kit.id }) }
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageHead(
          `/kits/${loaderData.kit.id}`,
          `${loaderData.kit.name} — SpawnKit`,
          loaderData.kit.description,
          loaderData.kit.name
        )
      : {},
  component: Page
})
function Page() {
  return <KitPage {...Route.useLoaderData()} />
}
