import { projectHostname } from "./hosting"
import { requireActiveProject, withProjectResource } from "./project-lifecycle"

const account = "544b5bfd594cd02a5da4b79a2038cc9f"
const zone = "b0f105530cc52d9f3a95ee4fd5592531"
type Domain = { hostname: string; service: string; zone_id: string }
type DnsRecord = { name: string; type: string; content: string; proxied: boolean }
type Certificate = { status: string; hosts: string[] }

/** Idempotent, bounded provider operations. Never move a hostname owned by another service. */
export async function provisionProjectDomain(env: Env, projectId: string, slug: string) {
  if (!env.HOSTING_API_TOKEN) return false
  return withProjectResource(env, projectId, () => provision(env, projectId, slug))
}
async function provision(env: Env, projectId: string, slug: string) {
  const internal = env.HOSTING_TEST === "true"
  const hostname = projectHostname(slug, "production", internal)
  const service = `spawnkit-games${internal ? "-staging" : ""}`
  async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    await requireActiveProject(env, projectId)
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      method,
      headers: { authorization: `Bearer ${env.HOSTING_API_TOKEN}`, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000)
    })
    const data = (await response.json()) as { success: boolean; result: T }
    if (!response.ok || !data.success) throw new Error(`Domain provider request failed (${response.status}).`)
    return data.result
  }
  const domains = await api<Domain[]>(`/accounts/${account}/workers/domains?zone_id=${zone}&per_page=100`)
  const existing = domains.find((domain) => domain.hostname === hostname)
  if (existing && (existing.service !== service || existing.zone_id !== zone))
    throw new Error("Project hostname is attached to another service.")
  if (!existing) {
    if (domains.length >= 90) throw new Error("Domain capacity requires a certificate provisioning upgrade.")
    await api(`/accounts/${account}/workers/domains`, "PUT", {
      hostname,
      service,
      zone_id: zone,
      enabled: true,
      previews_enabled: false
    })
  }
  for (const record of [
    { type: "A", name: `*.${hostname}`, content: "192.0.2.0", proxied: true, ttl: 1 },
    { type: "A", name: `local.${hostname}`, content: "127.0.0.1", proxied: false, ttl: 300 },
    { type: "A", name: `*.local.${hostname}`, content: "127.0.0.1", proxied: false, ttl: 300 }
  ]) {
    const records = await api<DnsRecord[]>(`/zones/${zone}/dns_records?name=${encodeURIComponent(record.name)}`)
    if (records.length) {
      if (
        !records.some(
          (item) => item.type === record.type && item.content === record.content && item.proxied === record.proxied
        )
      )
        throw new Error("Project DNS conflicts with an existing record.")
    } else await api(`/zones/${zone}/dns_records`, "POST", record)
  }
  const certificates = await api<Certificate[]>(`/zones/${zone}/ssl/certificate_packs?status=all&per_page=100`)
  if (
    !certificates.some((certificate) => certificate.status === "active" && certificate.hosts.includes(`*.${hostname}`))
  )
    return false
  // The provider's active wildcard certificate is authoritative. A same-zone Worker cannot
  // probe a route-only hostname with fetch; the reconciliation CLI also checks public TLS.
  await env.DATABASE.prepare(
    "UPDATE project_hostnames SET ready=1,domain='spawnkit.games' WHERE project_id=? AND slug=?"
  )
    .bind(projectId, slug)
    .run()
  return true
}
