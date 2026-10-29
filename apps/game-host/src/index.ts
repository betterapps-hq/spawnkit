import { gameNotFound } from "./not-found"
import { secureGameResponse } from "./security"

const types: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  wasm: "application/wasm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  woff2: "font/woff2",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json"
}

// Compression can weaken an entity tag at the edge; GET/HEAD validators use weak comparison.
function matchesEtag(request: Request, etag: string | null) {
  return Boolean(
    etag &&
    request.headers
      .get("if-none-match")
      ?.split(",")
      .some((value) => {
        const tag = value.trim()
        return tag === "*" || tag.replace(/^W\//, "") === etag.replace(/^W\//, "")
      })
  )
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext) {
    return secureGameResponse(await gameHost.fetch(request, env, ctx))
  }
} satisfies ExportedHandler<Env>

const gameHost = {
  async fetch(request: Request, env, ctx?: ExecutionContext) {
    const hostname = new URL(request.url).hostname
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405 })
    if (hostname === "spawnkit.games") return Response.redirect("https://spawnkit.cloud/", 301)
    if (hostname === "spawnkit.cloud" || hostname.endsWith(".spawnkit.cloud")) return gameNotFound(request)
    const target = await env.DATABASE.prepare(
      `SELECT h.project_id,e.current_release_id,0 AS immutable FROM hosting_slots h JOIN environments e ON e.project_id=h.project_id AND e.name=h.environment WHERE h.hostname=?1 AND e.enabled=1 AND NOT EXISTS(SELECT 1 FROM game_moderation m WHERE m.project_id=h.project_id AND m.state='restricted')
       UNION ALL SELECT d.project_id,d.release_id AS current_release_id,1 AS immutable FROM deployment_hostnames d JOIN environments e ON e.project_id=d.project_id AND e.name=d.environment JOIN deployments a ON a.id=d.deployment_id JOIN releases r ON r.id=d.release_id AND r.project_id=d.project_id WHERE d.hostname=?1 AND e.enabled=1 AND a.status='succeeded' AND r.status='ready' AND NOT EXISTS(SELECT 1 FROM game_moderation m WHERE m.project_id=d.project_id AND m.state='restricted') LIMIT 1`
    )
      .bind(hostname)
      .first<{ project_id: string; current_release_id: string | null; immutable: number }>()
    if (!target?.current_release_id) return gameNotFound(request)
    let path: string
    try {
      path = decodeURIComponent(new URL(request.url).pathname).replace(/^\//, "") || "index.html"
    } catch {
      return new Response("Invalid path", { status: 400 })
    }
    if (
      path.split("/").some((part) => part === ".." || part === ".") ||
      path.includes("\\") ||
      Array.from(path).some((character) => character.charCodeAt(0) < 32)
    )
      return new Response("Invalid path", { status: 400 })
    if (path.endsWith("/")) path += "index.html"
    const key = `releases/${target.project_id}/${target.current_release_id}/${path}`
    // Resolve the live pointer and enabled state before reading cached bytes. A rollback
    // changes the key immediately, and a closed preview cannot be served from this cache.
    const cache = typeof caches === "undefined" ? undefined : caches.default
    const cacheUrl = new URL(request.url)
    cacheUrl.pathname = `/__spawn_artifacts/${key}`
    cacheUrl.search = ""
    const cacheKey = new Request(cacheUrl, { method: "GET" })
    const browserPolicy =
      target.immutable && !path.endsWith(".html")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0, must-revalidate"
    // Video players request byte ranges for startup and seeking. Never put a
    // partial response in the cache used for complete release artifacts.
    const rangeHeader = request.method === "GET" ? request.headers.get("range") : null
    if (rangeHeader) {
      const metadata = await env.ARTIFACTS.head(key)
      if (!metadata) return gameNotFound(request)
      const headers = new Headers({
        "content-type": types[path.split(".").at(-1)!] ?? "application/octet-stream",
        "accept-ranges": "bytes",
        "cache-control": `${browserPolicy}, no-transform`,
        "x-content-type-options": "nosniff",
        etag: metadata.httpEtag
      })
      if (matchesEtag(request, metadata.httpEtag)) return new Response(null, { status: 304, headers })
      if (!request.headers.has("if-range") || request.headers.get("if-range") === metadata.httpEtag) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
        const start = match?.[1] ? Number(match[1]) : Math.max(0, metadata.size - Number(match?.[2]))
        const end = match?.[1] && match[2] ? Math.min(Number(match[2]), metadata.size - 1) : metadata.size - 1
        if (
          !match ||
          (!match[1] && !match[2]) ||
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start < 0 ||
          start >= metadata.size ||
          end < start
        ) {
          headers.set("content-range", `bytes */${metadata.size}`)
          return new Response(null, { status: 416, headers })
        }
        const object = await env.ARTIFACTS.get(key, { range: { offset: start, length: end - start + 1 } })
        if (!object) return gameNotFound(request)
        headers.set("content-range", `bytes ${start}-${end}/${metadata.size}`)
        headers.set("content-length", String(end - start + 1))
        return new Response(object.body, { status: 206, headers })
      }
    }
    const cached = await cache?.match(cacheKey).catch(() => undefined)
    if (cached) {
      const headers = new Headers(cached.headers)
      headers.set("cache-control", browserPolicy)
      if (matchesEtag(request, headers.get("etag"))) return new Response(null, { status: 304, headers })
      return new Response(request.method === "HEAD" ? null : cached.body, { headers })
    }
    const object = await env.ARTIFACTS.get(key)
    if (!object) return gameNotFound(request)
    const headers = new Headers({
      "content-type": types[path.split(".").at(-1)!] ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "cache-control": browserPolicy,
      etag: object.httpEtag,
      "content-length": String(object.size)
    })
    if (matchesEtag(request, object.httpEtag)) return new Response(null, { status: 304, headers })
    const response = new Response(request.method === "HEAD" ? null : object.body, { headers })
    if (cache && ctx && request.method === "GET") {
      const copy = response.clone()
      copy.headers.set("cache-control", "public, max-age=86400")
      ctx.waitUntil(
        cache.put(cacheKey, copy).catch(() => {
          console.warn(JSON.stringify({ event: "artifact_cache_write_failed" }))
        })
      )
    }
    return response
  }
} satisfies ExportedHandler<Env>
