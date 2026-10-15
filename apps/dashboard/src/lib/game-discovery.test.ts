import { expect, it } from "vitest"
import { discoverGames, gamesSearch, publicGames } from "./game-discovery"

it("normalizes untrusted URL filters and bounds search input", () => {
  expect(
    gamesSearch({ q: "x".repeat(1000), genre: "Unknown", dimension: "4D", availability: "yes", sort: "random" })
  ).toEqual({ q: "x".repeat(120), genre: undefined, dimension: undefined, availability: undefined, sort: undefined })
})
it("combines search and filters without confusing concepts with playable releases", () => {
  expect(
    discoverGames({ q: "  ORCHARD  ", availability: "playable", dimension: "2D", genre: "Arcade" }).map(
      (game) => game.id
    )
  ).toEqual(["snake"])
  expect(discoverGames({ availability: "playable", dimension: "3D" })).toEqual([])
  expect(discoverGames({ availability: "concept" }).every((game) => !game.playable)).toBe(true)
  expect(
    discoverGames({ genre: "Strategy" })
      .map((game) => game.id)
      .sort()
  ).toEqual(["iron-frontier", "kingdoms-at-war", "tower-defense"])
  expect(discoverGames({ genre: "Action", availability: "playable" }).map((game) => game.id)).toEqual(["space-shooter"])
})
it("sorts a copy of the catalog and searches engine and genre descriptions", () => {
  const original = publicGames.map((game) => game.id)
  expect(discoverGames({ sort: "az" })[0]?.name).toBe("Alpine Rally")
  expect(discoverGames({ q: "pixi" })).toHaveLength(3)
  expect(publicGames.map((game) => game.id)).toEqual(original)
})
