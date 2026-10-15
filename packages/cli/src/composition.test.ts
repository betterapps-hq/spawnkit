import { mkdtemp, readFile, writeFile, rm, access } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { createProjectPlan, resolveComposition } from "@spawn/templates"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { addModules } from "./add"
import { runCli } from "./cli"
import type { CompositionPrompts } from "./composition"
import { scaffoldProject } from "./scaffold"

let root: string
let output: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "spawn-composition-"))
  output = ""
})
afterEach(async () => {
  process.exitCode = 0
  if (dirname(root) !== tmpdir() || !root.includes("spawn-composition-")) throw new Error("Unsafe cleanup")
  await rm(root, { recursive: true, force: true })
})
const write = (text: string) => {
  output += text
}
const game = async (addons: ("bitecs" | "koota")[] = []) => {
  const path = join(root, "game")
  await scaffoldProject(createProjectPlan({ name: "game", template: "pixi", addons }), path)
  return path
}

it("infers renderer dependencies and previews repeated and comma-separated add-ons without writing", async () => {
  await runCli(["init", "game", "--add", "rapier2d,pixi-ui", "--add=vitest", "--dry-run", "--json"], root, write)
  const result = JSON.parse(output)
  expect(result.composition.options).toMatchObject({
    template: "pixi",
    physics: "rapier2d",
    ui: "pixi",
    addons: ["vitest"]
  })
  expect(result.composition.required).toEqual([{ id: "pixi", by: "rapier2d" }])
  await expect(access(join(root, "game"))).rejects.toThrow("ENOENT")
})

it("never lets --yes resolve an ambiguous renderer", async () => {
  const choose = vi.fn<CompositionPrompts["choose"]>()
  const confirm = vi.fn<CompositionPrompts["confirm"]>()
  await runCli(["init", "game", "--add", "vitest", "--yes", "--json"], root, write, {
    composition: { choose, confirm }
  })
  expect(JSON.parse(output).status).toBe("needs-decision")
  expect(process.exitCode).toBe(1)
  expect(choose).not.toHaveBeenCalled()
  expect(confirm).not.toHaveBeenCalled()
  await expect(access(join(root, "game"))).rejects.toThrow("ENOENT")
})

it("asks for one final confirmation including automatically required dependencies", async () => {
  const confirm = vi.fn<CompositionPrompts["confirm"]>(async (summary: string) => {
    expect(summary).toContain("Required pixi (needed by rapier2d)")
    expect(summary).toContain("package.json")
    await expect(access(join(root, "game"))).rejects.toThrow("ENOENT")
    return true
  })
  await runCli(["init", "game", "--add", "rapier2d,vitest"], root, write, {
    composition: { choose: vi.fn<CompositionPrompts["choose"]>(), confirm }
  })
  expect(confirm).toHaveBeenCalledOnce()
  expect(output).toContain("Game created")
  expect(JSON.parse(await readFile(join(root, "game/package.json"), "utf8")).devDependencies.vitest).toBeDefined()
})

it("cancels decisions and final confirmation without writing", async () => {
  await runCli(["init", "game", "--add", "pixi,phaser"], root, write, {
    composition: { choose: async () => undefined, confirm: vi.fn<CompositionPrompts["confirm"]>() }
  })
  expect(output).toContain("Cancelled")
  await runCli(["init", "game", "--add", "pixi"], root, write, {
    composition: { choose: vi.fn<CompositionPrompts["choose"]>(), confirm: async () => false }
  })
  await expect(access(join(root, "game"))).rejects.toThrow("ENOENT")
})

it("offers a deliberate ECS replacement and preserves unrelated package fields", async () => {
  const path = await game(["bitecs"])
  const pkg = JSON.parse(await readFile(join(path, "package.json"), "utf8"))
  pkg.scripts.custom = "echo custom"
  await writeFile(join(path, "package.json"), JSON.stringify(pkg))
  const choose = vi.fn<CompositionPrompts["choose"]>(async (issue) => {
    expect(issue.message).toContain("bitecs")
    return 0
  })
  const confirm = vi.fn<CompositionPrompts["confirm"]>(async (summary) => {
    expect(summary).toContain("Replace  bitecs")
    return true
  })
  await runCli(["add", "koota"], path, write, { composition: { choose, confirm } })
  expect(choose).toHaveBeenCalledOnce()
  expect(confirm).toHaveBeenCalledOnce()
  const updated = JSON.parse(await readFile(join(path, "package.json"), "utf8"))
  expect(updated.dependencies.bitecs).toBeUndefined()
  expect(updated.dependencies.koota).toBeDefined()
  expect(updated.scripts.custom).toBe("echo custom")
  output = ""
  await runCli(["add", "koota", "--yes", "--json"], path, write)
  expect(JSON.parse(output).status).toBe("unchanged")
})

it("blocks edited source on replacement and leaves all files unchanged", async () => {
  const path = await game(["bitecs"])
  const original = await readFile(join(path, "package.json"), "utf8")
  await writeFile(join(path, "src/simulation.ts"), "// my game")
  await runCli(["add", "koota", "--replace", "bitecs", "--yes", "--json"], path, write)
  expect(JSON.parse(output).status).toBe("conflict")
  expect(await readFile(join(path, "package.json"), "utf8")).toBe(original)
  expect(await readFile(join(path, "src/simulation.ts"), "utf8")).toBe("// my game")
})

it("rejects changes made while the plan is being reviewed", async () => {
  const path = await game()
  const state = await readFile(join(path, ".spawn/state.json"), "utf8")
  await expect(
    runCli(["add", "vitest"], path, write, {
      composition: {
        choose: vi.fn<CompositionPrompts["choose"]>(),
        confirm: async () => {
          await writeFile(join(path, "README.md"), "Edited during review")
          return true
        }
      }
    })
  ).rejects.toThrow("changed after review")
  expect(await readFile(join(path, ".spawn/state.json"), "utf8")).toBe(state)
  await expect(access(join(path, "vitest.config.ts"))).rejects.toThrow("ENOENT")
})

it("does not offer renderer migration and suggests compatible UI alternatives", () => {
  const result = resolveComposition("game", ["pixi-ui"], { name: "game", template: "phaser" })
  expect(result).toHaveProperty("issue")
  if (!("issue" in result)) throw new Error("Expected conflict")
  expect(result.issue.message).toContain("Renderer migration is not supported")
  expect(result.issue.choices.map((choice) => choice.label)).toContain("Keep phaser; use html-ui")
  expect(() => resolveComposition("game", ["pixi"], { name: "game", template: "phaser" }, ["phaser"])).toThrow(
    "migration"
  )
})

it("safely removes obsolete generated files and blocks edited removals", async () => {
  const path = await game(["bitecs"])
  const options = { name: "game", template: "pixi" as const, addons: [] }
  const preview = await addModules(path, [], false, options)
  // Replacement must remove the old dependency even when no new npm dependency is added.
  expect(preview.packageChanges).toContainEqual({ section: "dependencies", name: "bitecs", value: "(remove)" })
  expect((await addModules(path, [], true, options, preview.fingerprint)).status).toBe("updated")
  expect(JSON.parse(await readFile(join(path, "package.json"), "utf8")).dependencies.bitecs).toBeUndefined()
})

it("keeps Sentry configuration out of plans and generator state", async () => {
  const dsn = "https://public@sentry.example/123"
  await runCli(["init", "game", "--add", "pixi,sentry", "--yes", "--json"], root, write, { sentryDsn: dsn })
  expect(output).not.toContain(dsn)
  expect(await readFile(join(root, "game/.spawn/state.json"), "utf8")).not.toContain(dsn)
  expect(await readFile(join(root, "game/.env"), "utf8")).toContain(dsn)
})
