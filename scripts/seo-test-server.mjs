import { createServer as createHttpServer } from "node:http"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

// Isolated local fixtures exercise real server rendering without live account or catalog mutations.
let unavailable = false
let count = 1
const games = [
  {
    projectId: "seo-game",
    title: "Orchard Snake",
    description: "Collect apples using the arrow keys.",
    url: "https://fixture.spawnkit.games",
    coverUrl: "https://fixture.spawnkit.games/cover.webp",
    genre: "Arcade",
    dimension: "2D",
    details: { objective: "Collect every apple", controls: "Arrow keys", creator: "Orchard Studio", kitId: "phaser" },
    discoverable: true
  }
]
const api = createHttpServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:5197")
  response.setHeader("content-type", "application/json")
  if (url.pathname === "/fixture" && request.method === "POST") {
    unavailable = url.searchParams.get("unavailable") === "true"
    count = Number(url.searchParams.get("count") ?? 1)
    response.end("{}")
  } else if (unavailable || url.searchParams.get("project") === "unavailable") {
    response.writeHead(503).end('{"error":"temporarily unavailable"}')
  } else if (url.pathname === "/api/platform/v1/games/browse") {
    const page = Number(url.searchParams.get("page") ?? 1)
    const total = url.searchParams.has("genre") && url.searchParams.get("genre") !== "Arcade" ? 0 : count
    if (page > Math.max(1, Math.ceil(total / 24))) response.writeHead(404).end("{}")
    else
      response.end(
        JSON.stringify({
          games: Array.from({ length: total }, (_, i) => ({
            ...games[0],
            projectId: i === 0 ? "seo-game" : `fixture-${i}`,
            title: i === 0 ? games[0].title : `Fixture game ${i}`
          })).slice((page - 1) * 24, page * 24),
          total,
          page,
          pageSize: 24,
          categories: count >= 5 ? [{ genre: "Arcade", slug: "arcade", total: count }] : []
        })
      )
  } else if (url.pathname === "/api/platform/v1/games") {
    const id = url.searchParams.get("project")
    response.end(
      JSON.stringify({
        games:
          id === "hidden"
            ? [{ ...games[0], projectId: "hidden", discoverable: false }]
            : id
              ? games.filter((game) => game.projectId === id)
              : games
      })
    )
  } else if (url.pathname === "/api/platform/v1/games/sitemap") {
    response.end(JSON.stringify({ games: games.map(({ projectId }) => ({ projectId })), total: games.length }))
  } else response.writeHead(404).end("{}")
})
await new Promise((resolve, reject) => {
  api.once("error", reject)
  api.listen(5197, "127.0.0.1", resolve)
})
Object.assign(process.env, {
  VITE_CLERK_PUBLISHABLE_KEY: "",
  CLERK_SECRET_KEY: "",
  CLERK_OAUTH_CLIENT_ID: "",
  CLERK_OAUTH_ISSUER: "",
  SPAWN_CONTROL_API_URL: "http://127.0.0.1:5197",
  SPAWN_SITE_URL: "http://127.0.0.1:5196",
  SPAWN_VITE_CACHE: "node_modules/.vite-seo",
  SPAWN_LOCAL_ORIGIN: "http://127.0.0.1:5196"
})
const app = await createServer({
  root: fileURLToPath(new URL("../apps/dashboard", import.meta.url)),
  server: { host: "127.0.0.1", port: 5196, strictPort: true }
})
await app.listen()
async function close() {
  await app.close()
  api.close()
}
process.once("SIGINT", close)
process.once("SIGTERM", close)
