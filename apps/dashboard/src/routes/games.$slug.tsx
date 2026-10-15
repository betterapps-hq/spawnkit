import { createFileRoute, notFound } from "@tanstack/react-router"
import { GamePage } from "@/components/public/game-page"
import { publicGames } from "@/lib/game-discovery"
export const Route = createFileRoute("/games/$slug")({
  loader: ({ params }) => {
    const game = publicGames.find((entry) => entry.id === params.slug)
    if (!game) throw notFound()
    return { game }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.game.name ?? "Game"} — SpawnKit` },
      {
        name: "description",
        content: loaderData?.game.description ?? "Find a game to play or an idea to make your own."
      },
      { property: "og:title", content: `${loaderData?.game.name ?? "Discover games"} — SpawnKit` },
      {
        property: "og:description",
        content: loaderData?.game.playable
          ? "Play this free arcade demo in your browser, then make a game of your own."
          : "Explore this game concept and build your own idea with a free starter kit."
      },
      { property: "og:type", content: "website" },
      ...(loaderData
        ? [{ property: "og:image", content: `https://spawnkit.cloud/examples/${loaderData.game.id}.webp` }]
        : []),
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: GameRoute
})
function GameRoute() {
  return <GamePage game={Route.useLoaderData().game} />
}
