import { spawnSync } from "node:child_process"
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
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
  const cases = [
    { name: "pixi-add", renderer: "pixi", ecs: false, flags: [], playwright: true, add: true },
    ...["pixi", "phaser", "babylon", "three"].map((renderer) => ({
      name: `${renderer}-koota`,
      renderer,
      ecs: false,
      flags: ["--with", "koota,vitest"]
    })),
    ...["pixi", "phaser", "babylon", "three"].map((renderer) => ({
      name: `${renderer}-playwright`,
      renderer,
      ecs: false,
      flags: [],
      playwright: true
    })),
    { name: "pixi-playwright-no-ui", renderer: "pixi", ecs: false, flags: ["--ui", "none"], playwright: true },
    { name: "pixi-storybook", renderer: "pixi", ecs: false, flags: [], storybook: true },
    ...["pixi", "phaser", "babylon", "three"].flatMap((renderer) =>
      [false, true].map((ecs) => ({ renderer, ecs, name: `${renderer}-${ecs ? "ecs" : "plain"}`, flags: [] }))
    ),
    {
      name: "pixi-rapier-ui",
      renderer: "pixi",
      ecs: true,
      flags: ["--physics", "rapier2d", "--ui", "pixi", "--telemetry", "platform"]
    },
    { name: "phaser-arcade", renderer: "phaser", ecs: true, flags: ["--physics", "arcade", "--telemetry", "sentry"] },
    {
      name: "phaser-matter",
      renderer: "phaser",
      ecs: false,
      flags: ["--physics", "matter", "--telemetry", "platform"]
    },
    {
      name: "babylon-havok-gui",
      renderer: "babylon",
      ecs: true,
      flags: ["--physics", "havok", "--ui", "babylon", "--telemetry", "sentry"]
    },
    { name: "three-rapier", renderer: "three", ecs: true, flags: ["--physics", "rapier3d", "--telemetry", "platform"] }
  ]
  for (const { renderer, ecs, name, flags, storybook, playwright, add } of cases.filter(
    (entry) =>
      !process.env.TEMPLATE_CASE || process.env.TEMPLATE_CASE.split(",").some((name) => entry.name.includes(name))
  )) {
    console.log(`Checking ${name}…`)
    run(
      process.execPath,
      [
        cli,
        "init",
        name,
        "--template",
        renderer,
        ...(add
          ? []
          : [
              "--with",
              playwright ? "vitest,playwright" : storybook ? "vitest,storybook" : ecs ? "bitecs,vitest" : "vitest"
            ]),
        ...flags,
        "--json"
      ],
      directory
    )
    const project = join(directory, name)
    if (add) {
      run(process.execPath, [cli, "add", "vitest", "playwright", "--yes", "--json"], project)
      run(process.execPath, [cli, "add", "vitest", "playwright", "--yes", "--json"], project)
    }
    packageCommand(["install"], project)
    // pnpm may add explicit release-age exceptions on its initial install.
    packageCommand(["install", "--frozen-lockfile"], project)
    for (const task of ["lint", "test", "build"]) packageCommand([task], project)
    if (playwright) {
      packageCommand(["exec", "playwright", "install", "chromium"], project)
      packageCommand(["test:e2e"], project)
    }
    if (storybook) packageCommand(["build:storybook"], project)
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
      if (!flags.includes("none"))
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
      results.push({ name, installed: true, built: true, collected: !flags.includes("none"), coverage })
      console.log(
        `Passed ${name}: install, lint, 90% coverage gate, production build, ${flags.includes("none") ? "keyboard focus" : "keyboard collection"}.`
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
