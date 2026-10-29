import { auth } from "@clerk/tanstack-react-start/server"
import type { CommunityAccess } from "@spawn/platform/community"
import type { GameDetails } from "@spawn/templates/listing"
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import type { SitemapGames } from "./seo-response"

export interface PublishedGame {
  details?: GameDetails
  projectId: string
  title: string
  description: string
  url: string
  coverUrl?: string | null
  trailerUrl?: string | null
  views?: number
  monthlyViews?: number
  plays?: number
  genre?: string | null
  dimension?: string | null
  rating?: number
  reviews?: number
  comments?: number
  discoverable?: boolean
}
export interface GameSubmission extends PublishedGame {
  id: string
  releaseId: string
  status: "pending" | "approved" | "rejected" | "unpublished" | "superseded"
  submittedAt: string
  reviewedAt: string | null
  reviewNote: string
}
async function catalogUnavailable() {
  if (import.meta.env.SSR) {
    const { setResponseHeader, setResponseStatus } = await import("@tanstack/react-start/server")
    setResponseStatus(503)
    setResponseHeader("Retry-After", "60")
  }
}
async function service(path: string, token?: string | null) {
  const origin = process.env.SPAWN_CONTROL_API_URL
  if (!origin) throw new Error("Publishing service is not configured.")
  const request = new Request(new URL(`/api/platform/v1/${path}`, origin), {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(10000)
  })
  // Public catalog reads stay within Cloudflare in production. Local Vite uses HTTP.
  let catalog: { fetch(request: Request): Promise<Response> } | undefined
  if (
    import.meta.env.SSR &&
    !token &&
    (path === "games" ||
      path.startsWith("games?") ||
      path.startsWith("games/sitemap?") ||
      path.startsWith("games/browse?"))
  ) {
    const workers = await import("cloudflare:workers").catch(() => null)
    catalog = workers?.env.GAME_CATALOG
  }
  const response = await (catalog ? catalog.fetch(request) : fetch(request))
  if (response.status === 404 && path.startsWith("games/browse?")) return response
  if (!response.ok)
    throw new Error(
      response.status === 403
        ? "Administrator access required."
        : "Publishing service is unavailable. Please try again."
    )
  return response
}
export const getPublishedGames = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ games: PublishedGame[]; unavailable: boolean }> => {
    try {
      return { ...((await (await service("games")).json()) as { games: PublishedGame[] }), unavailable: false }
    } catch {
      await catalogUnavailable()
      return { games: [], unavailable: true }
    }
  }
)
export const getGameSitemap = createServerOnlyFn(async (page: number): Promise<SitemapGames> => {
  return (await service(`games/sitemap?page=${page}`)).json() as Promise<SitemapGames>
})
export interface BrowseGames {
  games: PublishedGame[]
  total: number
  page: number
  pageSize: number
  categories: { genre: string; slug: string; total: number }[]
}
export const getBrowseGames = createServerFn({ method: "GET" })
  .validator((data: { page: number; genre?: string }) => {
    if (!Number.isSafeInteger(data.page) || data.page < 1 || data.page > 999999) throw new Error("Invalid page")
    return data
  })
  .handler(async ({ data }): Promise<{ catalog: BrowseGames | null; unavailable: boolean }> => {
    try {
      const response = await service(
        `games/browse?${new URLSearchParams({ page: String(data.page), ...(data.genre ? { genre: data.genre } : {}) })}`
      )
      if (response.status === 404) return { catalog: null, unavailable: false }
      return { catalog: (await response.json()) as BrowseGames, unavailable: false }
    } catch {
      await catalogUnavailable()
      return { catalog: null, unavailable: true }
    }
  })
export const getRelatedGames = createServerFn({ method: "GET" })
  .validator((data: { projectId: string; genre: string }) => data)
  .handler(async ({ data }): Promise<PublishedGame[]> => {
    try {
      const response = await service(`games/browse?${new URLSearchParams({ page: "1", genre: data.genre })}`)
      const result = (await response.json()) as BrowseGames
      return result.games.filter((game) => game.projectId !== data.projectId).slice(0, 3)
    } catch {
      return []
    }
  })
export const getPublishingAccess = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth()
  if (!session.userId) return { signedIn: false, admin: false, role: null }
  const result = (await (await service("me", await session.getToken())).json()) as CommunityAccess
  return { signedIn: true, admin: result.admin, role: result.role }
})
export const getPublishedGame = createServerFn({ method: "GET" })
  .validator((projectId: string) => {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(projectId)) throw new Error("Invalid game address.")
    return projectId
  })
  .handler(async ({ data }): Promise<{ game: PublishedGame | null; unavailable: boolean }> => {
    try {
      const result = (await (await service(`games?project=${encodeURIComponent(data)}`)).json()) as {
        games: PublishedGame[]
      }
      return { game: result.games[0] ?? null, unavailable: false }
    } catch {
      await catalogUnavailable()
      return { game: null, unavailable: true }
    }
  })
