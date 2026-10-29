const reserved = new Set([
  "www",
  "api",
  "staging",
  "local",
  "stories",
  "telemetry",
  "hooks",
  "e2e",
  "clerk",
  "accounts",
  "auth",
  "admin",
  "status",
  "docs",
  "support",
  "mail",
  "clkmail",
  "cdn",
  "assets",
  "preview",
  "production"
])

export function projectSlug(name: string) {
  let slug =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)
      .replace(/^-+|-+$/g, "") || "project"
  if (reserved.has(slug) || /^(preview-|stories-preview-|pr-|d-|game-|api-|telemetry-)/.test(slug))
    slug = `game-${slug}`
  return slug
}

/** A unique, persistent public name; display-name edits never move a project's origin. */
export async function reserveProjectSlug(database: D1Database, projectId: string, name: string) {
  const read = () =>
    database.prepare("SELECT slug FROM project_hostnames WHERE project_id=?").bind(projectId).first<{ slug: string }>()
  const existing = await read()
  if (existing) return existing.slug
  const base = projectSlug(name)
  for (let attempt = 0; attempt < 12; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6)}`
    await database
      .prepare("INSERT INTO project_hostnames(project_id,slug) VALUES(?,?) ON CONFLICT DO NOTHING")
      .bind(projectId, slug)
      .run()
    const saved = await read()
    if (saved) return saved.slug
  }
  throw new Error("Unable to reserve a project address. Retry this operation.")
}

export function projectHostname(slug: string, environment: string, internal: boolean) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) throw new Error("Invalid project slug")
  const base = `${slug}.${internal ? "staging." : ""}spawnkit.games`
  if (environment === "production") return base
  if (environment === "sandbox") return `staging.${base}`
  const preview = /^preview-([1-9]\d{0,9})$/.exec(environment)
  if (preview) return `pr-${preview[1]}.${base}`
  throw new Error("Unsupported hosting environment")
}

export async function reserveDeploymentHostname(
  database: D1Database,
  deployment: { id: string; project_id: string; environment: string; release_id: string },
  base: string
) {
  const read = () =>
    database
      .prepare("SELECT hostname FROM deployment_hostnames WHERE deployment_id=?")
      .bind(deployment.id)
      .first<{ hostname: string }>()
  const existing = await read()
  if (existing) return existing.hostname
  for (let attempt = 0; attempt < 12; attempt++) {
    const short = crypto.randomUUID().replaceAll("-", "").slice(0, 8)
    await database
      .prepare(
        "INSERT INTO deployment_hostnames(deployment_id,hostname,project_id,environment,release_id) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING"
      )
      .bind(deployment.id, `d-${short}.${base}`, deployment.project_id, deployment.environment, deployment.release_id)
      .run()
    const saved = await read()
    if (saved) return saved.hostname
  }
  throw new Error("Unable to reserve a deployment address. Retry this operation.")
}
