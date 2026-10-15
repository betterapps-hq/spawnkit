/** Standalone sources, embedded by the shared catalog and CLI bundle. */
export const localDevelopmentFiles = {
  "scripts/local-environment.mjs": String.raw`import { createHash } from "node:crypto"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"

const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)))
const envFile = new URL("../.env", import.meta.url)
if (existsSync(envFile)) process.loadEnvFile(fileURLToPath(envFile))
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const name = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32).replace(/^-+|-+$/g, "") || "game"
const identity = createHash("sha256").update(root.replaceAll("\\", "/").toLowerCase()).digest("hex").slice(0, 8)
export function localOrigin(service = "app") {
  if (service === "e2e" && (process.env.CI || process.env.SPAWN_E2E_LOOPBACK === "1")) return "http://127.0.0.1:4173"
  const domain = process.env.SPAWN_GAME_DOMAIN
  if (domain && !/^[a-z0-9-]+(?:\.staging)?\.spawnkit\.cloud$/.test(domain)) throw new Error("SPAWN_GAME_DOMAIN must be the project's assigned production hostname")
  const checkout = process.env.SPAWN_LOCAL_NAME || ""
  if (checkout && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(checkout)) throw new Error("Invalid SPAWN_LOCAL_NAME")
  const prefix = service === "app" ? "" : service + "."
  return domain
    ? "https://" + (checkout ? checkout + "." : "") + prefix + "local." + domain
    : "https://" + name + "-" + identity + "." + prefix + "local.spawnkit.cloud"
}
`,
  "scripts/local-environment.d.mts": 'export function localOrigin(service?: "app" | "stories" | "e2e"): string\n',
  "scripts/local.mjs": String.raw`import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { createServer } from "node:net"
import { homedir } from "node:os"
import { join, delimiter } from "node:path"
import { fileURLToPath } from "node:url"
import { RouteStore } from "portless"
import { localOrigin } from "./local-environment.mjs"

const service = process.argv[2] || "app"
if (existsSync(".env")) process.loadEnvFile(".env")
if (process.platform === "win32" && spawnSync("openssl", ["version"]).error) {
  const directory = join(process.env.ProgramFiles || "C:\\Program Files", "Git", "usr", "bin")
  if (existsSync(join(directory, "openssl.exe"))) process.env.PATH = directory + delimiter + (process.env.PATH || "")
}
const portless = fileURLToPath(new URL("cli.js", import.meta.resolve("portless")))
const state = process.env.PORTLESS_STATE_DIR || join(homedir(), ".portless")
Object.assign(process.env, { PORTLESS_HTTPS: "1", PORTLESS_PORT: "443", PORTLESS_SYNC_HOSTS: "0" })
function run(file, args) {
  const child = spawn(process.execPath, [file, ...args], { stdio: "inherit", env: process.env })
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal))
  return new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", code => resolve(code ?? 1)) })
}
if (service === "urls") console.log(JSON.stringify(Object.fromEntries(["app", "stories", "e2e"].map(s => [s, localOrigin(s)])), null, 2))
else if (service === "setup") process.exitCode = await run(portless, ["proxy", "start", "--tld", "spawnkit.cloud"])
else {
  if (!["app", "stories", "e2e"].includes(service)) throw new Error("Choose app, stories, e2e, setup, or urls")
  const url = new URL(localOrigin(service))
  const local = url.protocol === "http:"
  if (!local && (!existsSync(join(state, "proxy.tls")) || readFileSync(join(state, "proxy.port"), "utf8").trim() !== "443")) throw new Error("Run pnpm dev:setup first")
  const server = createServer()
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(local ? Number(url.port) : 0, "127.0.0.1", resolve) })
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  const store = local ? null : new RouteStore(state)
  store?.addRoute(url.hostname, port, process.pid)
  const cleanup = () => store?.removeRoute(url.hostname, process.pid)
  process.once("exit", cleanup)
  Object.assign(process.env, { PORT: String(port), PORTLESS_URL: url.origin, __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: url.hostname })
  console.log(service + ": " + url.origin)
  try {
    const bin = service === "stories"
      ? fileURLToPath(new URL("dist/bin/dispatcher.js", import.meta.resolve("storybook/package.json")))
      : fileURLToPath(new URL("bin/vite.js", import.meta.resolve("vite/package.json")))
    const args = service === "stories" ? ["dev", "--host", "127.0.0.1", "--port", String(port), "--exact-port", "--ci", "--no-open"] : ["--host", "127.0.0.1", "--port", String(port), "--strictPort"]
    process.exitCode = await run(bin, args)
  } finally { cleanup() }
}
`
}
