import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { createProjectPlan } from "@spawn/templates"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { runCli } from "./cli"
import { scaffoldProject } from "./scaffold"

let directory: string
let output: string
const write = (text: string) => {
  output += text
}
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "spawn-cli-"))
  output = ""
})
afterEach(async () => {
  if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("spawn-cli-")) {
    throw new Error("Refusing to remove a directory outside the test fixture scope")
  }
  await rm(directory, { recursive: true, force: true })
})

describe("CLI", () => {
  it("lists the shared catalog as JSON", async () => {
    await runCli(["templates", "--json"], directory, write)
    expect(JSON.parse(output).templates.map((entry: { id: string }) => entry.id)).toEqual([
      "pixi",
      "phaser",
      "babylon",
      "three"
    ])
  })
  it("plans without writing anything", async () => {
    await runCli(["init", "demo", "--template", "phaser", "--dry-run", "--json"], directory, write)
    expect(JSON.parse(output).status).toBe("planned")
    expect(await readdir(directory)).toEqual([])
  })
  it("creates a standalone project with composed modules", async () => {
    await runCli(["init", "demo", "--template", "babylon", "--with", "vitest", "--json"], directory, write)
    expect(JSON.parse(output).status).toBe("created")
    const pkg = JSON.parse(await readFile(join(directory, "demo/package.json"), "utf8"))
    expect(pkg.name).toBe("demo")
    expect(pkg.dependencies["@babylonjs/core"]).toBeDefined()
    expect(await readFile(join(directory, "demo/src/score.test.ts"), "utf8")).toContain("advanceScore")
  })
  it("refuses an existing destination and preserves content", async () => {
    await writeFile(join(directory, "keep.txt"), "important")
    await expect(runCli(["init", ".", "--name", "demo", "--template", "phaser"], directory, write)).rejects.toThrow(
      "already exists"
    )
    expect(await readFile(join(directory, "keep.txt"), "utf8")).toBe("important")
  })
  it("rejects template traversal before making a directory", async () => {
    const plan = createProjectPlan({ name: "demo", template: "phaser" })
    plan.files["../escape.txt"] = "unsafe"
    await expect(scaffoldProject(plan, join(directory, "demo"))).rejects.toThrow("Unsafe")
    expect(await readdir(directory)).toEqual([])
  })
  it("defaults to PixiJS and composes bitECS", async () => {
    await runCli(["init", "demo", "--with", "bitecs", "--json"], directory, write)
    expect(JSON.parse(output).template).toBe("pixi")
    expect(await readFile(join(directory, "demo/src/simulation.ts"), "utf8")).toContain('from "bitecs"')
  })
  it("rejects incompatible physics before any writes", async () => {
    await expect(
      runCli(["init", "demo", "--template", "three", "--physics", "havok"], directory, write)
    ).rejects.toThrow("not compatible")
    expect(await readdir(directory)).toEqual([])
  })
  it("includes physics, UI, and telemetry in a JSON dry-run", async () => {
    await runCli(
      ["init", "demo", "--physics", "rapier2d", "--ui", "pixi", "--telemetry", "platform", "--dry-run", "--json"],
      directory,
      write
    )
    expect(JSON.parse(output).modules).toEqual(
      expect.arrayContaining(["physics:rapier2d", "ui:pixi", "telemetry:platform"])
    )
    expect(await readdir(directory)).toEqual([])
  })
  it("cleans up its own partial output when a file cannot be written", async () => {
    const plan = createProjectPlan({ name: "demo", template: "pixi" })
    plan.files = { "src/keep.ts": "first", src: "cannot replace a directory" }
    await expect(scaffoldProject(plan, join(directory, "demo"))).rejects.toThrow(/EEXIST|EISDIR|EPERM/)
    expect(await readdir(directory)).toEqual([])
  })
  it.each([
    { args: ["not-a-command"], error: "Unknown command" },
    { args: ["init"], error: "Provide exactly one destination" },
    { args: ["init", "demo", "--template", "colyseus"], error: "Choose a supported template" },
    { args: ["init", "demo", "--template", "phaser", "--with", "unknown"], error: "Unknown add-on" },
    { args: ["init", "demo", "--unknown"], error: "Unknown option" }
  ])("rejects invalid input $args without writing", async ({ args, error }) => {
    await expect(runCli(args, directory, write)).rejects.toThrow(error)
    expect(await readdir(directory)).toEqual([])
  })
})

it("previews the exact package dependencies and scripts that will be generated", async () => {
  await runCli(["init", "demo", "--with", "vitest", "--dry-run", "--json"], directory, write)
  const preview = JSON.parse(output)
  output = ""
  await runCli(["init", "demo", "--with", "vitest", "--json"], directory, write)
  const pkg = JSON.parse(await readFile(join(directory, "demo/package.json"), "utf8"))
  expect(preview.setup.dependencies).toEqual(pkg.dependencies)
  expect(preview.setup.devDependencies).toEqual(pkg.devDependencies)
  expect(preview.setup.scripts).toEqual(pkg.scripts)
  expect(preview.setup.resources).toEqual([])
})
it("rejects existing destinations even during a dry run", async () => {
  await expect(runCli(["init", ".", "--name", "demo", "--dry-run"], directory, write)).rejects.toThrow("already exists")
  expect(await readdir(directory)).toEqual([])
})
it("explains missing destination parents without writing files", async () => {
  await expect(runCli(["init", "missing/demo", "--dry-run"], directory, write)).rejects.toThrow(
    "parent must be an existing directory"
  )
  expect(await readdir(directory)).toEqual([])
})

it("writes the DSN only to ignored local configuration, never output or ownership", async () => {
  const sentryDsn = "https://publickey@sentry.example/123"
  const args = ["init", "sentry-demo", "--telemetry", "sentry", "--json"]
  await runCli([...args, "--dry-run"], directory, write, { sentryDsn })
  expect(await readdir(directory)).toEqual([])
  expect(output).not.toContain(sentryDsn)
  expect(JSON.parse(output).files).toContain(".env")
  output = ""
  await runCli(args, directory, write, { sentryDsn })
  expect(await readFile(join(directory, "sentry-demo/.env"), "utf8")).toBe(`VITE_SENTRY_DSN="${sentryDsn}"\n`)
  expect(await readFile(join(directory, "sentry-demo/.spawn/state.json"), "utf8")).not.toContain(sentryDsn)
  expect(await readFile(join(directory, "sentry-demo/.env.example"), "utf8")).not.toContain(sentryDsn)
  expect(await readFile(join(directory, "sentry-demo/.gitignore"), "utf8")).toContain(".env\n")
  expect(output).not.toContain(sentryDsn)
})
it.each(["sntrys_secret", "https://key:secret@sentry.example/123", "https://key@sentry.example/123\nOTHER=bad"])(
  "rejects tokens and unsafe DSNs without writing",
  async (sentryDsn) => {
    await expect(runCli(["init", "demo", "--telemetry", "sentry"], directory, write, { sentryDsn })).rejects.toThrow(
      "public HTTPS Sentry DSN"
    )
    expect(await readdir(directory)).toEqual([])
  }
)
