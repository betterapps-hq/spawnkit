import { createFileRoute } from "@tanstack/react-router"
import { GamesPage } from "@/components/public/games-page"
import { gamesSearch } from "@/lib/game-discovery"
import { getPublishedGames } from "@/lib/publishing"
import { indexablePath, publicPageHead } from "@/lib/seo"

export const Route = createFileRoute("/")({
  validateSearch: gamesSearch,
  loader: () => getPublishedGames(),
  head: ({ match }) =>
    publicPageHead(
      "/",
      !indexablePath(
        "/",
        new URLSearchParams(
          Object.entries(match.search)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)])
        ).toString()
      )
    ),
  component: GamesRoute
})
function GamesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <GamesPage
      published={Route.useLoaderData().games}
      unavailable={Route.useLoaderData().unavailable}
      search={search}
      onSearch={(next) => void navigate({ search: next, replace: true, resetScroll: false })}
    />
  )
}
