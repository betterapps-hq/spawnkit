import { bindings, defineConfig, defineContainer, defineWorker, exports, triggers } from "cf/config"
import githubEnvironments from "../../deploy/github.json" with { type: "json" }
import localOrigins from "../../deploy/local-origins.json" with { type: "json" }
import previews from "../../deploy/previews.json" with { type: "json" }
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" }

const builder = defineContainer({
  name: "spawn-build",
  image: { dockerfile: "./Dockerfile" },
  instanceType: "basic",
  maxInstances: 3
})
const buildsEnabled = process.env.SPAWN_ENABLE_BUILD_CONTAINERS === "true"
const production = process.env.SPAWN_CONTROL_ENVIRONMENT === "production"
const githubEnvironment = process.env.SPAWN_LOCAL_WORKER === "true" ? "local" : production ? "production" : "staging"
const githubEnabled = process.env.SPAWN_ENABLE_GITHUB
  ? process.env.SPAWN_ENABLE_GITHUB === "true"
  : githubEnvironments[githubEnvironment].enabled
const githubBinding = () => (githubEnabled ? bindings.secret() : bindings.text(""))
const worker = defineWorker({
  name: production ? "spawnkit-control" : "spawn-control",
  entrypoint,
  compatibilityDate: process.env.SPAWN_LOCAL_WORKER === "true" ? "2026-10-07" : "2026-10-14",
  workersDev: true,
  exports: {
    Sandbox: exports.durableObject({ storage: "sqlite", ...(buildsEnabled ? { container: builder } : {}) }),
    BuildJob: exports.durableObject({ storage: "sqlite" })
  }
})

export default defineConfig({
  accountId: "544b5bfd594cd02a5da4b79a2038cc9f",
  containers: buildsEnabled ? [builder] : [],
  worker: {
    ...worker,
    compatibilityFlags: ["nodejs_compat"],
    domains:
      process.env.SPAWN_CUSTOM_DOMAINS === "false"
        ? []
        : production
          ? ["api.spawnkit.cloud", "hooks.spawnkit.cloud"]
          : [
              "api.staging.spawnkit.cloud",
              "hooks.staging.spawnkit.cloud",
              "hooks.local.spawnkit.cloud",
              "api-staging.spawnkit.cloud"
            ],
    triggers: [triggers.scheduled({ schedule: "* * * * *" })],
    observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.1 } },
    env: {
      SANDBOX: bindings.durableObject<typeof worker, "Sandbox">({ worker, exportName: "Sandbox" }),
      BUILD_JOBS: bindings.durableObject<typeof worker, "BuildJob">({ worker, exportName: "BuildJob" }),
      DATABASE: bindings.d1({
        id: production ? "6d546779-70b6-42af-9a61-c646ab642012" : "42c76813-8fd1-4831-9500-5155eb1dab20",
        name: production ? "spawnkit-control" : "spawn-control"
      }),
      ARTIFACTS: bindings.r2({ name: production ? "spawnkit-production-artifacts" : "spawn-platform-artifacts" }),
      TELEMETRY: bindings.worker<string, "TelemetryAdmin">({
        worker: production ? "spawnkit-telemetry" : "spawn-telemetry",
        exportName: "TelemetryAdmin"
      }),
      CLERK_SECRET_KEY: bindings.secret(),
      BUILDS_ENABLED: bindings.text(buildsEnabled ? "true" : "false"),
      HOSTING_MODE: bindings.text("domains"),
      HOSTING_TEST: bindings.text(production ? "false" : "true"),
      HOSTING_API_TOKEN: process.env.SPAWN_HOSTING_PROVISIONER === "true" ? bindings.secret() : bindings.text(""),
      DASHBOARD_ORIGINS: bindings.text(
        process.env.SPAWN_DASHBOARD_ORIGINS ??
          (production
            ? "https://spawnkit.cloud"
            : [
                "http://127.0.0.1:5173",
                "http://localhost:5173",
                ...localOrigins,
                "https://staging.spawnkit.cloud",
                ...previews.map((name) => `https://preview-${name}.spawnkit.cloud`)
              ].join(","))
      ),
      CLERK_OAUTH_CLIENT_ID: bindings.secret(),
      GITHUB_APP_ID: githubBinding(),
      GITHUB_APP_PRIVATE_KEY: githubBinding(),
      GITHUB_CLIENT_ID: githubBinding(),
      GITHUB_CLIENT_SECRET: githubBinding(),
      GITHUB_WEBHOOK_SECRET:
        process.env.SPAWN_LOCAL_WORKER === "true" && process.env.GITHUB_WEBHOOK_SECRET
          ? bindings.secret()
          : githubBinding(),
      DASHBOARD_URL: bindings.text(
        process.env.SPAWN_LOCAL_WORKER === "true"
          ? (process.env.SPAWN_SITE_URL ?? "https://local.spawnkit.cloud")
          : production
            ? "https://spawnkit.cloud"
            : "https://staging.spawnkit.cloud"
      )
    }
  }
})
