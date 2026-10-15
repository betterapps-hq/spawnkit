import { HttpError, jsonBody, requireValue } from "./http"

export function normalizeHostname(value: unknown) {
  requireValue(typeof value === "string", "Enter a domain name.")
  const hostname = value.trim().toLowerCase().replace(/\.$/, "")
  requireValue(
    hostname.length <= 253 && hostname.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname),
    "Enter a public domain name."
  )
  requireValue(
    hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)),
    "Enter a domain without a protocol or path."
  )
  requireValue(!/(?:^|\.)(localhost|local|internal|workers\.dev)$/.test(hostname), "Use a domain you own.")
  return hostname
}

export async function domainRoute(request: Request, env: Env, projectId: string, resourceId?: string) {
  if (request.method === "GET") {
    const rows = await env.DATABASE.prepare(
      "SELECT hostname,environment,status,verification_token AS verificationToken FROM domains WHERE project_id=? ORDER BY created_at"
    )
      .bind(projectId)
      .all()
    return Response.json({ domains: rows.results })
  }
  if (!resourceId && request.method === "POST") {
    const body = await jsonBody(request)
    const hostname = normalizeHostname(body.hostname)
    requireValue(body.environment === "production" || body.environment === "sandbox", "Choose an environment.")
    const target = await env.DATABASE.prepare("SELECT enabled FROM environments WHERE project_id=? AND name=?")
      .bind(projectId, body.environment)
      .first<{ enabled: number }>()
    requireValue(target?.enabled, "Enable this environment first.")
    const token = `spawn-verification=${crypto.randomUUID()}`
    try {
      await env.DATABASE.prepare(
        "INSERT INTO domains(hostname,project_id,environment,verification_token,status,created_at) VALUES(?,?,?,?,'pending-dns',?)"
      )
        .bind(hostname, projectId, body.environment, token, new Date().toISOString())
        .run()
    } catch {
      throw new HttpError(409, "domain_conflict", "This domain is already configured.")
    }
    return Response.json(
      { hostname, environment: body.environment, status: "pending-dns", verificationToken: token },
      { status: 201 }
    )
  }
  const hostname = normalizeHostname(resourceId)
  const domain = await env.DATABASE.prepare("SELECT * FROM domains WHERE hostname=? AND project_id=?")
    .bind(hostname, projectId)
    .first<{ verification_token: string; status: string }>()
  if (!domain) throw new HttpError(404, "not_found", "Domain not found.")
  if (request.method === "DELETE") {
    if (domain.status === "active")
      throw new HttpError(409, "active_domain", "Disconnect routing before removing this domain.")
    await env.DATABASE.prepare("DELETE FROM domains WHERE hostname=? AND project_id=?").bind(hostname, projectId).run()
    return Response.json({ removed: true })
  }
  if (request.method === "POST" && new URL(request.url).pathname.endsWith("/verify")) {
    const lookup = new URL("https://cloudflare-dns.com/dns-query")
    lookup.searchParams.set("name", `_spawn.${hostname}`)
    lookup.searchParams.set("type", "TXT")
    const response = await fetch(lookup, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) throw new HttpError(502, "dns_unavailable", "DNS verification is unavailable. Try again.")
    const data = await response.json<{ Answer?: { type: number; data: string }[] }>()
    const verified =
      data.Answer?.some(
        (answer) => answer.type === 16 && answer.data.replace(/^"|"$/g, "") === domain.verification_token
      ) ?? false
    if (verified)
      await env.DATABASE.prepare("UPDATE domains SET status='verified' WHERE hostname=? AND project_id=?")
        .bind(hostname, projectId)
        .run()
    return Response.json({ hostname, status: verified ? "verified" : "pending-dns", routingReady: false })
  }
  throw new HttpError(404, "not_found", "Not found.")
}
