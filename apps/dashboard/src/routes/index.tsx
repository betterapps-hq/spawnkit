import { createFileRoute, redirect } from "@tanstack/react-router"
import { GamesPage } from "@/components/public/games-page"
import { gamesSearch } from "@/lib/game-discovery"

export const Route = createFileRoute("/")({
  validateSearch: gamesSearch,
  beforeLoad: ({ location }) => {
    const params = new URLSearchParams(location.searchStr)
    if (["page", "project", "view"].some((key) => params.has(key)))
      throw redirect({ href: `/dashboard${location.searchStr}` })
  },
  head: () => ({
    meta: [
      { title: "SpawnKit — Free browser games" },
      { property: "og:title", content: "Free browser games — SpawnKit" },
      {
        property: "og:description",
        content: "Play free browser games and download starter kits for building your own."
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://spawnkit.cloud/examples/space-shooter.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Discover free browser game demos and new game ideas. Find something to play, then build a game of your own with SpawnKit."
      }
    ]
  }),
  component: GamesRoute
})
function GamesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <GamesPage
      search={search}
      onSearch={(next) => void navigate({ search: next, replace: true, resetScroll: false })}
    />
  )
}
