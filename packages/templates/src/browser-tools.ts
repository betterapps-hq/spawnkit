/** Standalone runner shared by both browser-testing add-ons. */
export const browserToolsSource = String.raw`import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL("../", import.meta.url))
const [action, ...args] = process.argv.slice(2)
if (!["install", "e2e", "test"].includes(action)) {
  console.error("Use pnpm test:setup, pnpm e2e, or pnpm test.")
  process.exit(1)
}
function run(packageName, args) {
  const manifest = require.resolve(packageName + "/package.json")
  const { bin } = require(manifest)
  const executable = resolve(dirname(manifest), typeof bin === "string" ? bin : bin[packageName])
  const result = spawnSync(process.execPath, [executable, ...args], {
    cwd: root, stdio: "inherit", windowsHide: true
  })
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error.message)
    return result.status ?? 1
  }
  return 0
}
if (action === "install" || (!process.env.CI && process.env.SPAWN_SKIP_BROWSER_INSTALL !== "1")) {
  console.log("Preparing Chromium for this project's Playwright version (cached browsers are reused).")
  const status = run("playwright", ["install", "chromium", ...(action === "install" ? args : [])])
  if (status !== 0) {
    console.error("Browser setup failed; tests did not start. Check the network/proxy and retry pnpm test:setup. On a supported Linux machine, pnpm test:setup --with-deps also installs required system libraries.")
    process.exit(status)
  }
}
if (action === "install") process.exit(0)
if (process.env.CI) console.log("CI uses explicit browser setup: run pnpm test:setup --with-deps before tests.")
process.exit(action === "e2e"
  ? run("playwright", ["test", ...args])
  : run("vitest", ["run", "--coverage", ...args]))
`
