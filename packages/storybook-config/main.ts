import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { defineMain as defineStorybookMain, type StorybookConfig } from "@storybook/react-vite/node"
import { deepMerge } from "./utils/merge.js"

/**
 * Shared Storybook base configuration for the monorepo. Consumers should not
 * redefine these — `defineMain` merges an app's config on top of the base.
 */
export const baseConfig: Omit<StorybookConfig, "stories"> = {
  framework: {
    name: "@storybook/react-vite",
    options: {}
  },
  addons: [
    dirname(fileURLToPath(import.meta.resolve("@chromatic-com/storybook/package.json"))),
    dirname(fileURLToPath(import.meta.resolve("@storybook/addon-a11y/package.json"))),
    dirname(fileURLToPath(import.meta.resolve("@storybook/addon-vitest/package.json")))
  ],
  core: {
    disableTelemetry: true
  }
}

/**
 * Builds a Storybook `main` config by combining the shared base with an app's
 * overrides (addons concatenated, objects merged deeply), then running it
 * through Storybook's own `defineMain` so the framework is wired correctly.
 *
 * ```ts
 * import { defineMain } from "@spawn/storybook-config/main";
 *
 * export default defineMain({
 *   stories: ["../src/**\/*.stories.@(ts|tsx)"]
 * });
 * ```
 */
export function defineMain(overrides: StorybookConfig): StorybookConfig {
  return defineStorybookMain(deepMerge(baseConfig as StorybookConfig, overrides))
}
