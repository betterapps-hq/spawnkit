import { auth } from "@clerk/tanstack-react-start/server"
import { proxyGameActivity } from "./game-activity-proxy"

export async function proxyPlatform(request: Request) {
  if (/^\/api\/platform\/v1\/games\/[A-Za-z0-9_-]{1,128}\/activity$/.test(new URL(request.url).pathname)) {
    return proxyGameActivity(request, async (activityRequest) => {
      const { env } = await import("cloudflare:workers")
      return env.GAME_ACTIVITY.fetch(activityRequest)
    })
  }
  const origin = process.env.SPAWN_CONTROL_API_URL
  if (!origin)
    return Response.json(
      { error: { code: "unavailable", message: "Project service is not configured." } },
      { status: 503 }
    )
  const incoming = new URL(request.url)
  const bearer = request.headers.get("authorization")
  if (!["GET", "HEAD"].includes(request.method)) {
    const sourceOrigin = request.headers.get("origin")
    // The local TLS proxy forwards to an HTTP Vite port. Trust the configured
    // public origin, never client-supplied Forwarded/X-Forwarded-Host headers.
    const expectedOrigin = process.env.SPAWN_SITE_URL ? new URL(process.env.SPAWN_SITE_URL).origin : incoming.origin
    if ((sourceOrigin && sourceOrigin !== expectedOrigin) || (!bearer && !sourceOrigin))
      return Response.json(
        { error: { code: "forbidden", message: "Cross-origin requests are not permitted." } },
        { status: 403 }
      )
  }
  const publicFeedback =
    request.method === "GET" && /^\/api\/platform\/v1\/games\/[A-Za-z0-9_-]{1,128}\/feedback$/.test(incoming.pathname)
  const session = bearer ? null : await auth()
  const token = bearer ?? (session?.userId ? `Bearer ${await session.getToken()}` : null)
  if (!token && !publicFeedback)
    return Response.json({ error: { code: "unauthorized", message: "Sign in to continue." } }, { status: 401 })
  const target = new URL(origin)
  if (target.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(target.hostname))
    throw new Error("The project service must use HTTPS.")
  target.pathname = incoming.pathname
  target.search = incoming.search
  const headers = new Headers(token ? { authorization: token } : {})
  for (const name of ["content-type", "content-length", "idempotency-key", "x-content-sha256"])
    if (request.headers.has(name)) headers.set(name, request.headers.get(name)!)
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: request.signal
  }
  if (request.body) {
    init.body = request.body
    init.duplex = "half"
  }
  const result = await fetch(target, init)
  const responseHeaders = new Headers({
    "content-type": result.headers.get("content-type") ?? "application/json",
    "cache-control": "no-store"
  })
  if (result.headers.has("location")) responseHeaders.set("location", result.headers.get("location")!)
  if (result.headers.has("www-authenticate"))
    responseHeaders.set("www-authenticate", result.headers.get("www-authenticate")!)
  return new Response(result.body, {
    status: result.status,
    headers: responseHeaders
  })
}
