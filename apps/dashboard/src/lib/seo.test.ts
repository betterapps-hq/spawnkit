import { describe, expect, it, vi } from "vitest"
import { gamePageHead, indexablePath, publicPageHead, serializeStructuredData } from "./seo"
import { crawlResponse, indexingHeaders, type SitemapGames } from "./seo-response"

const request = (path: string, origin = "https://spawnkit.cloud", method = "GET") =>
  new Request(origin + path, { method })
const inventory = vi.fn<(page: number) => Promise<SitemapGames>>(async () => ({
  games: [{ projectId: "game_1" }],
  total: 1
}))

it("uses canonical production paths without configuration and tracking parameters", () => {
  expect(publicPageHead("/templates").links).toEqual([{ rel: "canonical", href: "https://spawnkit.cloud/templates" }])
  expect(indexablePath("/templates", "?engine=pixi&utm_source=test")).toBe(true)
  expect(indexablePath("/", "?utm_source=test")).toBe(true)
  expect(indexablePath("/contact")).toBe(true)
  for (const key of ["q", "sort", "rating", "genre", "dimension", "availability", "reviews", "page", "project", "view"])
    expect(indexablePath("/", `?${key}=`)).toBe(false)
  for (const path of [
    "/dashboard",
    "/dashboard/projects/p",
    "/cli/authorize",
    "/sign-in",
    "/team/invitation",
    "/api/test",
    "/missing"
  ])
    expect(indexablePath(path)).toBe(false)
})

it("keeps creator text out of executable HTML and uses approved game metadata", () => {
  const title = '</script><script>alert("x")</script>'
  const head = gamePageHead({
    projectId: "p",
    title,
    description: "Collect apples.",
    url: "https://p.spawnkit.games",
    coverUrl: "https://p.spawnkit.games/cover.webp",
    discoverable: false
  })
  expect(head.links[0]?.href).toBe("https://spawnkit.cloud/play/p")
  expect(head.meta).toContainEqual({ property: "og:image", content: "https://p.spawnkit.games/cover.webp" })
  expect(head.meta).toContainEqual({ name: "robots", content: "noindex, follow" })
  const content = head.scripts[0]!.children
  expect(content).not.toContain("<script")
  expect(
    JSON.parse(content)["@graph"].find((entity: { "@type": string }) => entity["@type"] === "VideoGame").name
  ).toBe(title)
  expect(serializeStructuredData({ title })).not.toContain("</script>")
})

it("preserves restrictive headers and excludes nonproduction hosts and errors", () => {
  expect(indexingHeaders(request("/create"), new Response()).get("x-robots-tag")).toBeNull()
  expect(
    indexingHeaders(request("/create", "https://staging.spawnkit.cloud"), new Response()).get("x-robots-tag")
  ).toContain("noindex")
  expect(
    indexingHeaders(request("/play/p"), new Response(null, { headers: { "X-Robots-Tag": "noindex" } })).get(
      "x-robots-tag"
    )
  ).toBe("noindex")
  expect(indexingHeaders(request("/"), new Response(null, { status: 503 })).get("retry-after")).toBe("60")
  expect(indexingHeaders(request("/play/p"), new Response(null, { status: 404 })).get("x-robots-tag")).toContain(
    "noindex"
  )
})

describe("crawl documents", () => {
  it("allows production crawling while keeping noindex pages readable", async () => {
    const response = await crawlResponse(request("/robots.txt"), inventory)
    expect(response?.status).toBe(200)
    const text = await response!.text()
    expect(text).toContain("Sitemap: https://spawnkit.cloud/sitemap.xml")
    expect(text).not.toContain("Disallow: /dashboard")
    expect(text).not.toContain("Disallow: /*?")
  })
  it("never reads production inventory on alternate hosts", async () => {
    const fetch = vi.fn<(page: number) => Promise<SitemapGames>>()
    expect(await (await crawlResponse(request("/robots.txt", "https://preview-1.spawnkit.cloud"), fetch))!.text()).toBe(
      "User-agent: *\nDisallow: /\n"
    )
    expect((await crawlResponse(request("/sitemap.xml", "http://127.0.0.1"), fetch))?.status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("generates shards beyond the discovery limit and handles HEAD", async () => {
    const fetch = vi.fn<(page: number) => Promise<SitemapGames>>(async () => ({
      games: [{ projectId: "p-1001" }],
      total: 1001
    }))
    const index = await (await crawlResponse(request("/sitemap.xml"), fetch))!.text()
    expect(index).toContain("/sitemaps/pages.xml")
    expect(index).toContain("/sitemaps/games-2.xml")
    expect(index).not.toContain("games-3")
    const shard = await (await crawlResponse(request("/sitemaps/games-2.xml"), fetch))!.text()
    expect(fetch).toHaveBeenLastCalledWith(2)
    expect(shard).toContain("https://spawnkit.cloud/play/p-1001")
    const head = await crawlResponse(request("/sitemap.xml", undefined, "HEAD"), fetch)
    expect(head?.status).toBe(200)
    expect(await head!.text()).toBe("")
    expect((await crawlResponse(request("/sitemaps/games-3.xml"), fetch))?.status).toBe(404)
  })
  it("lists only canonical static pages and does not fabricate modification dates", async () => {
    const result = await (await crawlResponse(request("/sitemaps/pages.xml"), inventory))!.text()
    expect(result).toContain("https://spawnkit.cloud/templates</loc>")
    expect(result).not.toMatch(
      /<loc>https:\/\/spawnkit\.cloud\/(?:dashboard|sign-in)(?:[/?<])|pricing<|lastmod|engine=/
    )
  })
  it("fails temporarily instead of publishing incomplete or invalid inventory", async () => {
    for (const fetch of [
      async () => {
        throw new Error("offline")
      },
      async () => ({ total: 1, games: [{ projectId: "../private" }] })
    ]) {
      const response = await crawlResponse(request("/sitemap.xml"), fetch)
      expect(response?.status).toBe(503)
      expect(response?.headers.get("retry-after")).toBe("60")
    }
    expect((await crawlResponse(request("/sitemap.xml", undefined, "POST"), inventory))?.status).toBe(405)
    expect(await crawlResponse(request("/create"), inventory)).toBeNull()
  })
})
