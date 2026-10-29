import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: "seo.spec.ts",
  workers: 1,
  // Cold Vite compilation can outlast Playwright's 5s assertion default.
  // Loading performance is measured separately against the deployed build.
  expect: { timeout: 15_000 },
  use: { baseURL: "http://127.0.0.1:5196", trace: "retain-on-failure" },
  outputDir: "test-results/seo",
  webServer: {
    command: "node scripts/seo-test-server.mjs",
    url: "http://127.0.0.1:5196/create",
    timeout: 120_000,
    reuseExistingServer: false
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }
  ]
})
