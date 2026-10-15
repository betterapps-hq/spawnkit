import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import { RouteStore } from "portless"
import { developmentEnvironment, root, testOrigins } from "./dev-environment.mjs"
import { githubConfiguration } from "./github-config.mjs"

const service = process.argv[2] ?? "app"
const urls = developmentEnvironment()
const portless = fileURLToPath(new URL("cli.js", import.meta.resolve("portless")))
const state = process.env.PORTLESS_STATE_DIR || join(homedir(), ".portless")
if (process.platform === "win32" && spawnSync("openssl", ["version"]).error) {
  const openssl = join(process.env.ProgramFiles || "C:\\Program Files", "Git", "usr", "bin")
  if (existsSync(join(openssl, "openssl.exe"))) process.env.PATH = `${openssl}${delimiter}${process.env.PATH || ""}`
}
const env = { ...process.env, PORTLESS_HTTPS: "1", PORTLESS_PORT: "443", PORTLESS_LAN: "0", PORTLESS_SYNC_HOSTS: "0" }

function run(file, args, options = {}) {
  const child = spawn(process.execPath, [file, ...args], { cwd: root, env, stdio: "inherit", ...options })
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
  process.exitCode = await run(join(root, "apps/dashboard/node_modules/cf/bin/cf"), [
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
} else if (service === "urls") {
  console.log(JSON.stringify(urls, null, 2))
} else if (service === "setup" || service === "status") {
  process.exitCode = await run(
    portless,
    service === "setup" ? ["proxy", "start", "--tld", "spawnkit.cloud"] : ["doctor"]
  )
} else {
  if (!(service in urls) || ["root", "name"].includes(service))
    throw new Error("Choose app, api, telemetry, stories, e2e, e2e-stories, setup, status, or urls")
  const url = new URL(
    service === "e2e" ? testOrigins().app : service === "e2e-stories" ? testOrigins().stories : urls[service]
  )
  const loopback = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)
  if (!loopback) {
    if (!existsSync(join(state, "proxy.tls")) || readFileSync(join(state, "proxy.port"), "utf8").trim() !== "443")
      throw new Error("Run pnpm dev:setup to start a trusted HTTPS Portless proxy on port 443.")
  }
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(loopback ? Number(url.port) : 0, "127.0.0.1", resolve)
  })
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  const store = loopback ? null : new RouteStore(state)
  // The public RouteStore API registers one exact hostname, preserving other projects' TLDs.
  store?.addRoute(url.hostname, port, process.pid)
  const cleanup = () => store?.removeRoute(url.hostname, process.pid)
  process.once("exit", cleanup)
  const dashboard = join(root, "apps/dashboard")
  Object.assign(env, {
    PORT: String(port),
    PORTLESS_URL: url.origin,
    SPAWN_SITE_URL: service === "e2e" ? url.origin : urls.app,
    SPAWN_CONTROL_API_URL: process.env.SPAWN_CONTROL_API_URL || "https://api.staging.spawnkit.cloud",
    SPAWN_LOCAL_ORIGIN: url.origin,
    __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: url.hostname,
    SPAWN_DASHBOARD_ORIGINS: [urls.app, urls.e2e].join(","),
    SPAWN_VITE_CACHE: service === "e2e" ? ".vite-e2e" : ".vite"
  })
  if (service === "api") {
    const github = githubConfiguration(root, "local")
    Object.assign(env, github.secrets, { SPAWN_ENABLE_GITHUB: String(github.enabled) })
    const credentials = parseEnv(readFileSync(join(dashboard, ".env"), "utf8"))
    for (const key of ["CLERK_SECRET_KEY", "CLERK_OAUTH_CLIENT_ID"]) if (credentials[key]) env[key] = credentials[key]
    const webhookFile = join(root, "deploy/.env.hooks")
    if (!github.enabled && existsSync(webhookFile))
      env.GITHUB_WEBHOOK_SECRET = parseEnv(readFileSync(webhookFile, "utf8")).GITHUB_WEBHOOK_SECRET
  }
  if (service === "telemetry") {
    const { createHash } = await import("node:crypto")
    // Isolated local state uses a non-production key; it must never sign deployed telemetry.
    env.SIGNING_KEY = createHash("sha256").update(`spawnkit-local:${root}`).digest("hex")
    env.SPAWN_TELEMETRY_PUBLIC_ENDPOINT = `${url.origin}/v1/logs`
  }
  env.SPAWN_LOCAL_WORKER = "true"
  console.log(`${service}: ${url.origin}\nCheckout: ${root}`)
  try {
    if (service === "app" || service === "e2e") {
      process.exitCode = await run(
        join(dashboard, "node_modules/vite/bin/vite.js"),
        ["--host", "127.0.0.1", "--port", String(port), "--strictPort"],
        { cwd: dashboard }
      )
    } else if (service === "stories" || service === "e2e-stories") {
      const built = service === "e2e-stories" && process.env.SPAWN_E2E_STATIC_STORIES === "1"
      process.exitCode = await run(
        join(dashboard, built ? "node_modules/vite/bin/vite.js" : "node_modules/storybook/dist/bin/dispatcher.js"),
        built
          ? [
              "preview",
              "--config",
              ".storybook/vite.config.ts",
              "--outDir",
              "storybook-static",
              "--host",
              "127.0.0.1",
              "--port",
              String(port),
              "--strictPort"
            ]
          : ["dev", "--host", "127.0.0.1", "--port", String(port), "--exact-port", "--no-open", "--ci"],
        { cwd: dashboard }
      )
    } else {
      process.exitCode = await run(
        join(dashboard, "node_modules/vite/bin/vite.js"),
        ["--host", "127.0.0.1", "--port", String(port), "--strictPort"],
        {
          cwd: join(root, "apps", service === "api" ? "control-api" : "telemetry")
        }
      )
    }
  } finally {
    cleanup()
  }
}
