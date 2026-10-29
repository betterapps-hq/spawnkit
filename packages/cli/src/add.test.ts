import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { createProjectPlan } from "@spawn/templates"
import { afterEach, beforeEach, expect, it } from "vitest"
import { addModules, formatAddition } from "./add"
import { scaffoldProject } from "./scaffold"

let root: string
let project: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "spawn-add-"))
  project = join(root, "game")
  await scaffoldProject(createProjectPlan({ name: "game", template: "pixi" }), project)
})
afterEach(async () => {
  if (dirname(root) !== tmpdir() || !root.includes("spawn-add-")) throw new Error("Unsafe fixture cleanup")
  await rm(root, { recursive: true, force: true })
})
it("previews, applies, and repeats without overwriting custom code or package fields", async () => {
  await writeFile(join(project, "src/main.ts"), "// my game\n")
  const pkg = JSON.parse(await readFile(join(project, "package.json"), "utf8"))
  pkg.scripts.custom = "my-script"
  await writeFile(join(project, "package.json"), JSON.stringify(pkg))
  const preview = await addModules(project, ["vitest", "playwright"], false)
  expect(preview.status).toBe("planned")
  expect(await readdir(join(project, "src"))).not.toContain("simulation.test.ts")
  expect((await addModules(project, ["vitest", "playwright"], true)).status).toBe("updated")
  expect(await readFile(join(project, "src/main.ts"), "utf8")).toBe("// my game\n")
  const updated = JSON.parse(await readFile(join(project, "package.json"), "utf8"))
  expect(updated.scripts.custom).toBe("my-script")
  expect(updated.devDependencies.vitest).toBeDefined()
  expect(updated.devDependencies["@playwright/test"]).toBeDefined()
  expect((await addModules(project, ["vitest", "playwright"], true)).status).toBe("unchanged")
  expect(formatAddition(preview)).toContain("No files changed. Run again with --yes to apply.")
})
it("reports all edited-file and script conflicts without writes", async () => {
  await writeFile(join(project, "README.md"), "My docs")
  const pkg = JSON.parse(await readFile(join(project, "package.json"), "utf8"))
  pkg.scripts.test = "my-tests"
  const content = JSON.stringify(pkg)
  await writeFile(join(project, "package.json"), content)
  const result = await addModules(project, ["vitest"], true)
  expect(result.conflicts).toEqual(expect.arrayContaining(["README.md", "package.json.scripts.test"]))
  expect(result.status).toBe("conflict")
  expect(await readFile(join(project, "package.json"), "utf8")).toBe(content)
  expect(await readdir(join(project, "src"))).not.toContain("simulation.test.ts")
})
it("refuses preexisting new files and incompatible ECS choices", async () => {
  await writeFile(join(project, "src/simulation.test.ts"), "my test")
  expect((await addModules(project, ["vitest"], true)).conflicts).toContain("src/simulation.test.ts")
  await expect(addModules(project, ["bitecs", "koota"], true)).rejects.toThrow("cannot be combined")
})
it("refuses unsupported ownership versions", async () => {
  await writeFile(join(project, ".spawn/state.json"), '{"schemaVersion":99}')
  await expect(addModules(project, ["vitest"], true)).rejects.toThrow("Unsupported SpawnKit ownership record")
})
