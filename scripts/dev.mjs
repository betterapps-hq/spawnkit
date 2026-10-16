import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { parseEnv } from "node:util"
import { developmentEnvironment, root } from "./dev-environment.mjs"
import { githubConfiguration } from "./github-config.mjs"

// Spawn-specific credentials and local resources. Buildkit owns listeners and routes.
const service = process.argv[2]
const urls = developmentEnvironment()
const dashboard = join(root, "apps/dashboard")
const env = { ...process.env }

function run(file, args, cwd = root) {
  const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: "inherit", windowsHide: true })
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal))
  return new Promise((resolve, reject) => {
    child.on("error", reject)
    child.on("exit", (code) => resolve(code ?? 1))
  })
}

if (service === "register") {
  const path = join(root, "deploy/local-origins.json")
  const origins = JSON.parse(readFileSync(path, "utf8"))
  writeFileSync(path, JSON.stringify([...new Set([...origins, urls.app, urls.e2e])].sort(), null, 2) + "\n")
  console.log("Exact checkout origins registered. Deploy staging services to apply the auth allowlist.")
} else if (service === "database") {
  process.exitCode = await run(join(dashboard, "node_modules/cf/bin/cf"), [
    "d1",
    "migrations",
    "apply",
    "42c76813-8fd1-4831-9500-5155eb1dab20",
    "--local",
    "--persist-to",
    join(root, "apps/control-api/.cloudflare/state"),
    "--dir",
    join(root, "apps/control-api/migrations")
  ])
} else if (service === "api" || service === "telemetry") {
  if (!process.env.DEV_DOMAINS_ORIGIN) throw new Error("Start this service through pnpm dev:api or pnpm dev:telemetry")
  Object.assign(env, {
    SPAWN_SITE_URL: urls.app,
    SPAWN_DASHBOARD_ORIGINS: [urls.app, urls.e2e].join(","),
    SPAWN_LOCAL_WORKER: "true"
  })
  if (service === "api") {
    const github = githubConfiguration(root, "local")
    Object.assign(env, github.secrets, { SPAWN_ENABLE_GITHUB: String(github.enabled) })
    const credentialsFile = join(dashboard, ".env")
    const credentials = existsSync(credentialsFile) ? parseEnv(readFileSync(credentialsFile, "utf8")) : {}
    for (const key of ["CLERK_SECRET_KEY", "CLERK_OAUTH_CLIENT_ID"]) if (credentials[key]) env[key] = credentials[key]
    const webhookFile = join(root, "deploy/.env.hooks")
    if (!github.enabled && existsSync(webhookFile))
      env.GITHUB_WEBHOOK_SECRET = parseEnv(readFileSync(webhookFile, "utf8")).GITHUB_WEBHOOK_SECRET
  } else {
    env.SIGNING_KEY = createHash("sha256").update(`spawnkit-local:${root}`).digest("hex")
    env.SPAWN_TELEMETRY_PUBLIC_ENDPOINT = `${process.env.DEV_DOMAINS_ORIGIN}/v1/logs`
  }
  process.exitCode = await run(
    join(dashboard, "node_modules/vite/bin/vite.js"),
    process.argv.slice(3),
    join(root, "apps", service === "api" ? "control-api" : "telemetry")
  )
} else {
  throw new Error("Choose register, database, api, or telemetry")
}
