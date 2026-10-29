import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { BrowsePage } from "@/components/public/browse-page"
import { GameUnavailablePage } from "@/components/public/game-unavailable-page"
import { browseSearch, browseHref } from "@/lib/browse"
import { getBrowseGames } from "@/lib/publishing"
import { pageHead } from "@/lib/seo"

export const Route = createFileRoute("/browse")({
  validateSearch: browseSearch,
  beforeLoad: ({ search }) => {
    if (search.page === 0) throw notFound()
    if (search.page === 1) throw redirect({ href: "/browse", statusCode: 301 })
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ deps }) => {
    const result = await getBrowseGames({ data: deps })
    if (!result.catalog && !result.unavailable) throw notFound()
    return result
  },
  head: ({ loaderData }) => {
    const page = loaderData?.catalog?.page ?? 1
    return pageHead(
      browseHref("/browse", page),
      `Browse free browser games${page > 1 ? ` — Page ${page}` : ""} — SpawnKit`,
      "Explore the complete SpawnKit catalog of free browser games. Find a game, read its description and play in your browser.",
      "Browse games"
    )
  },
  component: Page
})
function Page() {
  const { catalog } = Route.useLoaderData()
  return catalog ? <BrowsePage catalog={catalog} /> : <GameUnavailablePage />
}
