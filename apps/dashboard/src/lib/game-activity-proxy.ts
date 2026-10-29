/** Anonymous traffic uses a private binding, not the authenticated platform API. */
export async function proxyGameActivity(request: Request, send: (request: Request) => Promise<Response>) {
  const url = new URL(request.url)
  if (request.method !== "POST" || !/^\/api\/platform\/v1\/games\/[A-Za-z0-9_-]{1,128}\/activity$/.test(url.pathname))
    return new Response(null, { status: 404 })
  if (request.headers.get("origin") !== url.origin || request.headers.get("sec-fetch-site") === "cross-site")
    return new Response(null, { status: 403 })
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 })
  const headers = new Headers({ "content-type": "application/json" })
  headers.set("x-spawn-client-ip", request.headers.get("cf-connecting-ip") ?? "local")
  if (request.headers.has("content-length")) headers.set("content-length", request.headers.get("content-length")!)
  try {
    const result = await send(
      new Request(`https://activity.internal${url.pathname}`, {
        method: "POST",
        headers,
        body: request.body,
        duplex: "half",
        signal: AbortSignal.timeout(5000)
      } as RequestInit)
    )
    return new Response(result.body, {
      status: result.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        ...(result.status === 429 ? { "retry-after": "60" } : {})
      }
    })
  } catch {
    return Response.json({ error: { code: "unavailable" } }, { status: 503, headers: { "cache-control": "no-store" } })
  }
}
