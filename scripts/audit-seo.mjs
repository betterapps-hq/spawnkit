import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { performance } from "node:perf_hooks"

const origin = new URL(process.argv[2] || "https://spawnkit.cloud")
if (origin.username || origin.password || !["https:", "http:"].includes(origin.protocol))
  throw new Error("Use a public HTTP(S) origin without credentials.")
const paths = [
  "/",
  "/create",
  "/templates",
  "/cloud",
  "/about",
  "/help",
  "/browse",
  "/docs",
  "/contact",
  "/privacy",
  "/terms",
  "/community-guidelines",
  "/kits/pixi",
  "/kits/phaser",
  "/kits/babylon",
  "/kits/three",
  "/kits/phaser-arcade",
  "/kits/three-rapier",
  "/docs/getting-started",
  "/docs/extend",
  "/docs/publishing",
  "/docs/authentication",
  "/docs/api",
  "/docs/create-with-cli",
  "/docs/cli",
  "/docs/upload-existing-game",
  "/docs/dashboard",
  "/docs/codex",
  "/docs/claude-code",
  "/docs/cursor",
  "/docs/project-structure",
  "/docs/publishing-examples",
  "/docs/testing",
  "/docs/updating",
  "/favicon.ico",
  "/llms.txt",
  "/auth.md",
  "/catalog/v1.json",
  "/openapi.json",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemaps/pages.xml",
  "/pricing",
  "/?genre=Arcade",
  "/sign-in",
  "/seo-audit-missing-page"
]
const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), match[2]])
  )
const pages = []
for (const path of paths) {
  const started = performance.now()
  try {
    const response = await fetch(new URL(path, origin.origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000)
    })
    const content = await response.text()
    const tags = [...content.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map((match) => attributes(match[0]))
    pages.push({
      path,
      status: response.status,
      milliseconds: Math.round(performance.now() - started),
      contentType: response.headers.get("content-type"),
      robotsHeader: response.headers.get("x-robots-tag"),
      challenge: response.headers.get("cf-mitigated"),
      location: response.headers.get("location"),
      title: content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null,
      canonicals: tags.filter((tag) => tag.rel === "canonical").map((tag) => tag.href),
      description: tags.find((tag) => tag.name === "description")?.content ?? null,
      robotsMeta: tags.filter((tag) => tag.name === "robots").map((tag) => tag.content),
      socialImage: tags.find((tag) => tag.property === "og:image")?.content ?? null,
      structuredDataBlocks: (content.match(/type=["']application\/ld\+json["']/g) ?? []).length,
      ...(path.endsWith(".xml")
        ? { locations: [...content.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]) }
        : {}),
      ...(path === "/robots.txt" ? { robotsText: content } : {})
    })
  } catch (error) {
    pages.push({ path, error: error instanceof Error ? error.message : String(error) })
  }
}
const capturedAt = new Date().toISOString()
const report = {
  capturedAt,
  origin: origin.origin,
  method: "Ordinary anonymous HTTP requests; no Search Console, verified crawler identity or ranking data.",
  pages
}
await mkdir("work", { recursive: true })
const output = resolve("work", `seo-audit-${origin.hostname}-${capturedAt.replaceAll(/[:.]/g, "-")}.json`)
await writeFile(output, JSON.stringify(report, null, 2) + "\n")
console.log(output)
console.table(
  pages.map(({ path, status, error, canonicals }) => ({
    path,
    status: status ?? error,
    canonicals: canonicals?.length ?? 0
  }))
)
