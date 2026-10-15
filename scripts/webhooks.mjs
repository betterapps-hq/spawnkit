import { spawn, spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { parseArgs, parseEnv } from "node:util"
import { developmentEnvironment, root } from "./dev-environment.mjs"

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    slot: { type: "string" },
    target: { type: "string" },
    path: { type: "string", default: "/api/platform/v1/github/webhook" }
  }
})
const action = positionals[0] || "status"
const local = developmentEnvironment()
const slot = values.slot || local.name
if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slot)) throw new Error("Invalid webhook slot")
const hostname = `${slot}.hooks.local.spawnkit.cloud`
const target = new URL(values.target || local.api)
if (
  target.protocol !== "https:" ||
  target.port ||
  target.username ||
  target.password ||
  target.pathname !== "/" ||
  target.search ||
  target.hash ||
  !target.hostname.endsWith(".spawnkit.cloud")
)
  throw new Error("Choose an exact local HTTPS origin")
if (!target.hostname.includes(".local.") && !target.hostname.startsWith("local."))
  throw new Error("The webhook target must be a local checkout")
if (!/^\/[a-zA-Z0-9/_-]+$/.test(values.path)) throw new Error("Choose one exact webhook path")
const cf = join(root, "apps/dashboard/node_modules/cf/bin/cf")
const registryPath = join(root, "deploy/hook-slots.json")
const registry = JSON.parse(readFileSync(registryPath, "utf8"))
const saved = registry.find((item) => item.hostname === hostname)
const privatePath = join(root, "deploy/.env.hooks")
const credentials = existsSync(privatePath) ? parseEnv(readFileSync(privatePath, "utf8")) : {}
const tokenFile = join(root, "work", `hook-${slot}.token`)
const zone = "2a8126a122d81d58aafe2535a2219e7c"
function command(args) {
  const result = spawnSync(process.execPath, [cf, ...args], { cwd: root, encoding: "utf8", windowsHide: true })
  // Provider responses can contain tunnel credentials; never include them in an exception or log.
  if (result.error || result.status !== 0 || /APIError/.test(result.stderr))
    throw new Error(`Cloudflare ${args.slice(0, 3).join(" ")} failed; inspect the provider status.`)
  return JSON.parse(result.stdout)
}
if (action === "setup") {
  const caPool = join(process.env.PORTLESS_STATE_DIR || join(homedir(), ".portless"), "ca.pem")
  if (!existsSync(caPool)) throw new Error("Run pnpm dev:setup before configuring a tunnel")
  const name = `spawnkit-hooks-${slot}`
  const existing = command(["tunnels", "list", "--is-deleted", "false"]).find((item) => item.name === name)
  if (existing && saved?.id !== existing.id)
    throw new Error("This tunnel name is already in use; select a different slot")
  const tunnel = existing || command(["tunnels", "create", "--name", name, "--config-source", "cloudflare"])
  const config = {
    config: {
      ingress: [
        {
          hostname,
          path: `^${values.path}$`,
          service: target.origin,
          originRequest: { httpHostHeader: target.hostname, originServerName: target.hostname, caPool }
        },
        { service: "http_status:404" }
      ]
    }
  }
  command(["tunnels", "config", "update", tunnel.id, "--body", JSON.stringify(config), "--dry-run"])
  command(["tunnels", "config", "update", tunnel.id, "--body", JSON.stringify(config)])
  const record = { type: "CNAME", name: hostname, content: `${tunnel.id}.cfargotunnel.com`, proxied: true, ttl: 1 }
  const dns = command(["dns", "records", "list", "-z", zone, "--name", hostname])
  if (dns.length && !dns.some((item) => item.type === record.type && item.content === record.content && item.proxied))
    throw new Error("Conflicting webhook DNS record; no record was overwritten")
  if (!dns.length) command(["dns", "records", "create", "-z", zone, "--body", JSON.stringify(record)])
  mkdirSync(join(root, "work"), { recursive: true })
  const token = command(["tunnels", "token", "get", tunnel.id])
  if (typeof token !== "string") throw new Error("Unexpected tunnel token response")
  writeFileSync(tokenFile, token, { mode: 0o600 })
  credentials.GITHUB_WEBHOOK_SECRET ||= randomBytes(32).toString("hex")
  writeFileSync(privatePath, `GITHUB_WEBHOOK_SECRET=${credentials.GITHUB_WEBHOOK_SECRET}\n`, { mode: 0o600 })
  const entry = { hostname, id: tunnel.id, target: target.origin, path: values.path }
  writeFileSync(
    registryPath,
    JSON.stringify([...registry.filter((item) => item.hostname !== hostname), entry], null, 2) + "\n"
  )
  console.log(
    `Configured https://${hostname}${values.path}\nRestart the local API, deploy the production game router to register the slot, then run pnpm dev:hooks.`
  )
} else if (action === "run") {
  if (!saved || !existsSync(tokenFile)) throw new Error("Run pnpm dev:hooks:setup first")
  const child = spawn(process.execPath, [cf, "tunnels", "run", saved.id], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, TUNNEL_TOKEN_FILE: tokenFile }
  })
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal))
  child.on("error", (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  child.on("exit", (code) => {
    process.exitCode = code ?? 1
  })
} else if (action === "status") console.log(JSON.stringify(saved || { hostname, configured: false }, null, 2))
else throw new Error("Choose setup, run, or status")
