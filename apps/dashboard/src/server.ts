import { findStarterKit } from "@spawn/templates/kits"
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server"
import { createServerEntry } from "@tanstack/react-start/server-entry"
import { agentResource } from "./lib/agent-resources"
import { appSecurityHeaders } from "./lib/content-security"
import { prepareKitAttribution } from "./lib/kit-attribution"
import { kitDownload } from "./lib/kit-download"
import { getGameSitemap } from "./lib/publishing"
import { crawlResponse, indexingHeaders } from "./lib/seo-response"

const handler = createStartHandler(defaultStreamHandler)
export default createServerEntry({
  async fetch(request) {
    const resource = await agentResource(request)
    if (resource) return resource
    const url = new URL(request.url)
    const kit = /^\/downloads\/kits\/([a-z0-9-]+)\.zip$/.exec(url.pathname)?.[1]
    const attribution =
      request.method === "GET" && kit && findStarterKit(kit) && url.searchParams.get("attribution") === "1"
        ? await prepareKitAttribution(request, kit)
        : null
    const download = await kitDownload(request, attribution)
    if (download) return download
    const crawl = await crawlResponse(request, getGameSitemap)
    if (crawl) return crawl
    // Vite's development scripts require different permissions. Production and staging
    // use the same enforced policy; incoming headers can never supply the nonce.
    const nonce = crypto.randomUUID()
    const headers = new Headers(request.headers)
    headers.set("x-spawn-nonce", nonce)
    // Dev adapters may wrap Request in a proxy. Copy public fields instead of relying
    // on native Request private slots; keep streamed POST bodies intact.
    const response = await handler(
      new Request(request.url, {
        method: request.method,
        headers,
        body: request.body,
        signal: request.signal,
        ...(!["GET", "HEAD"].includes(request.method) ? { duplex: "half" as const } : {})
      }),
      { context: { nonce } }
    )
    const secured = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: indexingHeaders(request, response)
    })
    if (import.meta.env.DEV) return secured
    for (const [name, value] of Object.entries(
      appSecurityHeaders(
        nonce,
        process.env.VITE_CLERK_PUBLISHABLE_KEY,
        new URL(request.url).pathname === "/cli/authorize"
      )
    ))
      secured.headers.set(name, value)
    // A nonce is unique to this HTML response, including its streamed hydration scripts.
    if (secured.headers.get("content-type")?.includes("text/html"))
      secured.headers.set("cache-control", "private, no-store")
    return secured
  }
})
