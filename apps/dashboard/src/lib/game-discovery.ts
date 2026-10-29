import { gameGenres } from "@spawn/templates/listing"
import type { PublishedGame } from "./publishing"

export type DiscoveryGame = {
  id: string
  name: string
  description: string
  genre: string
  dimension: string
  engine: string
  playable: boolean
  order: number
  added: number
  published: PublishedGame
}
export function gameCatalog(published: PublishedGame[] = []): DiscoveryGame[] {
  return published.map((game, index) => ({
    id: `published:${game.projectId}`,
    name: game.title,
    description: game.description,
    genre: game.genre ?? "",
    dimension: game.dimension ?? "",
    engine: "",
    playable: true,
    order: index,
    added: published.length - index,
    published: game
  }))
}
export function gameHref(game: DiscoveryGame) {
  return `/play/${game.published.projectId}`
}
export function monthlyGames(published: PublishedGame[]) {
  return gameCatalog(published)
    .sort(
      (a, b) =>
        (b.published.monthlyViews ?? 0) - (a.published.monthlyViews ?? 0) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id)
    )
    .slice(0, 3)
}
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
    genre: gameGenres.find((genre) => genre === search.genre),
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
export function discoverGames(search: GamesSearch, published: PublishedGame[] = []) {
  const query = search.q?.trim().toLowerCase() ?? ""
  return gameCatalog(published)
    .filter(
      (game) =>
        (!search.genre || game.genre === search.genre) &&
        (!search.dimension || game.dimension === search.dimension) &&
        (!search.availability || (search.availability === "playable" ? game.playable : !game.playable)) &&
        (!search.rating || (game.published.rating ?? 0) >= Number(search.rating)) &&
        (!search.reviews || (game.published.reviews ?? 0) >= Number(search.reviews)) &&
        `${game.name} ${game.description} ${game.genre} ${game.engine}`.toLowerCase().includes(query)
    )
    .sort((a, b) => {
      const left = { rating: a.published.rating ?? 0, reviews: a.published.reviews ?? 0 }
      const right = { rating: b.published.rating ?? 0, reviews: b.published.reviews ?? 0 }
      if (search.sort === "az") return a.name.localeCompare(b.name)
      if (search.sort === "newest") return b.added - a.added
      if (search.sort === "rating") return right.rating - left.rating || right.reviews - left.reviews
      if (search.sort === "reviews") return right.reviews - left.reviews
      return (b.published.views ?? 0) - (a.published.views ?? 0) || a.order - b.order
    })
}
