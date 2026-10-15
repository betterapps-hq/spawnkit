import { communityPreview } from "./community-preview"
import { exampleGames } from "./example-catalog"

const playable = new Set(["snake", "breakout", "space-shooter"])
const featured = ["snake", "breakout", "space-shooter", "racing", "platformer-3d", "dungeon-crawler"]
const genreGroups: Record<string, readonly string[]> = {
  Adventure: ["Platformer", "Dungeon Crawler", "Endless Runner", "Space Flight"],
  Action: ["Arena Combat", "First-person Shooter", "Space Shooter"],
  Strategy: ["RTS", "Turn-based Strategy", "Tower Defense"]
}
export const publicGames = exampleGames.map((game, index) => ({
  ...game,
  playable: playable.has(game.id),
  order: featured.includes(game.id) ? featured.indexOf(game.id) : index + featured.length,
  added: index
}))
export type PublicGame = (typeof publicGames)[number]
export type GamesSearch = {
  q?: string | undefined
  genre?: string | undefined
  dimension?: string | undefined
  availability?: string | undefined
  rating?: string | undefined
  reviews?: string | undefined
  sort?: string | undefined
}
export function gamesSearch(search: Record<string, unknown>): GamesSearch {
  return {
    q: typeof search.q === "string" ? search.q.slice(0, 120) : undefined,
    genre:
      typeof search.genre === "string" &&
      (Object.hasOwn(genreGroups, search.genre) || publicGames.some((game) => game.genre === search.genre))
        ? search.genre
        : undefined,
    dimension: search.dimension === "2D" || search.dimension === "3D" ? search.dimension : undefined,
    availability:
      search.availability === "playable" || search.availability === "concept" ? search.availability : undefined,
    rating: ["4", "4.5", "4.8"].includes(String(search.rating)) ? String(search.rating) : undefined,
    reviews: ["25", "50", "100"].includes(String(search.reviews)) ? String(search.reviews) : undefined,
    sort: ["az", "newest", "popular", "rating", "reviews"].includes(String(search.sort))
      ? String(search.sort)
      : undefined
  }
}
export function discoverGames(search: GamesSearch) {
  const query = search.q?.trim().toLowerCase() ?? ""
  return publicGames
    .filter(
      (game) =>
        (!search.genre ||
          (Object.hasOwn(genreGroups, search.genre)
            ? genreGroups[search.genre]!.includes(game.genre)
            : game.genre === search.genre)) &&
        (!search.dimension || game.dimension === search.dimension) &&
        (!search.availability || (search.availability === "playable" ? game.playable : !game.playable)) &&
        (!search.rating || communityPreview(game.id).rating >= Number(search.rating)) &&
        (!search.reviews || communityPreview(game.id).reviews >= Number(search.reviews)) &&
        `${game.name} ${game.description} ${game.genre} ${game.engine}`.toLowerCase().includes(query)
    )
    .sort((a, b) => {
      const left = communityPreview(a.id)
      const right = communityPreview(b.id)
      if (search.sort === "az") return a.name.localeCompare(b.name)
      if (search.sort === "newest") return b.added - a.added
      if (search.sort === "rating") return right.rating - left.rating || right.reviews - left.reviews
      if (search.sort === "reviews") return right.reviews - left.reviews
      return right.activity - left.activity || a.order - b.order
    })
}
