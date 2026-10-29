import { expect, it } from "vitest"
import { discoverGames, gameHref, gamesSearch, monthlyGames } from "./game-discovery"
const games = [
  {
    projectId: "one",
    title: "Orchard Snake",
    description: "Collect apples.",
    url: "https://one.example",
    views: 12,
    plays: 5
  },
  {
    projectId: "two",
    title: "Prism Break",
    description: "Break neon bricks.",
    url: "https://two.example",
    views: 42,
    plays: 9
  }
]
it("ranks monthly activity separately from lifetime popularity with stable ties", () => {
  const monthly = games.map((game, index) => ({ ...game, monthlyViews: index ? 1 : 4 }))
  expect(monthlyGames(monthly).map((game) => game.name)).toEqual(["Orchard Snake", "Prism Break"])
  expect(monthlyGames([...games].reverse()).map((game) => game.name)).toEqual(["Orchard Snake", "Prism Break"])
  expect(monthlyGames([])).toEqual([])
  expect(
    monthlyGames(Array.from({ length: 5 }, (_, i) => ({ ...games[0]!, projectId: String(i), monthlyViews: i })))
  ).toHaveLength(3)
})
it("never supplies invented games when the published feed is empty", () => {
  expect(discoverGames({})).toEqual([])
  expect(discoverGames({ availability: "concept" }, games)).toEqual([])
})
it("sorts only real releases using their persisted view counts", () => {
  expect(discoverGames({}, games).map((game) => game.name)).toEqual(["Prism Break", "Orchard Snake"])
  expect(discoverGames({ sort: "az" }, games)[0]?.name).toBe("Orchard Snake")
  expect(discoverGames({ sort: "newest" }, games)[0]?.name).toBe("Orchard Snake")
  expect(games[0]?.title).toBe("Orchard Snake")
})
it("searches deployed titles/descriptions and links to their tracked player", () => {
  const found = discoverGames({ q: "  APPLES " }, games)
  expect(found).toHaveLength(1)
  expect(gameHref(found[0]!)).toBe("/play/one")
  expect(discoverGames({ rating: "4" }, games)).toEqual([])
  expect(discoverGames({ reviews: "25" }, games)).toEqual([])
})
it("bounds URL inputs and rejects unsupported filters", () => {
  expect(gamesSearch({ q: "x".repeat(1000), genre: "unknown", sort: "random", rating: "Infinity" })).toMatchObject({
    q: "x".repeat(120),
    genre: undefined,
    sort: undefined,
    rating: undefined
  })
})
it("filters and sorts real classifications and community aggregates", () => {
  const classified = games.map((game, i) => ({
    ...game,
    genre: i ? "Arcade" : "Casual",
    dimension: "2D",
    rating: i ? 3 : 4.8,
    reviews: i ? 8 : 30
  }))
  expect(discoverGames({ genre: "Arcade", dimension: "2D" }, classified)[0]?.name).toBe("Prism Break")
  expect(discoverGames({ dimension: "3D" }, classified)).toEqual([])
  expect(discoverGames({ rating: "4", reviews: "25" }, classified)[0]?.name).toBe("Orchard Snake")
  expect(discoverGames({ sort: "rating" }, classified)[0]?.name).toBe("Orchard Snake")
  expect(discoverGames({ sort: "reviews" }, classified)[0]?.name).toBe("Orchard Snake")
})
