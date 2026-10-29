import { projectHostname } from "./hosting"

const account = "544b5bfd594cd02a5da4b79a2038cc9f"
const root = "spawnkit.games"
const zone = "b0f105530cc52d9f3a95ee4fd5592531"
type Domain = { id: string; hostname: string; service: string; zone_id: string }
type Dns = { id: string; name: string; type: string; content: string; proxied: boolean }
type Certificate = { id: string; type: string; hosts: string[] }

/** Exact project hostnames only. Shared Workers, zones and wildcard records are never removed. */
export async function removeProjectDomains(env: Env, projectId: string, checkpoint: () => Promise<void>) {
  const address = await env.DATABASE.prepare("SELECT slug FROM project_hostnames WHERE project_id=?")
    .bind(projectId)
    .first<{ slug: string }>()
  if (!address) return
  if (!env.HOSTING_API_TOKEN) throw new Error("Domain cleanup is not configured.")
  const base = projectHostname(address.slug, "production", env.HOSTING_TEST === "true")
  const bases = [base]
  const external = await env.DATABASE.prepare("SELECT hostname FROM domains WHERE project_id=? AND status='active'")
    .bind(projectId)
    .all<{ hostname: string }>()
  const service = `spawnkit-games${env.HOSTING_TEST === "true" ? "-staging" : ""}`
  async function api<T>(path: string, method = "GET"): Promise<T> {
    await checkpoint()
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      method,
      headers: { authorization: `Bearer ${env.HOSTING_API_TOKEN}` },
      signal: AbortSignal.timeout(15_000)
    })
    if (method === "DELETE" && response.status === 404) return undefined as T
    if (!response.ok) throw new Error(`Domain cleanup provider request failed (${response.status}).`)
    const text = await response.text()
    // Worker custom-domain deletion can succeed without a JSON response body.
    if (method === "DELETE" && !text.trim()) return undefined as T
    const body = JSON.parse(text) as { success: boolean; result: T }
    if (!body.success) throw new Error(`Domain cleanup provider request failed (${response.status}).`)
    return body.result
  }
  async function list<T>(path: string) {
    const result: T[] = []
    for (let page = 1; page <= 20; page++) {
      const rows = await api<T[]>(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`)
      result.push(...rows)
      if (rows.length < 100) return result
    }
    throw new Error("Domain inventory exceeds the cleanup limit.")
  }
  const domains = await list<Domain>(`/accounts/${account}/workers/domains`)
  for (const hostname of [...bases, ...external.results.map((row) => row.hostname)]) {
    const domain = domains.find((item) => item.hostname === hostname)
    if (!domain) continue
    if (domain.service !== service)
      throw new Error("Project domain belongs to another service. Cleanup requires review.")
    // Detaching a Worker custom domain removes its managed routing and DNS.
    await api(`/accounts/${account}/workers/domains/${domain.id}`, "DELETE")
  }
  for (const hostname of bases) {
    for (const name of [hostname, `*.${hostname}`, `local.${hostname}`, `*.local.${hostname}`]) {
      const records = await list<Dns>(`/zones/${zone}/dns_records?name=${encodeURIComponent(name)}`)
      for (const record of records) {
        if (record.name !== name) throw new Error("Unexpected project DNS inventory.")
        const local = name === `local.${hostname}` || name === `*.local.${hostname}`
        const owned =
          record.type === "A" &&
          (local
            ? record.content === "127.0.0.1" && !record.proxied
            : ["192.0.2.0", "192.0.2.1"].includes(record.content) && record.proxied)
        if (!owned) throw new Error("Project DNS has changed. Cleanup requires review.")
        await api(`/zones/${zone}/dns_records/${record.id}`, "DELETE")
      }
    }
    const certificates = await list<Certificate>(`/zones/${zone}/ssl/certificate_packs?status=all`)
    for (const certificate of certificates) {
      if (certificate.type !== "advanced" || !certificate.hosts.includes(`*.${hostname}`)) continue
      // Cloudflare includes the zone apex in each project pack. Never remove a
      // universal certificate or a pack covering another project's hostname.
      if (!certificate.hosts.every((host) => [root, hostname, `*.${hostname}`].includes(host)))
        throw new Error("Project certificate is shared. Cleanup requires review.")
      await api(`/zones/${zone}/ssl/certificate_packs/${certificate.id}`, "DELETE")
    }
  }
}
