import { gameCategories, gameCategoryMinimum } from "@spawn/templates/listing"
import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { BrowsePage } from "@/components/public/browse-page"
import { GameUnavailablePage } from "@/components/public/game-unavailable-page"
import { browseSearch, browseHref } from "@/lib/browse"
import { getBrowseGames } from "@/lib/publishing"
import { pageHead } from "@/lib/seo"

export const Route = createFileRoute("/categories/$genre")({
  validateSearch: browseSearch,
  beforeLoad: ({ search, params }) => {
    if (search.page === 0 || !gameCategories.some((category) => category.slug === params.genre)) throw notFound()
    if (search.page === 1) throw redirect({ href: `/categories/${params.genre}`, statusCode: 301 })
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ params, deps }) => {
    const category = gameCategories.find((item) => item.slug === params.genre)!
    const result = await getBrowseGames({ data: { ...deps, genre: category.genre } })
    if (!result.unavailable && (!result.catalog || result.catalog.total < gameCategoryMinimum)) throw notFound()
    return { ...result, category }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { category, catalog } = loaderData
    const page = catalog?.page ?? 1
    return pageHead(
      browseHref(`/categories/${category.slug}`, page),
      `${category.genre} browser games${page > 1 ? ` — Page ${page}` : ""} — SpawnKit`,
      `Play free ${category.genre.toLowerCase()} games in your browser. Explore available games and find your next favorite.`,
      `${category.genre} games`
    )
  },
  component: Page
})
function Page() {
  const { catalog, category } = Route.useLoaderData()
  return catalog ? <BrowsePage catalog={catalog} genre={category.genre} /> : <GameUnavailablePage />
}
