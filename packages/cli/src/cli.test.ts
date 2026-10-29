import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, relative, resolve } from "node:path"
import { gameAnswers, initArgv, kitAnswers, kitArgv, kitProjectName } from "@spawn/templates/answers"
import { starterKits } from "@spawn/templates/kits"
import { gameFiles } from "@spawn/templates/scaffold"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { runCli } from "./cli"
import { isProjectCommand } from "./project-commands"

let directory: string
let output: string
const write = (text: string) => {
  output += text
}
const json = () => JSON.parse(output) as { status: string; error?: { code: string; message: string } }
/** Every file under a folder, keyed by its path from that folder. */
async function readTree(root: string): Promise<Record<string, string>> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name))
  return Object.fromEntries(
    await Promise.all(
      files.map(async (path) => [relative(root, path).replaceAll("\\", "/"), await readFile(path, "utf8")] as const)
    )
  )
}
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "spawn-cli-"))
  output = ""
})
afterEach(async () => {
  process.exitCode = 0
  if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("spawn-cli-")) {
    throw new Error("Refusing to remove a directory outside the test fixture scope")
  }
  await rm(directory, { recursive: true, force: true })
})

describe("project commands", () => {
  it.each(["catalog", "templates", "addons"])("lists the catalog as JSON with spawn %s", async (command) => {
    await runCli([command, "--json"], directory, write)
    expect(
      (JSON.parse(output) as { templates: { template: string }[] }).templates.map((entry) => entry.template)
    ).toEqual(["pixi", "phaser", "babylon", "three"])
  })
  it("plans without writing anything", async () => {
    await runCli(["init", "pixi", "demo", "--dry-run", "--json"], directory, write)
    expect(json().status).toBe("planned")
    expect(await readdir(directory)).toEqual([])
  })
  it("creates a game with the add-ons it was asked for", async () => {
    await runCli(
      ["init", "babylon", "demo", "--physics", "havok", "--with", "vitest", "--yes", "--json"],
      directory,
      write
    )
    expect(json().status).toBe("applied")
    const pkg = JSON.parse(await readFile(join(directory, "demo/package.json"), "utf8"))
    expect(pkg.name).toBe("demo")
    expect(pkg.dependencies).toMatchObject({
      "@babylonjs/core": expect.any(String),
      "@babylonjs/havok": expect.any(String)
    })
    expect(pkg.devDependencies.vitest).toBeDefined()
    expect(await readdir(join(directory, "demo"))).toEqual(expect.arrayContaining(["spawn.jsonc", ".spawn"]))
  })
  it("adds an add-on to a game it created", async () => {
    await runCli(["init", "pixi", "demo", "--yes", "--json"], directory, write)
    output = ""
    await runCli(["add", "sentry", "--yes", "--json"], join(directory, "demo"), write)
    expect(json().status).toBe("applied")
    const pkg = JSON.parse(await readFile(join(directory, "demo/package.json"), "utf8"))
    expect(pkg.dependencies["@sentry/browser"]).toBeDefined()
  })
  it("refuses a folder that isn't empty, and keeps its files", async () => {
    await writeFile(join(directory, "keep.txt"), "important")
    await runCli(["init", "pixi", ".", "--name", "demo", "--yes", "--json"], directory, write)
    expect(json().error?.code).toBe("E_DESTINATION")
    expect(process.exitCode).toBe(2)
    expect(await readFile(join(directory, "keep.txt"), "utf8")).toBe("important")
  })
  it.each([
    { args: ["init", "three", "demo", "--physics", "havok"], code: "E_UNSUPPORTED" },
    { args: ["init", "pixi", "demo", "--physics", "colyseus"], code: "E_UNKNOWN_ADDON" },
    { args: ["init", "pixi"], code: "E_USAGE" },
    { args: ["init", "pixi", "demo", "--unknown"], code: "E_USAGE" }
  ])("rejects $args without writing", async ({ args, code }) => {
    await runCli([...args, "--json"], directory, write)
    expect(json().error?.code).toBe(code)
    expect(process.exitCode).toBe(2)
    expect(await readdir(directory)).toEqual([])
  })
  // The dashboard plans in memory. These check that what it shows and downloads is exactly what the command writes.
  it.each(starterKits.map((kit) => kit.id))("writes the %s kit download with spawn init --preset", async (id) => {
    const kit = starterKits.find((entry) => entry.id === id)!
    await runCli([...kitArgv(kit), "--yes", "--json"], directory, write)
    expect(json().status).toBe("applied")
    const written = await readTree(join(directory, kitProjectName(kit)))
    expect(written).toEqual(await gameFiles({ ...kitAnswers(kit), name: kitProjectName(kit) }))
  })
  it("writes the composer's game with the command the composer shows", async () => {
    const answers = gameAnswers({
      name: "moon-jump",
      template: "phaser",
      physics: "matter",
      telemetry: "platform",
      addons: ["storybook", "koota", "playwright"]
    })
    await runCli([...initArgv(answers), "--yes", "--json"], directory, write)
    expect(json().status).toBe("applied")
    expect(await readTree(join(directory, "moon-jump"))).toEqual(await gameFiles(answers))
  })
  it("never prompts without a terminal", async () => {
    await runCli(["init", "pixi", "demo"], directory, write)
    expect(output).toContain("--yes")
    expect(await readdir(directory)).toEqual([])
  })
})

describe("routing", () => {
  it("keeps spawn status <deployment-id> a deploy command", async () => {
    await mkdir(join(directory, "src"))
    expect(isProjectCommand(["status"], directory)).toBe(true)
    expect(isProjectCommand(["status", "src"], directory)).toBe(true)
    expect(isProjectCommand(["status", "src/game.ts"], directory)).toBe(true)
    expect(isProjectCommand(["status", "dep_123"], directory)).toBe(false)
    expect(isProjectCommand(["deploy"], directory)).toBe(false)
  })
  it.each([["not-a-command"], ["project", "show"]])("rejects the unknown command %s", async (...args) => {
    await expect(runCli(args, directory, write)).rejects.toThrow("Unknown command")
    expect(await readdir(directory)).toEqual([])
  })
})

describe("help", () => {
  it("lists templates, slots, tools and kits from the catalog", async () => {
    await runCli(["--help"], directory, write)
    expect(output).toContain("Templates: pixi, phaser, babylon, three")
    expect(output).toMatch(/--physics +rapier2d/)
    expect(output).toContain("--preset     pixi, phaser, babylon, three, phaser-arcade, three-rapier")
    expect(output).toContain("spawn login --site")
  })
  it("describes a project command's options", async () => {
    await runCli(["init", "--help"], directory, write)
    expect(output).toContain("Usage: spawn init [template] [folder] [options]")
    expect(output).toContain("--physics <value>")
    expect(output).toContain("--dry-run")
  })
})
