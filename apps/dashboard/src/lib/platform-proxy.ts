import { auth } from "@clerk/tanstack-react-start/server"

export async function proxyPlatform(request: Request) {
  const origin = process.env.SPAWN_CONTROL_API_URL
  if (!origin)
    return Response.json(
      { error: { code: "unavailable", message: "Project service is not configured." } },
      { status: 503 }
    )
  const incoming = new URL(request.url)
  if (!["GET", "HEAD"].includes(request.method)) {
    const sourceOrigin = request.headers.get("origin")
    if (sourceOrigin && sourceOrigin !== incoming.origin)
      return Response.json(
        { error: { code: "forbidden", message: "Cross-origin requests are not permitted." } },
        { status: 403 }
      )
  }
  const bearer = request.headers.get("authorization")
  const session = bearer ? null : await auth()
  const token = bearer ?? (session?.userId ? `Bearer ${await session.getToken()}` : null)
  if (!token)
    return Response.json({ error: { code: "unauthorized", message: "Sign in to continue." } }, { status: 401 })
  const target = new URL(origin)
  if (target.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(target.hostname))
    throw new Error("The project service must use HTTPS.")
  target.pathname = incoming.pathname
  target.search = incoming.search
  const headers = new Headers({ authorization: token })
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
  return new Response(result.body, {
    status: result.status,
    headers: responseHeaders
  })
}
