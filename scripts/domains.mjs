import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { projectHostname, reserveDeploymentHostname, reserveProjectSlug } from "../apps/control-api/src/hosting.ts"
import { root } from "./dev-environment.mjs"

const { values } = parseArgs({
  options: { environment: { type: "string", default: "staging" }, apply: { type: "boolean", default: false } }
})
if (!["staging", "production"].includes(values.environment)) throw new Error("Choose staging or production")
const production = values.environment === "production"
const database = production ? "6d546779-70b6-42af-9a61-c646ab642012" : "42c76813-8fd1-4831-9500-5155eb1dab20"
const zone = "2a8126a122d81d58aafe2535a2219e7c"
const cf = join(root, "apps/dashboard/node_modules/cf/bin/cf")
const directory = join(root, "work", `domains-${values.environment}-${Date.now()}`)
mkdirSync(directory, { recursive: true })
function command(args, cwd = root, json = true) {
  const result = spawnSync(process.execPath, [cf, ...args], {
    cwd,
    env: {
      ...process.env,
      SPAWN_CONTROL_ENVIRONMENT: values.environment,
      SPAWN_DYNAMIC_HOSTING: "true",
      SPAWN_CONFIGURE_CUSTOM_DOMAINS: "true"
    },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  })
  if (result.status !== 0 || /APIError/.test(result.stderr))
    throw new Error(result.stderr || result.stdout || "Cloudflare command failed")
  if (!json) {
    console.log(result.stdout)
    return
  }
  return JSON.parse(result.stdout)
}
let sequence = 0
function query(sql, params = []) {
  const file = join(directory, `${sequence++}.json`)
  writeFileSync(file, JSON.stringify([{ sql, params }]))
  const result = command(["d1", "query", database, "--batch", `@${file}`])
  if (result.some((item) => !item.success)) throw new Error("Database query failed")
  return result[0].results
}
const adapter = {
  prepare: (sql) => {
    let params = []
    const statement = {
      bind(...values) {
        params = values
        return statement
      },
      async first() {
        return query(sql, params)[0] ?? null
      },
      async run() {
        query(sql, params)
      }
    }
    return statement
  }
}
const projects = query("SELECT id,name FROM projects ORDER BY created_at,id")
const slots = query("SELECT * FROM hosting_slots WHERE project_id IS NOT NULL")
const releases = query("SELECT id,url FROM releases")
const deployments = query(
  "SELECT id,project_id,release_id,environment FROM deployments WHERE status='succeeded' ORDER BY created_at,id"
)
const hasSchema = query("SELECT name FROM sqlite_master WHERE type='table' AND name='project_hostnames'").length > 0
const names = hasSchema ? query("SELECT * FROM project_hostnames") : []
writeFileSync(
  join(directory, "before.json"),
  JSON.stringify({ projects, slots, releases, deployments, names }, null, 2)
)
console.log(
  `${values.environment}: ${projects.length} projects, ${slots.length} environment aliases, ${deployments.length} retained deployments. Backup: ${directory}`
)
if (!values.apply) {
  console.log(
    "Plan only. --apply reserves names, configures DNS/certificates, verifies HTTPS, then migrates aliases. Old addresses are retained."
  )
  process.exit(0)
}
if (!hasSchema) query(readFileSync(join(root, "apps/control-api/migrations/0006_hostnames.sql"), "utf8"))
if (!query("PRAGMA table_info(hosting_aliases)").some((column) => column.name === "telemetry_synced"))
  query(readFileSync(join(root, "apps/control-api/migrations/0007_alias_telemetry.sql"), "utf8"))
if (!query("PRAGMA table_info(project_hostnames)").some((column) => column.name === "attempted_at"))
  query(readFileSync(join(root, "apps/control-api/migrations/0008_domain_attempts.sql"), "utf8"))
const mapping = new Map()
for (const project of projects) mapping.set(project.id, await reserveProjectSlug(adapter, project.id, project.name))
const bases = [...mapping.values()].map((slug) => projectHostname(slug, "production", !production))
const registryPath = join(root, "deploy/customer-domains.json")
const registry = JSON.parse(readFileSync(registryPath, "utf8"))
// Never drop previously provisioned domains during reconciliation.
registry[values.environment] = [...new Set([...registry[values.environment], ...bases])].sort()
if (registry.production.length + registry.staging.length > 80)
  throw new Error(
    "Customer custom-domain capacity is approaching the zone limit. Configure scalable certificate provisioning before adding more projects."
  )
writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n")
const platformWildcard = {
  type: "A",
  name: `*.${production ? "" : "staging."}spawnkit.cloud`,
  content: "192.0.2.0",
  proxied: true,
  ttl: 1
}
const existingWildcard = command(["dns", "records", "list", "-z", zone, "--name", platformWildcard.name])
if (
  existingWildcard.length &&
  !existingWildcard.some((item) => item.type === "A" && item.content === platformWildcard.content && item.proxied)
)
  throw new Error(`Conflicting DNS configuration for ${platformWildcard.name}`)
if (!existingWildcard.length)
  command(["dns", "records", "create", "-z", zone, "--body", JSON.stringify(platformWildcard)])
for (const base of bases) {
  for (const record of [
    { type: "A", name: `*.${base}`, content: "192.0.2.0", proxied: true, ttl: 1 },
    { type: "A", name: `local.${base}`, content: "127.0.0.1", proxied: false, ttl: 300 },
    { type: "A", name: `*.local.${base}`, content: "127.0.0.1", proxied: false, ttl: 300 }
  ]) {
    const existing = command(["dns", "records", "list", "-z", zone, "--name", record.name])
    if (existing.length) {
      if (
        !existing.some(
          (item) => item.type === record.type && item.content === record.content && item.proxied === record.proxied
        )
      )
        throw new Error(`Conflicting DNS configuration for ${record.name}`)
    } else {
      command(["dns", "records", "create", "-z", zone, "--body", JSON.stringify(record), "--dry-run"])
      command(["dns", "records", "create", "-z", zone, "--body", JSON.stringify(record)])
    }
  }
}
command(["deploy", "--dry-run"], join(root, "apps/game-host"), false)
command(["deploy", "--prebuilt"], join(root, "apps/game-host"), false)
const certificates = command(["ssl", "certificate-packs", "list", "-z", zone, "--status", "all", "--per-page", "100"])
for (const [id, slug] of mapping) {
  const base = projectHostname(slug, "production", !production)
  if (!certificates.some((pack) => pack.status === "active" && pack.hosts.includes(`*.${base}`))) {
    console.log(`Pending wildcard HTTPS: ${base}. Existing aliases remain active. Rerun this command after issuance.`)
    process.exitCode = 1
    continue
  }
  // Fetch validates the public certificate; an unknown subdomain should reach the router and return 404.
  const probe = await fetch(`https://https-check.${base}/`, { signal: AbortSignal.timeout(15000) })
  if (probe.status !== 404) throw new Error(`Unexpected domain probe status ${probe.status}: ${base}`)
  const changes = []
  for (const slot of slots.filter((row) => row.project_id === id)) {
    const hostname = projectHostname(slug, slot.environment, !production)
    changes.push({
      sql: "INSERT INTO hosting_aliases(hostname,slot) VALUES(?,?) ON CONFLICT DO NOTHING",
      params: [slot.hostname, slot.slot]
    })
    changes.push({
      sql: "UPDATE hosting_slots SET hostname=? WHERE slot=? AND project_id=?",
      params: [hostname, slot.slot, id]
    })
  }
  for (const deployment of deployments.filter((row) => row.project_id === id)) {
    const hostname = await reserveDeploymentHostname(adapter, deployment, base)
    changes.push({
      sql: "UPDATE releases SET url=? WHERE id=? AND (url IS NULL OR url NOT LIKE 'https://d-%.spawnkit.cloud')",
      params: [`https://${hostname}`, deployment.release_id]
    })
  }
  changes.push({ sql: "UPDATE project_hostnames SET ready=1 WHERE project_id=? AND slug=?", params: [id, slug] })
  const file = join(directory, `${sequence++}-cutover.json`)
  writeFileSync(file, JSON.stringify(changes))
  const result = command(["d1", "query", database, "--batch", `@${file}`])
  if (result.some((item) => !item.success)) throw new Error("Alias cutover failed")
  console.log(`Ready: ${base}; compatibility aliases retained.`)
}
