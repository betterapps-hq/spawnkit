import { defineCatalog, definePreset, defineSettings, defineSlot, defineTemplate } from "@buildkitgg/scaffolder"
import { templates } from "../catalog"
import { addons } from "./addons"
import { spawnkitTarget } from "./target"

/**
 * SpawnKit's file names: `spawn.jsonc` and `.spawn/`. The catalog ships inside the CLI and the dashboard, not on its own,
 * so upgrades merge seeds against bases stored in the lock.
 */
export const settings = defineSettings({ product: "spawn", seedBases: "stored" })

const tools = ["@spawnkit/vitest", "@spawnkit/playwright", "@spawnkit/storybook"]

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
  slots: [
    defineSlot({ id: "physics", title: "Physics", question: "Add physics?", choose: "Which physics engine?" }),
    defineSlot({ id: "ui", title: "UI", question: "Add a pause UI?", choose: "Which UI?" }),
    defineSlot({
      id: "simulation",
      title: "Simulation",
      question: "Add a simulation?",
      choose: "Which simulation runs movement?"
    }),
    defineSlot({ id: "telemetry", title: "Telemetry", question: "Add telemetry?", choose: "Which telemetry?" })
  ],
  // One template per renderer, each limited to its own mode, so a game can't change renderer after init.
  templates: templates.map((template) =>
    defineTemplate({
      id: template.id,
      title: template.name,
      description: template.description,
      target: "spawnkit",
      modes: [template.renderer],
      optional: Object.fromEntries(tools.map((id) => [id, { default: false }])),
      slots: {
        physics: { required: false },
        ui: { required: false, default: "@spawnkit/html-ui" },
        simulation: { required: true, default: "@spawnkit/plain" },
        telemetry: { required: false }
      }
    })
  ),
  addons,
  presets: [
    definePreset({
      id: "phaser-arcade",
      title: "Phaser Arcade Physics starter",
      answers: { template: "phaser", slots: { physics: "@spawnkit/arcade" } }
    }),
    definePreset({
      id: "three-rapier",
      title: "Three.js and Rapier 3D starter",
      answers: { template: "three", slots: { physics: "@spawnkit/rapier3d" } }
    })
  ]
})
