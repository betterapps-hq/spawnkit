import { spawnSync } from "node:child_process"
import { copyFile, mkdir, mkdtemp, readFile, writeFile, unlink } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const root = fileURLToPath(new URL("../", import.meta.url))
await mkdir(join(root, "work"), { recursive: true })
const directory = await mkdtemp(join(root, "work", "templates-"))
const pnpm = process.env.npm_execpath
if (!pnpm) throw new Error("Run through pnpm test:templates")
const log = []
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, timeout: 180_000 })
  log.push(`$ ${command} ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`)
  if (result.error || result.status !== 0) {
    throw new Error(
      `${args.join(" ")} failed: ${result.error?.message ?? ""}\n${result.stdout ?? ""}${result.stderr ?? ""}`
    )
  }
}
function packageCommand(args, cwd) {
  if (/\.[cm]?js$/.test(pnpm)) run(process.execPath, [pnpm, ...args], cwd)
  else run(pnpm, args, cwd)
}

// Copy the bundle away from its package to verify that templates are embedded.
const cli = join(directory, "spawn.mjs")
await copyFile(join(root, "packages/cli/dist/main.mjs"), cli)
const results = []
let browser
try {
  browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
  const renderers = ["pixi", "phaser", "babylon", "three"]
  // Each case's init arguments, before the folder. Every game but pixi-add starts with Vitest, for the coverage gate.
  const cases = [
    { name: "pixi-add", args: ["pixi"], playwright: true, add: true },
    ...renderers.map((renderer) => ({
      name: `${renderer}-koota`,
      args: [renderer, "--simulation", "koota", "--with", "vitest"]
    })),
    ...renderers.map((renderer) => ({
      name: `${renderer}-playwright`,
      args: [renderer, "--with", "vitest,playwright"],
      playwright: true
    })),
    { name: "pixi-playwright-no-ui", args: ["pixi", "--no-ui", "--with", "vitest,playwright"], playwright: true },
    { name: "pixi-storybook", args: ["pixi", "--with", "vitest,storybook"], storybook: true },
    ...renderers.flatMap((renderer) =>
      [false, true].map((ecs) => ({
        name: `${renderer}-${ecs ? "ecs" : "plain"}`,
        args: [renderer, ...(ecs ? ["--simulation", "bitecs"] : []), "--with", "vitest"]
      }))
    ),
    {
      name: "pixi-rapier-ui",
      args: ["pixi", "--simulation", "bitecs", "--physics", "rapier2d", "--ui", "pixi-ui"].concat([
        "--telemetry",
        "platform-telemetry",
        "--with",
        "vitest"
      ])
    },
    {
      name: "phaser-arcade",
      args: ["phaser", "--simulation", "bitecs", "--physics", "arcade", "--telemetry", "sentry", "--with", "vitest"]
    },
    {
      name: "phaser-matter",
      args: ["phaser", "--physics", "matter", "--telemetry", "platform-telemetry", "--with", "vitest"]
    },
    {
      name: "babylon-havok-gui",
      args: ["babylon", "--simulation", "bitecs", "--physics", "havok", "--ui", "babylon-gui"].concat([
        "--telemetry",
        "sentry",
        "--with",
        "vitest"
      ])
    },
    {
      name: "three-rapier",
      args: ["three", "--simulation", "bitecs", "--physics", "rapier3d", "--telemetry", "platform-telemetry"].concat([
        "--with",
        "vitest"
      ])
    },
    { name: "kit-phaser-arcade", args: ["--preset", "phaser-arcade", "--with", "vitest"] },
    { name: "kit-three-rapier", args: ["--preset", "three-rapier", "--with", "vitest"] }
  ]
  for (const { name, args, storybook, playwright, add } of cases.filter(
    (entry) =>
      !process.env.TEMPLATE_CASE || process.env.TEMPLATE_CASE.split(",").some((name) => entry.name.includes(name))
  )) {
    console.log(`Checking ${name}…`)
    // A game without a UI has no header, so there's no score to watch.
    const collects = !args.includes("--no-ui")
    run(process.execPath, [cli, "init", ...args, name, "--json", "--yes"], directory)
    const project = join(directory, name)
    if (add) {
      run(process.execPath, [cli, "add", "vitest", "playwright", "--yes", "--json"], project)
      run(process.execPath, [cli, "add", "vitest", "playwright", "--yes", "--json"], project)
    }
    packageCommand(["install"], project)
    // pnpm may add explicit release-age exceptions on its initial install.
    packageCommand(["install", "--frozen-lockfile"], project)
    run(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import assert from 'node:assert/strict';
      import { getEndpoint } from '@buildkitgg/dev-domains/node';
      assert.equal((await getEndpoint('app', process.cwd())).origin, 'https://${name}.local.spawnkit.games');
    `
      ],
      project
    )
    await mkdir(join(project, ".spawn"), { recursive: true })
    await writeFile(
      join(project, ".spawn/project.json"),
      JSON.stringify({ version: 1, projectId: "local-test", hostname: "template-check.spawnkit.games" })
    )
    run(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import assert from 'node:assert/strict';
      import { getEndpoint } from '@buildkitgg/dev-domains/node';
      assert.equal((await getEndpoint('app', process.cwd())).origin, 'https://local.template-check.spawnkit.games');
    `
      ],
      project
    )
    await unlink(join(project, ".spawn/project.json"))
    if (process.env.CI) packageCommand(["test:setup"], project)
    for (const task of ["lint", "test", "build"]) packageCommand([task], project)
    if (playwright) {
      packageCommand(["e2e"], project)
    }
    if (storybook) packageCommand(["exec", "storybook", "build"], project)
    const dist = join(project, "dist")
    const server = createServer(async (request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname)
        const path = resolve(dist, `.${pathname === "/" ? "/index.html" : pathname}`)
        if (relative(dist, path).startsWith("..")) {
          response.writeHead(403).end()
          return
        }
        const type =
          { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm" }[
            extname(path)
          ] ?? "application/octet-stream"
        response.writeHead(200, { "Content-Type": type }).end(await readFile(path))
      } catch {
        response.writeHead(404).end()
      }
    })
    await new Promise((done) => server.listen(0, "127.0.0.1", done))
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } })
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}`)
      const canvas = page.locator("canvas")
      await canvas.waitFor({ state: "visible" })
      await canvas.focus()
      await page.keyboard.down("ArrowRight")
      if (collects)
        await page.waitForFunction(
          () => /^Collected: [1-9][0-9]*$/.test(document.querySelector("#score")?.textContent ?? ""),
          null,
          {
            timeout: 15_000
          }
        )
      await page.keyboard.up("ArrowRight")
      await page.screenshot({ path: join(directory, `${name}.png`) })
      if (errors.length) throw new Error(errors.join("\n"))
      const summary = JSON.parse(await readFile(join(project, "coverage", "coverage-summary.json"), "utf8")).total
      const coverage = Object.fromEntries(
        ["statements", "branches", "functions", "lines"].map((metric) => [metric, summary[metric].pct])
      )
      results.push({ name, installed: true, built: true, collected: collects, coverage })
      console.log(
        `Passed ${name}: install, lint, 90% coverage gate, production build, ${collects ? "keyboard collection" : "keyboard focus"}.`
      )
    } catch (error) {
      await page.screenshot({ path: join(directory, `${name}-failure.png`) })
      log.push(`Browser errors: ${errors.join("\n")}`)
      throw new Error(`${name}: ${errors.join("\n") || String(error)}`, { cause: error })
    } finally {
      await page.close()
      await new Promise((done) => server.close(done))
    }
  }
} finally {
  await browser?.close()
  await writeFile(join(directory, "checks.log"), log.join("\n"))
  await writeFile(join(directory, "results.json"), JSON.stringify(results, null, 2) + "\n")
  console.log(`Smoke evidence: ${directory}`)
}
