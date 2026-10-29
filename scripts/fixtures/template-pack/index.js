// A pack written out rather than made with definePack, so the package has no dependencies for npm to fetch.
const tools = ["@spawnkit/vitest", "@spawnkit/playwright", "@spawnkit/storybook"]

export default {
  extends: { catalog: "@spawn/templates", versions: "^1.0.0" },
  templates: [
    {
      id: "tower",
      title: "Tower defense",
      description: "A PixiJS game that waves of enemies cross",
      target: "spawnkit",
      modes: ["pixi"],
      required: ["@spawn-fixture/tower/waves"],
      optional: Object.fromEntries(tools.map((id) => [id, { default: false }])),
      slots: {
        physics: { required: false },
        ui: { required: false, default: "@spawnkit/html-ui" },
        simulation: { required: true, default: "@spawnkit/plain" },
        telemetry: { required: false }
      }
    }
  ],
  addons: [
    {
      id: "@spawn-fixture/tower/waves",
      version: "1.0.0",
      title: "Waves",
      description: "How the waves are planned",
      contribute: () => [
        {
          kind: "file",
          path: "docs/waves.md",
          content: "# Waves\n\nThis file comes from the fixture template package.\n",
          ownership: "seed"
        }
      ]
    }
  ]
}
