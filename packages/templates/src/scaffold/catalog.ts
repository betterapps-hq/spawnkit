import { defineCatalog, defineQuestion, defineSettings, defineTemplate } from "@buildkitgg/scaffolder"
import { templates } from "../catalog"
import { starterKits } from "../kits"
import { addons } from "./addons"
import { kitPreset } from "./answers"
import { spawnkitTarget } from "./target"

/**
 * SpawnKit's file names: `spawn.jsonc` and `.spawn/`. The catalog ships inside the CLI and the dashboard, not on its own,
 * so upgrades merge seeds against bases stored in the lock. Games pin pnpm in `packageManager`, so `spawn create`'s
 * setup steps install with pnpm whichever package manager ran the CLI.
 */
export const settings = defineSettings({ product: "spawn", seedBases: "stored", setup: { packageManager: "pnpm" } })

export const catalog = defineCatalog({
  id: "@spawn/templates",
  version: "1.0.0",
  facets: ["2d", "3d"],
  versions: {
    typescript: "7.0.2",
    vite: "8.3.4",
    oxlint: "1.88.0",
    oxfmt: "0.73.0",
    "@buildkitgg/dev-domains": "0.1.0",
    "@types/node": "24.19.2",
    "pixi.js": "8.22.0",
    phaser: "3.90.0",
    "@babylonjs/core": "9.30.0",
    three: "0.186.1",
    "@types/three": "0.186.0",
    "@pixi/ui": "2.4.1",
    "@babylonjs/gui": "9.30.0",
    "@dimforge/rapier2d-compat": "0.21.0",
    "@dimforge/rapier3d-compat": "0.21.0",
    "@babylonjs/havok": "1.3.14",
    bitecs: "0.4.0",
    koota: "0.6.6",
    "@sentry/browser": "11.7.0",
    vitest: "5.0.4",
    "@vitest/coverage-v8": "5.0.4",
    "@vitest/browser-playwright": "5.0.4",
    playwright: "1.64.0",
    "@playwright/test": "1.64.0",
    storybook: "10.6.2",
    "@storybook/html-vite": "10.6.2"
  },
  targets: [spawnkitTarget],
  // Each question offers every renderer's choices; a template shows the ones whose supports() accepts its renderer. The
  // add-ons provide the question's capability and conflict with any other add-on that provides it, so a game has one of
  // each, through create and through add.
  questions: [
    defineQuestion({
      id: "physics",
      title: "Physics",
      question: "Add physics?",
      choose: "Which physics engine?",
      pick: "one",
      choices: ["@spawnkit/rapier2d", "@spawnkit/arcade", "@spawnkit/matter", "@spawnkit/havok", "@spawnkit/rapier3d"]
    }),
    defineQuestion({
      id: "ui",
      title: "UI",
      question: "Add a pause UI?",
      choose: "Which UI?",
      pick: "one",
      choices: ["@spawnkit/html-ui", "@spawnkit/pixi-ui", "@spawnkit/babylon-gui"]
    }),
    defineQuestion({
      id: "simulation",
      title: "Simulation",
      choose: "Which simulation runs movement?",
      pick: "one",
      required: true,
      choices: ["@spawnkit/plain", "@spawnkit/bitecs", "@spawnkit/koota"]
    }),
    // Sentry or SpawnKit telemetry, not both.
    defineQuestion({
      id: "telemetry",
      title: "Telemetry",
      question: "Add telemetry?",
      choose: "Which telemetry?",
      pick: "one",
      choices: ["@spawnkit/platform-telemetry", "@spawnkit/sentry"]
    }),
    defineQuestion({
      id: "tools",
      title: "Developer tools",
      question: "Add developer tools?",
      choose: "Which tools?",
      pick: "many",
      choices: ["@spawnkit/vitest", "@spawnkit/playwright", "@spawnkit/storybook"]
    })
  ],
  // One template per renderer, each limited to its own mode, so a game can't change renderer after create.
  templates: templates.map((template) =>
    defineTemplate({
      id: template.id,
      title: template.name,
      description: template.description,
      target: "spawnkit",
      modes: [template.renderer],
      questions: [
        "physics",
        { use: "ui", default: "@spawnkit/html-ui" },
        { use: "simulation", default: "@spawnkit/plain" },
        "telemetry",
        "tools"
      ]
    })
  ),
  addons,
  // Each starter kit is a preset of the same id, so a kit download is what `spawn create --preset <kit>` writes.
  presets: starterKits.map(kitPreset)
})
