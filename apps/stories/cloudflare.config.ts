import { defineConfig } from "cf/config"
const production = process.env.SPAWN_CONTROL_ENVIRONMENT === "production"
const preview = process.env.SPAWN_DASHBOARD_ENVIRONMENT === "preview" ? process.env.SPAWN_PREVIEW_NAME : undefined
if (preview !== undefined && !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(preview))
  throw new Error("Invalid Storybook preview name")
export default defineConfig({
  accountId: "544b5bfd594cd02a5da4b79a2038cc9f",
  worker: {
    name: `spawnkit-stories${preview ? `-preview-${preview}` : production ? "" : "-staging"}`,
    compatibilityDate: "2026-10-14",
    domains: [
      preview
        ? `stories-preview-${preview}.spawnkit.cloud`
        : production
          ? "stories.spawnkit.cloud"
          : "stories.staging.spawnkit.cloud"
    ],
    assets: { htmlHandling: "none", notFoundHandling: "none" }
  }
})
