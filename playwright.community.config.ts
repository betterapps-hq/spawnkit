import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
  testDir: "./tests",
  testMatch: "community-live.spec.ts",
  use: { baseURL: "http://127.0.0.1:6020", trace: "retain-on-failure" },
  webServer: {
    command: "node apps/dashboard/community-test-server.mjs",
    url: "http://127.0.0.1:6020/tests/fixtures/community.html",
    timeout: 120_000,
    reuseExistingServer: false
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }
  ]
})
