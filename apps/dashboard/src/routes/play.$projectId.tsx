import { createFileRoute, notFound } from "@tanstack/react-router"
import { GameUnavailablePage } from "@/components/public/game-unavailable-page"
import { PublishedGamePage } from "@/components/public/published-game-page"
import { getPublishedGame, getRelatedGames } from "@/lib/publishing"
import { gamePageHead } from "@/lib/seo"
export const Route = createFileRoute("/play/$projectId")({
  loader: async ({ params }) => {
    const result = await getPublishedGame({ data: params.projectId })
    if (!result.game && !result.unavailable) throw notFound()
    return {
      ...result,
      related:
        result.game?.genre && result.game.discoverable !== false
          ? await getRelatedGames({ data: { projectId: params.projectId, genre: result.game.genre } })
          : []
    }
  },
  head: ({ loaderData }) =>
    loaderData?.game ? gamePageHead(loaderData.game) : { meta: [{ title: "Game temporarily unavailable — SpawnKit" }] },
  headers: ({ loaderData }) => (loaderData?.game?.discoverable === false ? { "X-Robots-Tag": "noindex, follow" } : {}),
  component: Page
})
function Page() {
  const { game, related } = Route.useLoaderData()
  if (!game) return <GameUnavailablePage />
  return <PublishedGamePage key={game.projectId} game={game} related={related} />
}
