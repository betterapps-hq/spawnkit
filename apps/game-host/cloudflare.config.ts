import { bindings, defineConfig, triggers } from "cf/config"
import customers from "../../deploy/customer-domains.json" with { type: "json" }
import hooks from "../../deploy/hook-slots.json" with { type: "json" }
import previews from "../../deploy/previews.json" with { type: "json" }

export default defineConfig(() => {
  const production = process.env.SPAWN_CONTROL_ENVIRONMENT === "production"
  const dynamic = process.env.SPAWN_DYNAMIC_HOSTING === "true"
  const slot = process.env.SPAWN_HOST_SLOT ?? "01"
  if (!/^\d{2}$/.test(slot)) throw new Error("Choose a two-digit hosting slot.")
  return {
    accountId: "544b5bfd594cd02a5da4b79a2038cc9f",
    worker: {
      name: dynamic
        ? `spawnkit-games${production ? "" : "-staging"}`
        : `${production ? "spawnkit" : "spawn"}-game-${slot}`,
      entrypoint: "./src/index.ts",
      compatibilityDate: "2026-10-14",
      limits: { cpuMs: 50 },
      workersDev: true,
      domains:
        process.env.SPAWN_CUSTOM_DOMAINS === "false"
          ? []
          : dynamic
            ? // Runtime provisioning owns customer domains. cf skips reconciliation for an empty list,
              // preserving domains created since the last application release.
              process.env.SPAWN_CONFIGURE_CUSTOM_DOMAINS === "true"
              ? customers[production ? "production" : "staging"]
              : []
            : [`game-${production ? "" : "staging-"}${slot}.spawnkit.cloud`],
      triggers: dynamic
        ? [
            triggers.fetch({ pattern: `*.${production ? "" : "staging."}spawnkit.cloud/*`, zone: "spawnkit.cloud" }),
            ...["prod", "stage", "preview"].map((suffix) =>
              triggers.fetch({
                pattern: `*-${production ? "" : "test-"}${suffix}.spawnkit.cloud/*`,
                zone: "spawnkit.cloud"
              })
            )
          ]
        : [],
      observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.01 } },
      env: {
        SLOT: bindings.text(dynamic ? "" : slot),
        PLATFORM_HOSTS: bindings.text(
          [
            "spawnkit.cloud",
            "staging.spawnkit.cloud",
            "api.spawnkit.cloud",
            "api.staging.spawnkit.cloud",
            "api-staging.spawnkit.cloud",
            "stories.spawnkit.cloud",
            "stories.staging.spawnkit.cloud",
            "telemetry.spawnkit.cloud",
            "telemetry.staging.spawnkit.cloud",
            "telemetry-staging.spawnkit.cloud",
            "hooks.spawnkit.cloud",
            "hooks.staging.spawnkit.cloud",
            "hooks.local.spawnkit.cloud",
            ...hooks.map((hook) => hook.hostname),
            "clerk.spawnkit.cloud",
            "accounts.spawnkit.cloud",
            ...previews.map((name) => `preview-${name}.spawnkit.cloud`)
          ].join(",")
        ),
        DATABASE: bindings.d1({
          id: production ? "6d546779-70b6-42af-9a61-c646ab642012" : "42c76813-8fd1-4831-9500-5155eb1dab20",
          name: production ? "spawnkit-control" : "spawn-control"
        }),
        ARTIFACTS: bindings.r2({ name: production ? "spawnkit-production-artifacts" : "spawn-platform-artifacts" })
      }
    }
  }
})
