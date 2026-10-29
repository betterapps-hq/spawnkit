import { starterKits } from "@spawn/templates/kits"
import { gameCategories, gameCategoryMinimum } from "@spawn/templates/listing"
import { agentDocuments } from "./agent-docs"
import { indexablePath, publicOrigin, publicPages } from "./seo"

export type SitemapGames = {
  games: { projectId: string }[]
  total: number
  categories?: { slug: string; total: number }[]
}
const pageSize = 1000
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!
  )

export function indexingHeaders(request: Request, response: Response) {
  const url = new URL(request.url)
  const headers = new Headers(response.headers)
  if (url.origin !== publicOrigin || !indexablePath(url.pathname, url.search) || response.status >= 400)
    headers.set("X-Robots-Tag", "noindex, follow")
  if (response.status >= 500) headers.set("Retry-After", "60")
  return headers
}

/** Crawl documents bypass authentication and are built only from public records. */
export async function crawlResponse(request: Request, games: (page: number) => Promise<SitemapGames>) {
  const url = new URL(request.url)
  const match = /^\/sitemaps\/games-([1-9]\d{0,4})\.xml$/.exec(url.pathname)
  if (
    !["/robots.txt", "/sitemap.xml", "/sitemaps/pages.xml", "/sitemaps/categories.xml"].includes(url.pathname) &&
    !match
  )
    return null
  const respond = (body: string, status = 200, type = "application/xml") =>
    new Response(request.method === "HEAD" ? null : body, {
      status,
      headers: {
        "Content-Type": `${type}; charset=utf-8`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(url.origin !== publicOrigin ? { "X-Robots-Tag": "noindex" } : {}),
        ...(status === 503 ? { "Retry-After": "60" } : {}),
        ...(status === 405 ? { Allow: "GET, HEAD" } : {})
      }
    })
  if (!["GET", "HEAD"].includes(request.method)) return respond("Method not allowed", 405, "text/plain")
  if (url.pathname === "/robots.txt")
    return respond(
      url.origin === publicOrigin
        ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /_serverFn/\n\nSitemap: ${publicOrigin}/sitemap.xml\n`
        : "User-agent: *\nDisallow: /\n",
      200,
      "text/plain"
    )
  // Preview/local hosts never advertise production inventory as their own.
  if (url.origin !== publicOrigin) return respond("Not found", 404, "text/plain")
  const document = (root: "sitemapindex" | "urlset", entries: string[]) =>
    `<?xml version="1.0" encoding="UTF-8"?>\n<${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</${root}>\n`
  if (url.pathname === "/sitemaps/pages.xml")
    return respond(
      document(
        "urlset",
        [
          ...Object.keys(publicPages),
          ...starterKits.map((kit) => `/kits/${kit.id}`),
          ...agentDocuments.map((doc) => `/docs/${doc.id}`)
        ].map((path) => `<url><loc>${xml(publicOrigin + path)}</loc></url>`)
      )
    )
  try {
    const page = match ? Number(match[1]) : 1
    if (page > 49999) return respond("Not found", 404, "text/plain")
    const data = await games(page)
    if (
      !Number.isSafeInteger(data.total) ||
      data.total < 0 ||
      data.total > 49_999_000 ||
      !Array.isArray(data.games) ||
      data.games.length > pageSize ||
      data.games.some((game) => !/^[A-Za-z0-9_-]{1,128}$/.test(game.projectId))
    )
      throw new Error("Invalid sitemap inventory")
    const categories = (data.categories ?? []).filter(
      (category) => category.total >= gameCategoryMinimum && gameCategories.some((item) => item.slug === category.slug)
    )
    if (url.pathname === "/sitemaps/categories.xml")
      return respond(
        document(
          "urlset",
          categories.map((category) => `<url><loc>${publicOrigin}/categories/${category.slug}</loc></url>`)
        )
      )
    if (!match) {
      const paths = [
        "/sitemaps/pages.xml",
        ...(categories.length ? ["/sitemaps/categories.xml"] : []),
        ...Array.from({ length: Math.ceil(data.total / pageSize) }, (_, index) => `/sitemaps/games-${index + 1}.xml`)
      ]
      return respond(
        document(
          "sitemapindex",
          paths.map((path) => `<sitemap><loc>${xml(publicOrigin + path)}</loc></sitemap>`)
        )
      )
    }
    if (page > Math.ceil(data.total / pageSize)) return respond("Not found", 404, "text/plain")
    return respond(
      document(
        "urlset",
        [...new Set(data.games.map((game) => game.projectId))].map(
          (id) => `<url><loc>${publicOrigin}/play/${id}</loc></url>`
        )
      )
    )
  } catch {
    return respond("Game sitemap temporarily unavailable. Please retry.", 503, "text/plain")
  }
}
