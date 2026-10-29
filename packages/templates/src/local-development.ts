/** Standalone configuration consumed by BuildKit; routing and process ownership stay in the library. */
export const localDevelopmentFiles = {
  "dev-domains.config.mjs": String.raw`import { defineConfig } from "@buildkitgg/dev-domains"
import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { join, delimiter } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL(".", import.meta.url))
const envFile = join(root, ".env")
if (existsSync(envFile)) process.loadEnvFile(envFile)
// Git for Windows includes OpenSSL; keep first-run setup usable without a global install.
if (process.platform === "win32" && spawnSync("openssl", ["version"]).error) {
  const directory = join(process.env.ProgramFiles || "C:\\Program Files", "Git", "usr", "bin")
  if (existsSync(join(directory, "openssl.exe"))) process.env.PATH = directory + delimiter + (process.env.PATH || "")
}
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const project = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 63).replace(/^-+|-+$/g, "") || "game"
const linkFile = join(root, ".spawn", "project.json")
const linked = existsSync(linkFile) ? JSON.parse(readFileSync(linkFile, "utf8")) : {}
const configuredDomain = process.env.SPAWN_GAME_DOMAIN || linked.hostname
if (configuredDomain !== undefined && typeof configuredDomain !== "string") throw new Error("Invalid linked project hostname")
const domain = configuredDomain
if (domain && !/^[a-z0-9-]+(?:\.staging)?\.spawnkit\.games$/.test(domain)) throw new Error("SPAWN_GAME_DOMAIN must be the project's assigned production hostname")
const checkout = process.env.SPAWN_LOCAL_NAME || ""
if (checkout && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(checkout)) throw new Error("Invalid SPAWN_LOCAL_NAME")
function endpoint(service, kind, command, framework) {
  const base = domain ? (service === "app" ? "local" : service + ".local") : "{project}" + (service === "app" ? "" : "." + service)
  return { kind, command, framework, primaryName: (checkout ? checkout + "." : "") + base, name: (checkout || "{worktree}") + "." + base }
}
export default defineConfig({
  project, domain: domain || "local.spawnkit.games", packageManager: "pnpm",
  proxy: { https: true, port: 443, syncHosts: false },
  endpoints: {
    app: endpoint("app", "app", ["vite"], "vite"),
    ...(pkg.devDependencies?.storybook ? { stories: endpoint("stories", "storybook", ["storybook", "dev"], "storybook") } : {}),
    ...(pkg.devDependencies?.["@playwright/test"] ? { e2e: endpoint("e2e", "e2e", ["vite"], "vite") } : {})
  }
})
`,
  "scripts/local-environment.mjs": String.raw`import { getEndpoint } from "@buildkitgg/dev-domains/node"
import { fileURLToPath } from "node:url"
const root = fileURLToPath(new URL("..", import.meta.url))
export async function localOrigin(service = "app") {
  if (service === "e2e" && (process.env.CI || process.env.SPAWN_E2E_LOOPBACK === "1" || process.env.SPAWN_E2E_HTTPS !== "1")) return "http://127.0.0.1:4173"
  return (await getEndpoint(service, root)).origin
}
`,
  "scripts/local-environment.d.mts":
    'export function localOrigin(service?: "app" | "stories" | "e2e"): Promise<string>\n'
}

export const playwrightConfiguration = String.raw`import { defineConfig, devices } from "@playwright/test"
import { getCACertificates, setDefaultCACertificates } from "node:tls"
import { playwrightServer } from "@buildkitgg/dev-domains/playwright"
import { fileURLToPath } from "node:url"
setDefaultCACertificates([...getCACertificates("default"), ...getCACertificates("system")])
const loopback = process.env.CI || process.env.SPAWN_E2E_LOOPBACK === "1" || process.env.SPAWN_E2E_HTTPS !== "1"
const server = loopback ? {
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: { command: "vite --host 127.0.0.1 --port 4173 --strictPort", url: "http://127.0.0.1:4173", reuseExistingServer: false }
} : await playwrightServer("e2e", fileURLToPath(new URL(".", import.meta.url)))
export default defineConfig({
  testDir: "./e2e", fullyParallel: true, forbidOnly: true,
  ...server, use: { ...server.use, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } } }]
})
`
