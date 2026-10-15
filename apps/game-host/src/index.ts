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
  woff2: "font/woff2",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json"
}

export default {
  async fetch(request: Request, env, ctx?: ExecutionContext) {
    const hostname = new URL(request.url).hostname
    // A route executes before Workers custom domains. Forward only registered platform hosts.
    if (!env.SLOT && (env.PLATFORM_HOSTS ?? "").split(",").includes(hostname)) return fetch(request)
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405 })
    const target = await env.DATABASE.prepare(
      env.SLOT
        ? "SELECT h.project_id,e.current_release_id,0 AS immutable FROM hosting_slots h JOIN environments e ON e.project_id=h.project_id AND e.name=h.environment WHERE h.slot=? AND e.enabled=1"
        : `SELECT h.project_id,e.current_release_id,0 AS immutable FROM hosting_slots h JOIN environments e ON e.project_id=h.project_id AND e.name=h.environment WHERE (h.hostname=?1 OR h.slot=(SELECT slot FROM hosting_aliases WHERE hostname=?1)) AND e.enabled=1
           UNION ALL SELECT d.project_id,d.release_id AS current_release_id,1 AS immutable FROM deployment_hostnames d JOIN environments e ON e.project_id=d.project_id AND e.name=d.environment JOIN deployments a ON a.id=d.deployment_id JOIN releases r ON r.id=d.release_id AND r.project_id=d.project_id WHERE d.hostname=?1 AND e.enabled=1 AND a.status='succeeded' AND r.status='ready' LIMIT 1`
    )
      .bind(env.SLOT || hostname)
      .first<{ project_id: string; current_release_id: string | null; immutable?: number }>()
    if (!target?.current_release_id)
      return new Response("No release is live at this address.", {
        status: 404,
        headers: { "cache-control": "no-store" }
      })
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
        ? "public, max-age=31536000, immutable, no-transform"
        : "public, max-age=0, must-revalidate, no-transform"
    const cached = await cache?.match(cacheKey).catch(() => undefined)
    if (cached) {
      const headers = new Headers(cached.headers)
      headers.set("cache-control", browserPolicy)
      if (request.headers.get("if-none-match") === headers.get("etag"))
        return new Response(null, { status: 304, headers })
      return new Response(request.method === "HEAD" ? null : cached.body, { headers })
    }
    const object = await env.ARTIFACTS.get(key)
    if (!object) return new Response("Not found", { status: 404 })
    const headers = new Headers({
      "content-type": types[path.split(".").at(-1)!] ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "cache-control": browserPolicy,
      etag: object.httpEtag,
      "content-length": String(object.size)
    })
    if (request.headers.get("if-none-match") === object.httpEtag) return new Response(null, { status: 304, headers })
    const response = new Response(request.method === "HEAD" ? null : object.body, { headers })
    if (cache && ctx && request.method === "GET") {
      const copy = response.clone()
      copy.headers.set("cache-control", "public, max-age=86400, no-transform")
      ctx.waitUntil(
        cache.put(cacheKey, copy).catch(() => {
          console.warn(JSON.stringify({ event: "artifact_cache_write_failed" }))
        })
      )
    }
    return response
  }
} satisfies ExportedHandler<Env>
