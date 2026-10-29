import { describe, expect, it } from "vitest"
import { validateProjectName } from "./catalog"
import { createProjectPlan, resolveModules } from "./index"

describe("module composition", () => {
  it("resolves dependencies once and before dependents", () => {
    expect(resolveModules(["phaser", "vitest", "vitest"]).map((entry) => entry.id)).toEqual([
      "base",
      "phaser",
      "vitest"
    ])
  })
  it("rejects incompatible renderers", () => {
    expect(() => resolveModules(["phaser", "babylon"])).toThrow("cannot be combined")
  })
  it("rejects missing and circular modules", () => {
    expect(() => resolveModules(["unknown"])).toThrow("Unknown")
    expect(() =>
      resolveModules(
        ["a"],
        [
          { id: "a", requires: ["b"], conflicts: [], files: {} },
          { id: "b", requires: ["a"], conflicts: [], files: {} }
        ]
      )
    ).toThrow("Circular")
  })
  it.each(["pixi", "phaser", "babylon", "three"] as const)(
    "creates standalone %s projects with optional tests",
    (template) => {
      const plan = createProjectPlan({ name: "my-game", template, addons: ["vitest"] })
      const pkg = JSON.parse(plan.files["package.json"] ?? "{}")
      expect(pkg.scripts.dev).toBe("dev-domains run app")
      expect(pkg.scripts["dev:doctor"]).toBeUndefined()
      expect(pkg.devDependencies["@buildkitgg/dev-domains"]).toBe("0.1.0")
      expect(pkg.devDependencies.portless).toBeUndefined()
      expect(plan.files["scripts/local.mjs"]).toBeUndefined()
      expect(plan.files["dev-domains.config.mjs"]).toContain('import { defineConfig } from "@buildkitgg/dev-domains"')
      expect(pkg.scripts.test).toBe("node scripts/browser-tools.mjs test")
      expect(Object.keys(pkg.scripts).sort()).toEqual([
        "build",
        "dev",
        "lint",
        "preview",
        "setup",
        "test",
        "test:setup"
      ])
      expect(pkg.devDependencies["@vitest/coverage-v8"]).toBe(pkg.devDependencies.vitest)
      expect(pkg.devDependencies["@vitest/browser-playwright"]).toBe(pkg.devDependencies.vitest)
      expect(plan.files["vitest.config.ts"]).toContain('include:["src/**/*.ts"]')
      expect(plan.files["vitest.config.ts"]).toContain("thresholds:{statements:90,branches:90,functions:90,lines:90}")
      expect(plan.files["src/main.test.ts"]).toContain('await import("./main")')
      expect(plan.files["src/input.test.ts"]).toContain("ArrowLeft")
      expect(pkg.dependencies).not.toHaveProperty("@spawn/templates")
      expect(plan.files["src/score.test.ts"]).toContain("advanceScore")
      expect(JSON.parse(plan.files["game.config.json"] ?? "{}").mode).toBe("single-player")
    }
  )
  it.each(["../escape", "hello world", "<script>", "con", "lpt1", "UPPER", "a".repeat(65)])(
    "rejects unsafe name %s",
    (name) => {
      expect(validateProjectName(name)).toBeDefined()
      expect(() => createProjectPlan({ name, template: "phaser" })).toThrow(validateProjectName(name))
    }
  )
  it("is deterministic", () => {
    expect(createProjectPlan({ name: "world", template: "babylon" })).toEqual(
      createProjectPlan({ name: "world", template: "babylon" })
    )
  })
  it.each(["pixi", "phaser", "babylon", "three"] as const)("wires bitECS into %s movement", (template) => {
    const plan = createProjectPlan({ name: "ecs-game", template, addons: ["bitecs", "vitest"] })
    expect(plan.modules).not.toContain("movement")
    expect(plan.files["src/main.ts"]).toContain('from "./simulation"')
    expect(plan.files["src/simulation.ts"]).toContain('from "bitecs"')
    expect(plan.files["src/simulation.test.ts"]).toContain("keeps worlds independent")
  })
})

it.each(["pixi", "phaser", "babylon", "three"] as const)("composes Koota with %s", (template) => {
  const plan = createProjectPlan({ name: "koota-game", template, addons: ["koota", "vitest"] })
  expect(plan.modules).not.toContain("movement")
  expect(JSON.parse(plan.files["package.json"] ?? "{}").dependencies.koota).toBe("0.6.6")
  expect(plan.files["src/simulation.ts"]).toContain('from "koota"')
  expect(() => createProjectPlan({ name: "conflict", template, addons: ["koota", "bitecs"] })).toThrow(
    "cannot be combined"
  )
})
