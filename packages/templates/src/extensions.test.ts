import { expect, it } from "vitest"
import { physicsOptions, uiOptions, templates } from "./catalog"
import { createProjectPlan } from "./index"

const physicsCases = templates.flatMap((renderer) =>
  physicsOptions.map((physics) => ({
    renderer: renderer.id,
    physics: physics.id,
    compatible: (physics.renderers as readonly string[]).includes(renderer.id)
  }))
)
const uiCases = templates.flatMap((renderer) =>
  uiOptions.map((ui) => ({
    renderer: renderer.id,
    ui: ui.id,
    compatible: (ui.renderers as readonly string[]).includes(renderer.id)
  }))
)
it.each(physicsCases.filter((entry) => entry.compatible))("accepts $renderer $physics", ({ renderer, physics }) => {
  expect(createProjectPlan({ name: "world", template: renderer, physics }).modules).toContain(`physics:${physics}`)
})
it.each(physicsCases.filter((entry) => !entry.compatible))("rejects $renderer $physics", ({ renderer, physics }) => {
  expect(() => createProjectPlan({ name: "world", template: renderer, physics })).toThrow("not compatible")
})
it.each(uiCases.filter((entry) => entry.compatible))("accepts $renderer UI $ui", ({ renderer, ui }) => {
  expect(createProjectPlan({ name: "world", template: renderer, ui }).modules).toContain(`ui:${ui}`)
})
it.each(uiCases.filter((entry) => !entry.compatible))("rejects $renderer UI $ui", ({ renderer, ui }) => {
  expect(() => createProjectPlan({ name: "world", template: renderer, ui })).toThrow("not compatible")
})
it("vendors the standalone telemetry package with explicit setup and consent", () => {
  const plan = createProjectPlan({ name: "world", template: "pixi", telemetry: "platform" })
  expect(plan.files["src/telemetry.ts"]).toContain('consent: "denied"')
  expect(plan.files["src/telemetry.ts"]).toContain("setTelemetryConsent")
  expect(plan.files["vendor/spawn-telemetry/dist/index.js"]).toContain("createTelemetry")
  expect(JSON.parse(plan.files["package.json"]!).dependencies["@spawn/telemetry"]).toBe("file:vendor/spawn-telemetry")
  expect(JSON.parse(plan.files["game.config.json"]!).telemetry).toBe("platform")
})
it("enables Sentry only with a developer-provided DSN", () => {
  const plan = createProjectPlan({ name: "world", template: "three", telemetry: "sentry" })
  expect(plan.files[".env.example"]).toContain("VITE_SENTRY_DSN=\n")
  expect(plan.files["src/telemetry.ts"]).toContain("if (dsn)")
  expect(plan.files["src/telemetry.ts"]).toContain("userInfo: false")
})
it("does not add telemetry or deferred frameworks implicitly", () => {
  const plan = createProjectPlan({ name: "world", template: "pixi", ui: "none" })
  expect(plan.files["src/telemetry.ts"]).toBeUndefined()
  expect(plan.files["index.html"]).not.toContain("<header>")
  expect(plan.files["package.json"]).not.toMatch(/react|react-three|bun/)
})

it("adds standalone HTML Storybook without changing the game runtime", () => {
  const plan = createProjectPlan({ name: "story-game", template: "pixi", addons: ["storybook"] })
  const pkg = JSON.parse(plan.files["package.json"]!)
  expect(pkg.scripts.storybook).toBe("node scripts/local.mjs stories")
  expect(pkg.devDependencies["@storybook/html-vite"]).toBe("10.6.2")
  expect(pkg.dependencies.react).toBeUndefined()
  expect(plan.files[".storybook/main.ts"]).toContain("disableTelemetry: true")
  expect(plan.files["src/hud.stories.ts"]).toContain("createScoreDisplay")
})

it("keeps Playwright optional and isolates browser tests from Vitest", () => {
  const plain = createProjectPlan({ name: "plain", template: "pixi" })
  expect(plain.files["playwright.config.ts"]).toBeUndefined()
  const plan = createProjectPlan({ name: "tested", template: "pixi", addons: ["vitest", "playwright"] })
  expect(plan.modules).toContain("playwright")
  const pkg = JSON.parse(plan.files["package.json"]!)
  expect(pkg.devDependencies["@playwright/test"]).toBe("1.64.0")
  expect(pkg.scripts["test:e2e"]).toBe("playwright test")
  expect(plan.files["vitest.config.ts"]).toContain("src/**/*.test.ts")
  expect(plan.files["e2e/game.spec.ts"]).toContain("Collected: 1")
  const withoutHud = createProjectPlan({ name: "headless-hud", template: "three", addons: ["playwright"], ui: "none" })
  expect(withoutHud.files["e2e/game.spec.ts"]).not.toContain("#score")
  expect(withoutHud.files["e2e/game.spec.ts"]).toContain("toBeFocused")
})
