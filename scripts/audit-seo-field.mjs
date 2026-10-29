import { spawnSync } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const since = process.argv[2] ?? new Date(Date.now() - 86400000).toISOString()
if (!Number.isFinite(Date.parse(since))) throw new Error("Supply an ISO start date.")
const until = new Date().toISOString()
const cli = fileURLToPath(new URL("../apps/dashboard/node_modules/cf/bin/cf", import.meta.url))
function query(sql) {
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "sql",
      "query",
      sql,
      "--scope-account",
      "544b5bfd594cd02a5da4b79a2038cc9f",
      "--time-since",
      since,
      "--time-until",
      until
    ],
    { encoding: "utf8", windowsHide: true }
  )
  if (result.status !== 0) throw new Error(result.stderr || "Cloudflare analytics query failed")
  return JSON.parse(result.stdout)
}
const publicPaths =
  "(requestPath IN ('/', '/create', '/templates', '/cloud', '/browse', '/docs', '/about', '/help', '/contact', '/privacy', '/terms', '/community-guidelines') OR startsWith(requestPath, '/kits/') = 1 OR startsWith(requestPath, '/docs/') = 1 OR startsWith(requestPath, '/play/') = 1 OR startsWith(requestPath, '/categories/') = 1)"
const metrics = {}
for (const [name, column, divisor] of [
  ["lcp", "largestContentfulPaintUs", 1000],
  ["inp", "interactionToNextPaintUs", 1000],
  ["cls", "cumulativeLayoutShift", 1]
]) {
  metrics[name] = query(
    `SELECT requestPath, deviceType, COUNT(*) AS representedEvents, quantileWeighted(0.75, ${column}, sampleInterval) / ${divisor} AS p75 FROM events.rumWebvitalsEvents WHERE requestHost='spawnkit.cloud' AND bot=0 AND ${column}${name === "cls" ? ">=0" : ">0"} AND ${publicPaths} GROUP BY requestPath, deviceType`
  )
}
const crawlers = query(
  "SELECT verifiedBotCategory, edgeResponseStatus, COUNT(*) AS representedRequests FROM events.httpRequests WHERE clientRequestHttpHost='spawnkit.cloud' AND verifiedBotCategory IN ('Search Engine Crawler','AI Crawler','AI Search') GROUP BY verifiedBotCategory, edgeResponseStatus"
)
const crawlerErrors = query(
  "SELECT clientRequestPath, verifiedBotCategory, edgeResponseStatus, COUNT(*) AS representedRequests FROM events.httpRequests WHERE clientRequestHttpHost='spawnkit.cloud' AND verifiedBotCategory IN ('Search Engine Crawler','AI Crawler','AI Search') AND edgeResponseStatus>=400 GROUP BY clientRequestPath, verifiedBotCategory, edgeResponseStatus"
)
const report = {
  since,
  until,
  limitations:
    "Adaptive-sampling-weighted events, not unique people. Small cohorts and team/synthetic traffic may bias this early window. EU exclusion remains enabled. Not a 28-day CWV pass. HTTP statuses do not identify challenge causes.",
  metrics,
  crawlers,
  crawlerErrors
}
await mkdir("work", { recursive: true })
const path = `work/seo-field-${Date.now()}.json`
await writeFile(path, JSON.stringify(report, null, 2) + "\n")
console.log(path)
console.log(JSON.stringify(report))
