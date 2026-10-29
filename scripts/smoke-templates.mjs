import { spawn } from "node:child_process"
import { copyFile, mkdir, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { availableParallelism } from "node:os"
import { extname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { findAddon, lockPath } from "@buildkitgg/scaffolder"
import { chromium } from "@playwright/test"
import { catalog, settings } from "@spawn/templates/scaffold"
import { selectCases, templateCases } from "./template-cases.mjs"

// pnpm test:templates [--matrix sample|pairwise|all] [--all] [--case <filter>,...] [--shard <index>/<count>] [--jobs <count>]
//   [--list] [--out <folder>]
// Generates games through the bundled CLI, then installs, lints, tests, builds and plays each one. The cases are each kit,
// the flows and generated games: by default a sample of the engine's pairwise set, --matrix pairwise for all of it, or
// --matrix all (--all) for every combination. A filter matches a case's name or command. TEMPLATE_MATRIX, TEMPLATE_CASE,
// TEMPLATE_SHARD and TEMPLATE_JOBS do the same from the environment.
const root = fileURLToPath(new URL("../", import.meta.url))
const { values: flags } = parseArgs({
  options: {
    matrix: { type: "string", default: process.env.TEMPLATE_MATRIX ?? "sample" },
    all: { type: "boolean", default: false },
    case: { type: "string", multiple: true, default: [] },
    shard: { type: "string" },
    jobs: { type: "string" },
    list: { type: "boolean", default: false },
    out: { type: "string", default: join(root, "work") }
  }
})
const filters = [...flags.case, process.env.TEMPLATE_CASE ?? ""]
  .flatMap((entry) => entry.split(","))
  .map((entry) => entry.trim())
  .filter(Boolean)
const shard = flags.shard ?? process.env.TEMPLATE_SHARD
// Each case runs a real install and build, so two at a time is plenty.
const jobs = Number(
  flags.jobs ?? process.env.TEMPLATE_JOBS ?? Math.max(1, Math.min(2, Math.floor(availableParallelism() / 2)))
)
if (!Number.isInteger(jobs) || jobs < 1) throw new Error("--jobs takes a whole number of at least 1")
// A game's e2e tests serve it on a fixed loopback port, so one case at a time runs them.
let e2eTurn = Promise.resolve()
const oneAtATime = (task) => {
  const turn = e2eTurn.then(task)
  e2eTurn = turn.catch(() => {})
  return turn
}

const { cases, rejected } = await templateCases({ matrix: flags.all ? "all" : flags.matrix })
const selected = selectCases(cases, { filters, shard })
if (selected.length === 0) throw new Error(`No template case matches ${[...filters, shard].filter(Boolean).join(", ")}`)
const kinds = Object.entries(Object.groupBy(selected, (entry) => entry.kind))
  .map(([kind, entries]) => `${kind} ${entries.length}`)
  .join(", ")
const command = (entry) => [entry.argv, ...entry.after].map((argv) => `spawn ${argv.join(" ")}`).join(" && ")
for (const entry of rejected) console.log(`Skipping spawn ${entry.argv.join(" ")}: ${entry.reason}`)

if (flags.list) {
  for (const entry of selected) console.log(`${entry.name.padEnd(20)} ${command(entry)}`)
  console.log(`${selected.length} of ${cases.length} template cases: ${kinds}.`)
} else {
  const pnpm = process.env.npm_execpath
  if (!pnpm) throw new Error("Run through pnpm test:templates")
  await mkdir(flags.out, { recursive: true })
  const directory = await mkdtemp(join(resolve(flags.out), "templates-"))
  // Copy the bundle away from its package to verify that templates are embedded.
  const cli = join(directory, "spawn.mjs")
  await copyFile(join(root, "packages/cli/dist/main.mjs"), cli)
  const workers = Math.min(jobs, selected.length)
  console.log(
    `Checking ${selected.length} of ${cases.length} template cases (${kinds})${shard ? `, shard ${shard}` : ""}, ${workers} at a time.`
  )
  const started = performance.now()
  const results = []
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
  try {
    const queue = [...selected]
    await Promise.all(
      Array.from({ length: workers }, async () => {
        for (let entry = queue.shift(); entry; entry = queue.shift()) {
          results.push(await check(entry, { directory, cli, pnpm, browser }))
        }
      })
    )
  } finally {
    await browser.close()
    results.sort((left, right) => selected.indexOf(left.entry) - selected.indexOf(right.entry))
    await writeFile(
      join(directory, "results.json"),
      JSON.stringify(
        results.map(({ entry, error, ...result }) => ({
          name: entry.name,
          command: command(entry),
          ...result,
          ...(error ? { error: error.message } : {})
        })),
        null,
        2
      ) + "\n"
    )
  }
  const failed = results.filter((result) => result.error)
  for (const { entry, error } of failed) {
    // The failing step, then the end of its output.
    const [step, ...output] = error.message.split("\n")
    console.log(`\n${entry.name}: ${command(entry)}\n${[step, ...output.slice(-60)].join("\n")}`)
  }
  console.log(
    `\n${results.length - failed.length} of ${results.length} template cases passed in ${seconds(started)}s. Smoke evidence: ${directory}`
  )
  if (failed.length) process.exitCode = 1
}

function seconds(since) {
  return Math.round((performance.now() - since) / 1000)
}

/** Code that runs in a game and checks the origin dev-domains gives its app. */
function originCheck(expected) {
  return `
    import assert from "node:assert/strict"
    import { getEndpoint } from "@buildkitgg/dev-domains/node"
    assert.equal((await getEndpoint("app", process.cwd())).origin, ${JSON.stringify(expected)})
  `
}

/** Runs a command and resolves with its output. Its errors start with `label` and include the output. */
function run(label, executable, args, cwd, log) {
  return new Promise((done, fail) => {
    const child = spawn(executable, args, { cwd, windowsHide: true })
    let output = ""
    let timedOut = false
    child.stdout.setEncoding("utf8").on("data", (chunk) => (output += chunk))
    child.stderr.setEncoding("utf8").on("data", (chunk) => (output += chunk))
    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, 180_000)
    child.on("error", (error) => {
      clearTimeout(timer)
      fail(new Error(`${label} failed: ${error.message}`))
    })
    child.on("close", (status) => {
      clearTimeout(timer)
      log.push(`$ ${label}\n${output}`)
      if (status === 0 && !timedOut) done(output)
      else fail(new Error(`${label} ${timedOut ? "timed out" : "failed"}:\n${output}`))
    })
  })
}

/** Generates one case through the CLI, then installs, lints, tests, builds and plays it. */
async function check(entry, { directory, cli, pnpm, browser }) {
  const { name } = entry
  const project = join(directory, name)
  const log = []
  const started = performance.now()
  const spawnkit = (argv, cwd) =>
    run(`spawn ${argv.join(" ")}`, process.execPath, [cli, ...argv, "--json", "--yes"], cwd, log)
  const packageCommand = (args) =>
    /\.[cm]?js$/.test(pnpm)
      ? run(`pnpm ${args.join(" ")}`, process.execPath, [pnpm, ...args], project, log)
      : run(`pnpm ${args.join(" ")}`, pnpm, args, project, log)
  const origin = (expected) =>
    run(
      `Local origin ${expected}`,
      process.execPath,
      ["--input-type=module", "-e", originCheck(expected)],
      project,
      log
    )
  console.log(`Checking ${name}: ${command(entry)}`)
  const steps = ["install"]
  try {
    await spawnkit(entry.argv, directory)
    for (const argv of entry.after) await spawnkit(argv, project)
    await packageCommand(["install"])
    // pnpm may add explicit release-age exceptions on its initial install.
    await packageCommand(["install", "--frozen-lockfile"])
    await origin(`https://${name}.local.spawnkit.games`)
    await mkdir(join(project, ".spawn"), { recursive: true })
    await writeFile(
      join(project, ".spawn/project.json"),
      JSON.stringify({ version: 1, projectId: "local-test", hostname: "template-check.spawnkit.games" })
    )
    await origin("https://local.template-check.spawnkit.games")
    await unlink(join(project, ".spawn/project.json"))
    // The checks follow what the game has: its scripts, and a UI that shows the score.
    const { scripts = {}, devDependencies = {} } = JSON.parse(await readFile(join(project, "package.json"), "utf8"))
    const lock = JSON.parse(await readFile(join(project, lockPath(settings)), "utf8"))
    const collects = Object.keys(lock.addons).some((id) => findAddon(catalog, id)?.slot === "ui")
    if (process.env.CI && scripts["test:setup"]) await packageCommand(["test:setup"])
    await packageCommand(["lint"])
    steps.push("lint")
    if (scripts.test) {
      await packageCommand(["test"])
      steps.push("90% coverage gate")
    }
    await packageCommand(["build"])
    steps.push("type check and production build")
    if (scripts.e2e) {
      await oneAtATime(() => packageCommand(["e2e"]))
      steps.push("e2e")
    }
    if (devDependencies.storybook) {
      await packageCommand(["exec", "storybook", "build"])
      steps.push("Storybook build")
    }
    await play(name, project, directory, browser, collects)
    steps.push(collects ? "keyboard collection" : "keyboard focus")
    const coverage = scripts.test
      ? JSON.parse(await readFile(join(project, "coverage", "coverage-summary.json"), "utf8")).total
      : undefined
    console.log(`Passed ${name} in ${seconds(started)}s: ${steps.join(", ")}.`)
    return {
      entry,
      seconds: seconds(started),
      collected: collects,
      ...(coverage
        ? {
            coverage: Object.fromEntries(
              ["statements", "branches", "functions", "lines"].map((metric) => [metric, coverage[metric].pct])
            )
          }
        : {})
    }
  } catch (error) {
    console.log(`Failed ${name} in ${seconds(started)}s: ${error.message.split("\n")[0]}`)
    return { entry, seconds: seconds(started), error }
  } finally {
    await writeFile(join(directory, `${name}.log`), log.join("\n"))
  }
}

/** Serves the production build and moves the player with the keyboard until it collects an item. */
async function play(name, project, directory, browser, collects) {
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
    // A game without a UI has no header, so there's no score to watch.
    if (collects)
      await page.waitForFunction(
        () => /^Collected: [1-9][0-9]*$/.test(document.querySelector("#score")?.textContent ?? ""),
        null,
        { timeout: 15_000 }
      )
    await page.keyboard.up("ArrowRight")
    await page.screenshot({ path: join(directory, `${name}.png`) })
    if (errors.length) throw new Error(errors.join("\n"))
  } catch (error) {
    await page.screenshot({ path: join(directory, `${name}-failure.png`) })
    throw new Error(`Browser check: ${errors.join("\n") || String(error)}`, { cause: error })
  } finally {
    await page.close()
    await new Promise((done) => server.close(done))
  }
}
