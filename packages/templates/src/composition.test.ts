import { expect, it } from "vitest"
import { componentCatalog, resolveComposition, selectedComponents } from "./composition"
import { createProjectPlan, planAddition, type ProjectOptions } from "./index"

const current: ProjectOptions = { name: "game", template: "pixi", addons: ["bitecs"] }
it.each(componentCatalog.filter((entry) => entry.requires.length))(
  "resolves dependencies for $id",
  ({ id, requires }) => {
    const result = resolveComposition("game", [id])
    if (!("plan" in result)) throw new Error("Expected resolved plan")
    expect(result.plan.selected).toEqual(expect.arrayContaining(requires))
    expect(() => createProjectPlan(result.plan.options)).not.toThrow()
  }
)
it("keeps existing options unchanged when an addition is already installed", () => {
  const result = resolveComposition("game", ["bitecs"], current)
  if (!("plan" in result)) throw new Error("Expected resolved plan")
  expect(result.plan.options).toEqual(current)
  expect(result.plan.added).toEqual([])
  expect(result.plan.removed).toEqual([])
})
it("selects among conflicting requests without repeating the same decision", () => {
  const result = resolveComposition("game", ["bitecs", "koota"], current)
  if (!("issue" in result)) throw new Error("Expected decision")
  const choice = result.issue.choices[0]!
  const resolved = resolveComposition("game", choice.requested, current, choice.replace)
  expect(resolved).toHaveProperty("plan")
})
it("resolves competing renderer dependencies as a complete choice", () => {
  const result = resolveComposition("game", ["pixi-ui", "havok"])
  if (!("issue" in result)) throw new Error("Expected decision")
  for (const choice of result.issue.choices) {
    const resolved = resolveComposition("game", choice.requested)
    if (!("plan" in resolved)) throw new Error("Expected resolved choice")
    expect(() => createProjectPlan(resolved.plan.options)).not.toThrow()
  }
})
it("enables empty features without asking to uninstall nothing", () => {
  expect(
    resolveComposition("game", ["rapier2d", "sentry", "koota"], { name: "game", template: "pixi" })
  ).toHaveProperty("plan")
})
it.each([
  { requested: ["unknown"], replace: [], message: "Unknown add-on" },
  { requested: ["rapier"], replace: [], message: "Did you mean" },
  { requested: ["koota"], replace: ["sentry"], message: "not selected" },
  { requested: ["vitest"], replace: ["bitecs"], message: "same category" },
  { requested: ["phaser"], replace: ["pixi"], message: "migration" }
])("rejects invalid replacements: $message", ({ requested, replace, message }) => {
  expect(() => resolveComposition("game", requested, current, replace)).toThrow(message)
})
it("rejects tool removal", () => {
  expect(() => resolveComposition("game", ["playwright"], { ...current, addons: ["vitest"] }, ["vitest"])).toThrow(
    "Tool removal"
  )
})
it("round-trips canonical selections", () => {
  const options: ProjectOptions = {
    name: "game",
    template: "babylon",
    physics: "havok",
    ui: "babylon",
    telemetry: "platform",
    addons: ["koota", "vitest"]
  }
  const result = resolveComposition("game", selectedComponents(options))
  if (!("plan" in result)) throw new Error("Expected resolved plan")
  expect(result.plan.options).toEqual(options)
})
it("plans obsolete files and package removals, refusing edited obsolete files", () => {
  const before = createProjectPlan({ name: "game", template: "pixi", addons: ["playwright"] })
  const target: ProjectOptions = { name: "game", template: "pixi", addons: [] }
  const plan = planAddition(before.files[".spawn/state.json"]!, before.files, [], target)
  expect(plan.changes).toContainEqual({
    path: "playwright.config.ts",
    before: before.files["playwright.config.ts"],
    after: undefined
  })
  expect(plan.packageChanges).toContainEqual({
    section: "devDependencies",
    name: "@playwright/test",
    value: "(remove)"
  })
  const modified = { ...before.files, "playwright.config.ts": "// my configuration" }
  expect(planAddition(before.files[".spawn/state.json"]!, modified, [], target).conflicts).toContain(
    "playwright.config.ts"
  )
})
