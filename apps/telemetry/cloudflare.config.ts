import { bindings, defineConfig, defineWorker, exports } from "cf/config"
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" }

const production = process.env.SPAWN_CONTROL_ENVIRONMENT === "production"
const worker = defineWorker({
  name: production ? "spawnkit-telemetry" : "spawn-telemetry",
  entrypoint,
  compatibilityDate: process.env.SPAWN_LOCAL_WORKER === "true" ? "2026-10-07" : "2026-10-14",
  workersDev: true,
  exports: { TelemetryStore: exports.durableObject({ storage: "sqlite" }) }
})
export default defineConfig({
  accountId: "544b5bfd594cd02a5da4b79a2038cc9f",
  worker: {
    ...worker,
    domains:
      process.env.SPAWN_CUSTOM_DOMAINS === "false"
        ? []
        : production
          ? ["telemetry.spawnkit.cloud"]
          : ["telemetry.staging.spawnkit.cloud"],
    observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.1 } },
    env: {
      TENANTS: bindings.durableObject<typeof worker, "TelemetryStore">({ worker, exportName: "TelemetryStore" }),
      SIGNING_KEY: bindings.secret(),
      PUBLIC_ENDPOINT: bindings.text(
        process.env.SPAWN_TELEMETRY_PUBLIC_ENDPOINT ??
          (production ? "https://telemetry.spawnkit.cloud/v1/logs" : "https://telemetry.staging.spawnkit.cloud/v1/logs")
      ),
      EDGE_LIMIT: bindings.rateLimit({ namespace: "7210", simple: { limit: 120, period: 60 } })
    }
  }
})
