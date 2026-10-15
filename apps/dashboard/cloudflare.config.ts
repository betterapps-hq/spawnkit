import { bindings, defineConfig, triggers } from "cf/config"

export default defineConfig(({ mode }) => {
  const target = process.env.SPAWN_DASHBOARD_ENVIRONMENT ?? mode
  const environment = target === "staging" ? "staging" : target === "preview" ? "preview" : "production"
  const preview = process.env.SPAWN_PREVIEW_NAME ?? "latest"
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(preview))
    throw new Error("Preview names must contain 1–40 lowercase letters, digits, or hyphens.")
  const suffix = environment === "production" ? "" : environment === "staging" ? "-staging" : `-preview-${preview}`
  const hostname = environment === "production" ? "spawnkit.cloud" : `${suffix.slice(1)}.spawnkit.cloud`
  return {
    accountId: "544b5bfd594cd02a5da4b79a2038cc9f",
    worker: {
      name: `spawnkit-dashboard${suffix}`,
      entrypoint: "@tanstack/react-start/server-entry",
      compatibilityDate: "2026-10-14",
      compatibilityFlags: ["nodejs_compat"],
      domains: process.env.SPAWN_CUSTOM_DOMAINS === "false" ? [] : [hostname],
      // Exact PR routes take precedence over the production game router's wildcard.
      triggers:
        environment === "preview" && process.env.SPAWN_CUSTOM_DOMAINS !== "false"
          ? [triggers.fetch({ pattern: `${hostname}/*`, zone: "spawnkit.cloud" })]
          : [],
      observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.1 } },
      env: {
        SPAWN_ENVIRONMENT: bindings.text(environment),
        VITE_CLERK_PUBLISHABLE_KEY: bindings.text(process.env.VITE_CLERK_PUBLISHABLE_KEY ?? ""),
        CLERK_SECRET_KEY: bindings.secret(),
        CLERK_OAUTH_CLIENT_ID: bindings.text(process.env.CLERK_OAUTH_CLIENT_ID ?? ""),
        CLERK_OAUTH_ISSUER: bindings.text(process.env.CLERK_OAUTH_ISSUER ?? ""),
        SPAWN_SITE_URL: bindings.text(`https://${hostname}`),
        SPAWN_CONTROL_API_URL: bindings.text(
          process.env.SPAWN_CONTROL_API_URL ??
            (environment === "production" ? "https://api.spawnkit.cloud" : "https://api.staging.spawnkit.cloud")
        )
      }
    }
  }
})
