import { getCACertificates, setDefaultCACertificates } from "node:tls"
import { defineConfig, devices } from "@playwright/test"
import { testOrigins } from "./scripts/dev-environment.mjs"
setDefaultCACertificates([...getCACertificates("default"), ...getCACertificates("system")])
const origins = testOrigins()

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["community-live.spec.ts", "seo.spec.ts"],
  use: { baseURL: origins.app, trace: "retain-on-failure" },
  webServer: [
    ...(process.env.SPAWN_E2E_APP_URL
      ? []
      : [{ command: "node scripts/dev.mjs e2e", url: origins.app, reuseExistingServer: false }]),
    ...(process.env.SPAWN_E2E_STORIES_URL
      ? []
      : [
          {
            command: "node scripts/dev.mjs e2e-stories",
            url: origins.stories,
            reuseExistingServer: false
          }
        ])
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }
  ]
})
