// A pack written out rather than made with definePack, so the package has no dependencies for npm to fetch.
export default {
  extends: { catalog: "@spawn/templates", versions: "^1.0.0" },
  templates: [
    {
      id: "tower",
      title: "Tower defense",
      description: "A PixiJS game that waves of enemies cross",
      // The catalog's Pixi template: its renderer, and its physics, UI, simulation, telemetry and tools questions.
      extends: "pixi",
      required: ["@spawn-fixture/tower/waves"]
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
