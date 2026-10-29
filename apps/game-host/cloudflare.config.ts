import { bindings, defineConfig, triggers } from "cf/config"
import customers from "../../deploy/customer-domains.json" with { type: "json" }

export default defineConfig(() => {
  const production = process.env.SPAWN_CONTROL_ENVIRONMENT === "production"
  return {
    accountId: "544b5bfd594cd02a5da4b79a2038cc9f",
    worker: {
      name: `spawnkit-games${production ? "" : "-staging"}`,
      entrypoint: "./src/index.ts",
      compatibilityDate: "2026-10-14",
      limits: { cpuMs: 50 },
      workersDev: true,
      // Runtime provisioning owns customer domains; ordinary releases leave them alone.
      domains:
        process.env.SPAWN_CUSTOM_DOMAINS !== "false" && process.env.SPAWN_CONFIGURE_CUSTOM_DOMAINS === "true"
          ? customers[production ? "production" : "staging"]
          : [],
      triggers: (production ? ["spawnkit.games/*", "*.spawnkit.games/*"] : ["*.staging.spawnkit.games/*"]).map(
        (pattern) => triggers.fetch({ pattern, zone: "spawnkit.games" })
      ),
      observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.01 } },
      env: {
        DATABASE: bindings.d1({
          id: production ? "6d546779-70b6-42af-9a61-c646ab642012" : "42c76813-8fd1-4831-9500-5155eb1dab20",
          name: production ? "spawnkit-control" : "spawn-control"
        }),
        ARTIFACTS: bindings.r2({ name: production ? "spawnkit-production-artifacts" : "spawn-platform-artifacts" })
      }
    }
  }
})
