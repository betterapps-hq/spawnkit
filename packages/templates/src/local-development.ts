/** Standalone sources, embedded by the shared catalog and CLI bundle. */
export const localDevelopmentFiles = {
  "dev-domains.config.ts": String.raw`import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "@buildkitgg/dev-domains"

const envFile = new URL("./.env", import.meta.url)
if (existsSync(envFile)) process.loadEnvFile(fileURLToPath(envFile))
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"))
const project = pkg.name.slice(0, 63).replace(/-$/, "")
const assigned = process.env.SPAWN_GAME_DOMAIN
if (assigned && !/^[a-z0-9-]+(?:\.staging)?\.spawnkit\.cloud$/.test(assigned)) {
  throw new Error("SPAWN_GAME_DOMAIN must be the project's assigned hostname")
}
function names(service = "") {
  const suffix = (service ? service + "." : "") + "local"
  const primaryName = assigned ? suffix : "{project}." + suffix
  return { primaryName, name: "{worktree}." + primaryName }
}
export default defineConfig({
  project,
  domain: assigned || "spawnkit.cloud",
  packageManager: "pnpm",
  proxy: { https: true, port: 443, syncHosts: false },
  endpoints: {
    app: { ...names(), command: ["vite"], framework: "vite" },
    ...(pkg.devDependencies?.storybook ? {
      stories: { ...names("stories"), kind: "storybook", command: ["storybook", "dev"], framework: "storybook" }
    } : {}),
    ...(pkg.devDependencies?.["@playwright/test"] ? {
      e2e: { ...names("e2e"), kind: "e2e", command: ["vite"], framework: "vite" }
    } : {})
  }
})
`
}

export const playwrightConfiguration = String.raw`import { getCACertificates, setDefaultCACertificates } from "node:tls"
import { fileURLToPath } from "node:url"
import { playwrightServer } from "@buildkitgg/dev-domains/playwright"
import { defineConfig, devices } from "@playwright/test"

setDefaultCACertificates([...getCACertificates("default"), ...getCACertificates("system")])
const root = fileURLToPath(new URL(".", import.meta.url))
const loopback = process.env.CI || process.env.SPAWN_E2E_LOOPBACK === "1"
const local = loopback ? undefined : await playwrightServer("e2e", root)
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: true,
  use: { baseURL: local?.use.baseURL ?? "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } } }],
  webServer: local?.webServer ?? {
    command: "pnpm exec vite --host 127.0.0.1 --port 4173 --strictPort",
    cwd: root,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false
  }
})
`
