import { writeFileSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
if (process.env.GITHUB_ACTIONS !== "true")
  throw new Error("Credential materialization is only supported on GitHub Actions runners")
const environment = process.env.SPAWN_RELEASE_ENVIRONMENT
if (!["production", "staging", "preview"].includes(environment)) throw new Error("Invalid release environment")
const target = environment === "production" ? "production" : "staging"
const dashboard = resolve(root, `apps/dashboard/${target === "production" ? ".env.production" : ".env"}`)
const github = resolve(root, `deploy/.env.github.${target}`)
const domains = resolve(root, "deploy/.env.domains")
if (process.argv[2] === "clean") {
  for (const path of [dashboard, github, domains]) rmSync(path, { force: true })
} else {
  if (!process.env.CLOUDFLARE_API_TOKEN)
    throw new Error(
      "Add the CLOUDFLARE_API_TOKEN GitHub Actions secret; interactive Cloudflare logins cannot run in CI"
    )
  if (!process.env.DASHBOARD_ENV) throw new Error("Missing dashboard environment credentials")
  writeFileSync(dashboard, process.env.DASHBOARD_ENV, { mode: 0o600 })
  if (process.env.GITHUB_APP_ENV) writeFileSync(github, process.env.GITHUB_APP_ENV, { mode: 0o600 })
  if (process.env.HOSTING_API_TOKEN)
    writeFileSync(domains, `HOSTING_API_TOKEN=${process.env.HOSTING_API_TOKEN}\n`, { mode: 0o600 })
}
