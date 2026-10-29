import { getCACertificates, setDefaultCACertificates } from "node:tls"
import { playwrightServer } from "@buildkitgg/dev-domains/playwright"
import { defineConfig, devices } from "@playwright/test"
import { root, testOrigins } from "./scripts/dev-environment.mjs"
setDefaultCACertificates([...getCACertificates("default"), ...getCACertificates("system")])
const origins = testOrigins()
const loopback = Boolean(process.env.CI || process.env.SPAWN_E2E_LOOPBACK === "1")

async function server(service: "e2e" | "e2e-stories", origin: string) {
  if (!loopback) return (await playwrightServer(service, root)).webServer
  const stories = service === "e2e-stories"
  const built = stories && process.env.SPAWN_E2E_STATIC_STORIES === "1"
  const port = new URL(origin).port
  return {
    cwd: `${root}/apps/dashboard`,
    command:
      stories && !built
        ? `pnpm exec storybook dev --host 127.0.0.1 --port ${port} --exact-port --no-open --ci`
        : `pnpm exec vite ${built ? "preview --config .storybook/vite.config.ts --outDir storybook-static " : ""}--host 127.0.0.1 --port ${port} --strictPort`,
    url: origin,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      SPAWN_SITE_URL: origins.app,
      SPAWN_LOCAL_ORIGIN: origin,
      SPAWN_CONTROL_API_URL: process.env.SPAWN_CONTROL_API_URL || "https://api.staging.spawnkit.cloud",
      SPAWN_VITE_CACHE: ".vite-e2e"
    }
  }
}

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["community-live.spec.ts", "seo.spec.ts"],
  use: { baseURL: origins.app, trace: "retain-on-failure" },
  webServer: [
    ...(process.env.SPAWN_E2E_APP_URL ? [] : [await server("e2e", origins.app)]),
    ...(process.env.SPAWN_E2E_STORIES_URL ? [] : [await server("e2e-stories", origins.stories)])
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }
  ]
})
