import { checkCatalog, memoryTree, plan, type Answers, type Intent } from "@buildkitgg/scaffolder"
import { describe, expect, it } from "vitest"
import { validateProjectName } from "../catalog"
import { catalog, gameFiles, planGame, settings } from "./index"

const renderers = ["pixi", "phaser", "babylon", "three"] as const
const json = (text: string | undefined) => JSON.parse(text ?? "{}")
const add = (files: Record<string, string>, intent: Partial<Extract<Intent, { command: "add" }>>) =>
  plan({
    catalog,
    settings,
    request: { intent: { command: "add", addons: [], replace: [], options: {}, ...intent } },
    tree: memoryTree(files)
  })

it("passes the engine's catalog checks, including every pairwise combination", () => {
  expect(checkCatalog(catalog, { matrix: true })).toEqual([])
}, 60000)

describe("new games", () => {
  it.each(renderers)("creates a standalone %s project with optional tests", async (template) => {
    const files = await gameFiles({ name: "my-game", template, optional: ["@spawnkit/vitest"] })
    const pkg = json(files["package.json"])
    expect(pkg.scripts.dev).toBe("dev-domains run app")
    expect(pkg.devDependencies["@buildkitgg/dev-domains"]).toBe("0.1.0")
    expect(pkg.devDependencies.portless).toBeUndefined()
    expect(files["dev-domains.config.mjs"]).toContain('import { defineConfig } from "@buildkitgg/dev-domains"')
    expect(pkg.scripts.test).toBe("node scripts/browser-tools.mjs test")
    expect(Object.keys(pkg.scripts).sort()).toEqual(["build", "dev", "lint", "preview", "setup", "test", "test:setup"])
    expect(pkg.devDependencies["@vitest/coverage-v8"]).toBe(pkg.devDependencies.vitest)
    expect(pkg.devDependencies["@vitest/browser-playwright"]).toBe(pkg.devDependencies.vitest)
    expect(files["vitest.config.ts"]).toContain('include:["src/**/*.ts"]')
    expect(files["vitest.config.ts"]).toContain("thresholds:{statements:90,branches:90,functions:90,lines:90}")
    expect(files["src/main.test.ts"]).toContain('await import("./main")')
    expect(files["src/input.test.ts"]).toContain("ArrowLeft")
    expect(files["src/score.test.ts"]).toContain("advanceScore")
    expect(pkg.dependencies).not.toHaveProperty("@spawn/templates")
    expect(json(files["game.config.json"]).mode).toBe("single-player")
    expect(files["AGENTS.md"]).toContain("Standalone")
    expect(files["spawn.jsonc"]).toContain(`"template": "${template}"`)
    expect(files[".spawn/lock.json"]).toBeDefined()
  })
  it.each(["../escape", "hello world", "<script>", "con", "lpt1", "UPPER", "a".repeat(65)])(
    "rejects the unsafe name %s",
    (name) => {
      expect(validateProjectName(name)).toBeDefined()
    }
  )
  // The engine checks a name's characters. SpawnKit's names are stricter, so the dashboard checks both.
  it.each(["../escape", "hello world", "<script>", "UPPER"])("won't plan a game named %s", async (name) => {
    await expect(planGame({ name, template: "phaser" })).rejects.toThrow("project name")
  })
  it("plans the same files every time", async () => {
    const answers: Answers = { name: "world", template: "babylon" }
    expect(await planGame(answers)).toEqual(await planGame(answers))
  })
  it.each(renderers)("runs %s movement through bitECS or Koota", async (template) => {
    const bitecs = await gameFiles({
      name: "ecs-game",
      template,
      slots: { simulation: "@spawnkit/bitecs" },
      optional: ["@spawnkit/vitest"]
    })
    expect(bitecs["src/main.ts"]).toContain('from "./simulation"')
    expect(bitecs["src/simulation.ts"]).toContain('from "bitecs"')
    expect(bitecs["src/simulation.test.ts"]).toContain("keeps worlds independent")
    const koota = await gameFiles({ name: "koota-game", template, slots: { simulation: "@spawnkit/koota" } })
    expect(json(koota["package.json"]).dependencies.koota).toBe("0.6.6")
    expect(koota["src/simulation.ts"]).toContain('from "koota"')
  })
})

describe("add-ons", () => {
  it("vendors the standalone telemetry package with explicit setup and consent", async () => {
    const files = await gameFiles({
      name: "world",
      template: "pixi",
      slots: { telemetry: "@spawnkit/platform-telemetry" }
    })
    expect(files["src/telemetry.ts"]).toContain('consent: "denied"')
    expect(files["src/telemetry.ts"]).toContain("setTelemetryConsent")
    expect(files["vendor/spawn-telemetry/dist/index.js"]).toContain("createTelemetry")
    expect(json(files["package.json"]).dependencies["@spawn/telemetry"]).toBe("file:vendor/spawn-telemetry")
  })
  it("enables Sentry only with a developer-provided DSN", async () => {
    const files = await gameFiles({ name: "world", template: "three", slots: { telemetry: "@spawnkit/sentry" } })
    expect(files[".env.example"]).toContain("VITE_SENTRY_DSN=\n")
    expect(files["src/telemetry.ts"]).toContain("if (dsn)")
    expect(files["src/telemetry.ts"]).toContain("userInfo: false")
  })
  it("doesn't add telemetry, a UI or deferred frameworks unless asked", async () => {
    const files = await gameFiles({ name: "world", template: "pixi", slots: { ui: null } })
    expect(files["src/telemetry.ts"]).toBeUndefined()
    expect(files["src/ui.ts"]).toBeUndefined()
    expect(files["package.json"]).not.toMatch(/react|react-three|bun/)
  })
  it("adds standalone HTML Storybook without changing the game runtime", async () => {
    const files = await gameFiles({ name: "story-game", template: "pixi", optional: ["@spawnkit/storybook"] })
    const pkg = json(files["package.json"])
    expect(pkg.scripts.storybook).toBe("dev-domains run stories")
    expect(pkg.devDependencies["@storybook/html-vite"]).toBe("10.6.2")
    expect(pkg.dependencies.react).toBeUndefined()
    expect(files[".storybook/main.ts"]).toContain("disableTelemetry: true")
    expect(files["src/hud.stories.ts"]).toContain("createScoreDisplay")
  })
  it("keeps Playwright optional and its browser tests apart from Vitest", async () => {
    expect((await gameFiles({ name: "plain", template: "pixi" }))["playwright.config.ts"]).toBeUndefined()
    const files = await gameFiles({
      name: "tested",
      template: "pixi",
      optional: ["@spawnkit/vitest", "@spawnkit/playwright"]
    })
    const pkg = json(files["package.json"])
    expect(pkg.devDependencies["@playwright/test"]).toBe("1.64.0")
    expect(pkg.scripts.e2e).toBe("node scripts/browser-tools.mjs e2e")
    expect(files["vitest.config.ts"]).toContain("src/**/*.test.ts")
    expect(files["e2e/game.spec.ts"]).toContain("Collected: [1-9][0-9]*")
  })
})

describe("changing a game", () => {
  it("leaves AGENTS.md to its owner, edited or deleted", async () => {
    const files = await gameFiles({ name: "game", template: "pixi", slots: { simulation: "@spawnkit/bitecs" } })
    expect(files["AGENTS.md"]).toContain("Standalone PixiJS")
    const { "AGENTS.md": _, ...deleted } = files
    for (const tree of [deleted, { ...files, "AGENTS.md": "My own project instructions\n" }]) {
      const result = await add(tree, { addons: ["vitest"] })
      expect(result.status).toBe("planned")
      expect(result.operations.some((operation) => operation.path === "AGENTS.md")).toBe(false)
    }
  })
  it("asks before replacing an add-on in a slot, and each choice plans", async () => {
    const files = await gameFiles({ name: "game", template: "pixi", slots: { simulation: "@spawnkit/bitecs" } })
    const result = await add(files, { addons: ["koota"] })
    expect(result.status).toBe("needs-decision")
    const [choice] = result.decisions[0]!.choices
    const replaced = await plan({ catalog, settings, request: choice!.request, tree: memoryTree(files) })
    expect(replaced.status).toBe("planned")
    const pkg = json(replaced.operations.find((operation) => operation.path === "package.json")!.content)
    expect(pkg.dependencies.koota).toBeDefined()
    expect(pkg.dependencies.bitecs).toBeUndefined()
  })
  it("refuses an add-on for another renderer", async () => {
    const files = await gameFiles({ name: "game", template: "pixi" })
    const result = await add(files, { addons: ["rapier3d"] })
    expect(result.error).toMatchObject({ code: "E_UNSUPPORTED" })
  })
})
