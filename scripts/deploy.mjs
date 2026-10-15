import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs, parseEnv } from "node:util"
import { githubConfiguration } from "./github-config.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const { values } = parseArgs({
  options: {
    environment: { type: "string", default: "staging" },
    component: { type: "string", default: "all" },
    preview: { type: "string", default: "latest" },
    "dry-run": { type: "boolean", default: false }
  }
})
if (!["production", "staging", "preview"].includes(values.environment))
  throw new Error("Choose production, staging, or preview")
if (!["all", "dashboard", "frontend", "control-api", "services", "stories"].includes(values.component))
  throw new Error("Choose all, dashboard, frontend, control-api, services, or stories")
if (values.environment === "preview" && ["all", "services", "control-api"].includes(values.component))
  throw new Error("Preview releases deploy frontend or stories; shared services must use trusted staging code")
if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(values.preview)) throw new Error("Invalid preview name")
const production = values.environment === "production"
const deployControl =
  ["all", "services", "control-api"].includes(values.component) ||
  (values.component === "dashboard" && values.environment === "preview")
const github = deployControl
  ? githubConfiguration(root, production ? "production" : "staging")
  : { enabled: false, secrets: {} }
const envFile = resolve(root, "apps/dashboard", production ? ".env.production" : ".env")
const credentials = parseEnv(readFileSync(envFile, "utf8"))
const domainCredentials = resolve(root, "deploy/.env.domains")
const hostingToken = existsSync(domainCredentials)
  ? parseEnv(readFileSync(domainCredentials, "utf8")).HOSTING_API_TOKEN
  : undefined
if (
  !credentials.CLERK_SECRET_KEY?.startsWith(production ? "sk_live_" : "sk_test_") ||
  !credentials.VITE_CLERK_PUBLISHABLE_KEY?.startsWith(production ? "pk_live_" : "pk_test_")
)
  throw new Error("Matching Clerk keys are required for this environment")
if (!credentials.CLERK_OAUTH_CLIENT_ID || !credentials.CLERK_OAUTH_ISSUER)
  throw new Error("CLI OAuth configuration is required")
const registryPath = resolve(root, "deploy/previews.json")
const previews = JSON.parse(readFileSync(registryPath, "utf8"))
const localOrigins = JSON.parse(readFileSync(resolve(root, "deploy/local-origins.json"), "utf8"))
for (const origin of localOrigins) {
  if (!/^https:\/\/(?:[a-z0-9-]+\.)?(?:e2e\.)?local\.spawnkit\.cloud$/.test(origin))
    throw new Error("Local auth origins must be exact SpawnKit checkout origins")
}
if (values.environment === "preview" && !previews.includes(values.preview)) {
  previews.push(values.preview)
  if (!values["dry-run"]) writeFileSync(registryPath, JSON.stringify(previews.sort(), null, 2) + "\n")
}
const env = {
  ...process.env,
  ...credentials,
  SPAWN_ENABLE_GITHUB: String(github.enabled),
  SPAWN_DASHBOARD_ENVIRONMENT: values.environment,
  SPAWN_CONTROL_ENVIRONMENT: production ? "production" : "staging",
  SPAWN_DYNAMIC_HOSTING: "true",
  SPAWN_HOSTING_PROVISIONER: hostingToken ? "true" : "false",
  SPAWN_PREVIEW_NAME: values.preview,
  SPAWN_CONTROL_API_URL: production ? "https://api.spawnkit.cloud" : "https://api.staging.spawnkit.cloud",
  SPAWN_DASHBOARD_ORIGINS: production
    ? "https://spawnkit.cloud"
    : [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        ...localOrigins,
        "https://staging.spawnkit.cloud",
        ...previews.map((name) => `https://preview-${name}.spawnkit.cloud`)
      ].join(","),
  VITE_SPAWN_SOCIAL_PROVIDERS: credentials.VITE_SPAWN_SOCIAL_PROVIDERS ?? (production ? "" : "github,google")
}
const cf = resolve(root, "apps/dashboard/node_modules/cf/bin/cf")
mkdirSync(resolve(root, "work"), { recursive: true })
const temporary = mkdtempSync(resolve(root, "work/deploy-"))
if (dirname(temporary) !== resolve(root, "work")) throw new Error("Unsafe temporary directory")
function command(app, args) {
  const result = spawnSync(process.execPath, [cf, ...args], { cwd: resolve(root, "apps", app), env, stdio: "inherit" })
  if (result.error || result.status !== 0) throw new Error(`Deployment failed for ${app}`)
}
function deploy(app, secrets) {
  command(app, ["deploy", "--dry-run"])
  if (values["dry-run"]) return
  const args = ["deploy", "--prebuilt"]
  if (secrets) {
    const path = join(temporary, `${app}.json`)
    writeFileSync(path, JSON.stringify(secrets), { mode: 0o600 })
    args.push("--secrets-file", path)
  }
  command(app, args)
}
function deployStories() {
  const build = spawnSync(process.execPath, [resolve(root, "apps/stories/build.mjs")], {
    cwd: resolve(root, "apps/stories"),
    env,
    stdio: "inherit"
  })
  if (build.status !== 0) throw new Error("Storybook packaging failed")
  command("stories", ["deploy", "--prebuilt", "--dry-run"])
  if (!values["dry-run"]) command("stories", ["deploy", "--prebuilt"])
}
try {
  if (["all", "services"].includes(values.component)) {
    // Existing telemetry signing keys are retained, never regenerated during deployment.
    deploy("telemetry")
    deploy("game-host")
  }
  if (deployControl) {
    deploy("control-api", {
      CLERK_SECRET_KEY: credentials.CLERK_SECRET_KEY,
      CLERK_OAUTH_CLIENT_ID: credentials.CLERK_OAUTH_CLIENT_ID,
      ...github.secrets,
      ...(hostingToken ? { HOSTING_API_TOKEN: hostingToken } : {})
    })
  }
  if (["all", "dashboard", "frontend"].includes(values.component))
    deploy("dashboard", { CLERK_SECRET_KEY: credentials.CLERK_SECRET_KEY })
  if (["stories", "frontend", "all"].includes(values.component)) deployStories()
} finally {
  // This exact directory was created above under the workspace's ignored work directory.
  rmSync(temporary, { recursive: true, force: true })
}
