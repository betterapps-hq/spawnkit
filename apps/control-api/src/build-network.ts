/** Public package downloads only. Credentials and arbitrary request headers never leave the proxy. */
export async function dependencyRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (
    url.protocol !== "https:" ||
    url.hostname !== "registry.npmjs.org" ||
    url.port ||
    url.username ||
    url.password ||
    !["GET", "HEAD"].includes(request.method) ||
    url.search ||
    url.pathname.startsWith("/-/")
  )
    return new Response("Build network request denied", { status: 403 })
  const response = await fetch(url, {
    method: request.method,
    headers: { accept: "application/json, application/octet-stream" },
    redirect: "manual",
    signal: AbortSignal.timeout(30_000)
  })
  // Redirects must not turn the registry exception into unrestricted network access.
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel()
    return new Response("Package redirects are not permitted", { status: 403 })
  }
  return response
}
export function blockedBuildRequest() {
  return new Response("Network access is disabled for this job", { status: 403 })
}
