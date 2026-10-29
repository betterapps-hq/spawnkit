import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, it } from "vitest"
import { browserToolsSource } from "./browser-tools"
import { gameFiles } from "./scaffold"

async function exercise(args: string[], env: Record<string, string> = {}) {
  const directory = await mkdtemp(join(tmpdir(), "spawn-browser-tools-"))
  try {
    await mkdir(join(directory, "scripts"))
    await writeFile(join(directory, "scripts/browser-tools.mjs"), browserToolsSource)
    for (const name of ["playwright", "vitest"]) {
      const packageDir = join(directory, "node_modules", name)
      await mkdir(packageDir, { recursive: true })
      await writeFile(
        join(packageDir, "package.json"),
        JSON.stringify({
          type: "module",
          exports: { "./package.json": "./package.json" },
          bin: { [name]: "runner.mjs" }
        })
      )
      await writeFile(
        join(packageDir, "runner.mjs"),
        `import { appendFileSync } from 'node:fs'; appendFileSync('calls.jsonl', JSON.stringify({tool:${JSON.stringify(name)},args:process.argv.slice(2)})+'\\n'); if (process.argv[2]==='install' && process.env.FAIL_INSTALL==='1') process.exit(7);`
      )
    }
    const result = spawnSync(process.execPath, [join(directory, "scripts/browser-tools.mjs"), ...args], {
      cwd: tmpdir(),
      encoding: "utf8",
      env: { ...process.env, CI: "", SPAWN_SKIP_BROWSER_INSTALL: "", ...env }
    })
    const calls = (await readFile(join(directory, "calls.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
    return { status: result.status, output: result.stdout + result.stderr, calls }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

it("prepares the project's Chromium before E2E and forwards UI/filter arguments", async () => {
  const result = await exercise(["e2e", "--ui", "--grep", "collect"])
  expect(result.status).toBe(0)
  expect(result.calls).toEqual([
    { tool: "playwright", args: ["install", "chromium"] },
    { tool: "playwright", args: ["test", "--ui", "--grep", "collect"] }
  ])
})
it("does not run tests after a browser installation failure", async () => {
  const result = await exercise(["e2e"], { FAIL_INSTALL: "1" })
  expect(result.status).toBe(7)
  expect(result.calls).toHaveLength(1)
  expect(result.output).toContain("tests did not start")
})
it("keeps CI browser provisioning explicit and supports installation of system dependencies", async () => {
  const result = await exercise(["e2e"], { CI: "true" })
  expect(result.calls).toEqual([{ tool: "playwright", args: ["test"] }])
  const setup = await exercise(["install", "--with-deps"], { CI: "true" })
  expect(setup.calls).toEqual([{ tool: "playwright", args: ["install", "chromium", "--with-deps"] }])
})
it("prepares Vitest's browser too, and allows an explicitly provisioned offline environment", async () => {
  const result = await exercise(["test"])
  expect(result.calls).toEqual([
    { tool: "playwright", args: ["install", "chromium"] },
    { tool: "vitest", args: ["run", "--coverage"] }
  ])
  const offline = await exercise(["test"], { SPAWN_SKIP_BROWSER_INSTALL: "1" })
  expect(offline.calls).toEqual([{ tool: "vitest", args: ["run", "--coverage"] }])
})
it("composes testing add-ons together without adding browser setup to a plain kit", async () => {
  const both = await gameFiles({
    name: "test-game",
    template: "phaser",
    optional: ["@spawnkit/vitest", "@spawnkit/playwright"]
  })
  const scripts = JSON.parse(both["package.json"]!).scripts
  expect(scripts["e2e:ui"]).toBe("node scripts/browser-tools.mjs e2e --ui")
  expect(scripts.setup).toContain("dev-domains setup")
  expect(both["scripts/browser-tools.mjs"]).toBe(browserToolsSource)
  const plain = await gameFiles({ name: "plain-game", template: "phaser" })
  expect(plain["scripts/browser-tools.mjs"]).toBeUndefined()
  expect(JSON.parse(plain["package.json"]!).scripts.postinstall).toBeUndefined()
})
