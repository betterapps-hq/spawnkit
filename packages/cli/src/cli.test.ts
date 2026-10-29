import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { runCli } from "./cli"
import { isProjectCommand } from "./project-commands"

let directory: string
let output: string
const write = (text: string) => {
  output += text
}
const json = () => JSON.parse(output) as { status: string; error?: { code: string; message: string } }
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
    expect(output).toContain("--preset     phaser-arcade, three-rapier")
    expect(output).toContain("spawn login --site")
  })
  it("describes a project command's options", async () => {
    await runCli(["init", "--help"], directory, write)
    expect(output).toContain("Usage: spawn init [template] [folder] [options]")
    expect(output).toContain("--physics <value>")
    expect(output).toContain("--dry-run")
  })
})
