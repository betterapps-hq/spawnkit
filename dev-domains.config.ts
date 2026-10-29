import { defineConfig } from "@buildkitgg/dev-domains"

const dashboard = {
  cwd: "apps/dashboard",
  framework: "vite" as const,
  command: ["vite"],
  env: {
    SPAWN_SITE_URL: "{origin}",
    SPAWN_LOCAL_ORIGIN: "{origin}",
    SPAWN_CONTROL_API_URL: process.env.SPAWN_CONTROL_API_URL || "https://api.staging.spawnkit.cloud",
    SPAWN_VITE_CACHE: ".vite"
  },
  auth: ["/sso-callback", "/api/platform/v1/github/callback"]
}
const stories = {
  cwd: "apps/dashboard",
  framework: "storybook" as const,
  command: ["storybook", "dev"],
  env: { SPAWN_LOCAL_ORIGIN: "{origin}" }
}

export default defineConfig({
  project: "spawnkit",
  domain: "spawnkit.cloud",
  packageManager: "pnpm",
  proxy: { https: true, port: 443, syncHosts: false },
  endpoints: {
    app: { ...dashboard, primaryName: "local", name: "{worktree}.local" },
    stories: { ...stories, kind: "storybook", primaryName: "stories.local", name: "{worktree}.stories.local" },
    api: {
      primaryName: "api.local",
      name: "{worktree}.api.local",
      command: ["node", "scripts/dev.mjs", "api"],
      framework: "vite",
      env: { SPAWN_LOCAL_ORIGIN: "{origin}" }
    },
    telemetry: {
      primaryName: "telemetry.local",
      name: "{worktree}.telemetry.local",
      command: ["node", "scripts/dev.mjs", "telemetry"],
      framework: "vite",
      env: { SPAWN_LOCAL_ORIGIN: "{origin}" }
    },
    e2e: {
      ...dashboard,
      kind: "e2e",
      primaryName: "e2e.local",
      name: "{worktree}.e2e.local",
      env: { ...dashboard.env, SPAWN_VITE_CACHE: ".vite-e2e" }
    },
    "e2e-stories": {
      ...stories,
      kind: "e2e",
      primaryName: "stories.e2e.local",
      name: "{worktree}.stories.e2e.local",
      ...(process.env.SPAWN_E2E_STATIC_STORIES === "1"
        ? {
            framework: "vite",
            command: ["vite", "preview", "--config", ".storybook/vite.config.ts", "--outDir", "storybook-static"]
          }
        : {})
    }
  }
})
