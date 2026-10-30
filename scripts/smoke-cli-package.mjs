import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const manager = process.env.npm_execpath
if (!manager) throw new Error("Run with pnpm exec node scripts/smoke-cli-package.mjs")
const directory = await mkdtemp(join(tmpdir(), "spawn-cli-package-"))
function pnpm(args, cwd = directory) {
  const executable = /\.[cm]?js$/.test(manager) ? process.execPath : manager
  const arguments_ = executable === process.execPath ? [manager, ...args] : args
  const result = spawnSync(executable, arguments_, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 180_000
  })
  if (result.error || result.status !== 0)
    throw new Error(`${args.join(" ")} failed: ${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}
const pkg = JSON.parse(await readFile(resolve(root, "packages/cli/package.json"), "utf8"))
assert.equal(pkg.name, "@spawnkit/cli")
assert.equal(pkg.private, undefined)
assert.equal(pkg.dependencies, undefined, "The CLI is bundled; no workspace runtime dependencies may escape.")
assert.equal(pkg.optionalDependencies, undefined)
assert.equal(pkg.scripts.postinstall, undefined)
const registry = process.argv.includes("--registry")
await writeFile(join(directory, "package.json"), '{"private":true,"type":"module"}\n')
await writeFile(join(directory, "pnpm-workspace.yaml"), "packages: []\n")
let source = `${pkg.name}@${pkg.version}`
if (!registry) {
  pnpm(["exec", "turbo", "run", "build", "--filter=@spawnkit/cli"], root)
  pnpm(["pack", "--pack-destination", directory], resolve(root, "packages/cli"))
  source = join(directory, `spawnkit-cli-${pkg.version}.tgz`)
}
pnpm(["add", "--save-exact", source, "--ignore-scripts", "--registry=https://registry.npmjs.org"])
const installed = JSON.parse(await readFile(join(directory, "node_modules/@spawnkit/cli/package.json"), "utf8"))
assert.equal(installed.dependencies, undefined)
assert.equal(JSON.parse(pnpm(["exec", "spawn", "--version", "--json"])).version, pkg.version)
assert.match(pnpm(["exec", "spawn", "--help"]), /spawn create/)
assert.match(await readFile(join(directory, "node_modules/@spawnkit/cli/dist/THIRD-PARTY-LICENSES.md"), "utf8"), /MIT/)
const creation = JSON.parse(pnpm(["exec", "spawn", "create", "phaser", "game", "--with", "vitest", "--yes", "--json"]))
assert.equal(creation.status, "applied")
const game = join(directory, "game")
const gamePackage = await readFile(join(game, "package.json"), "utf8")
assert.doesNotMatch(gamePackage, /workspace:/)
pnpm(["install"], game)
pnpm(["exec", "tsc", "--noEmit"], game)
pnpm(["lint"], game)
pnpm(["test"], game)
pnpm(["build"], game)
if (registry) assert.match(pnpm(["dlx", source, "--version"]), new RegExp(pkg.version.replaceAll(".", "\\.")))
await mkdir(resolve(root, "work"), { recursive: true })
const evidence = {
  version: pkg.version,
  source: registry ? "registry" : "tarball",
  directory,
  checkedAt: new Date().toISOString(),
  passed: true
}
await writeFile(
  resolve(root, `work/cli-package-${registry ? "registry" : "tarball"}.json`),
  JSON.stringify(evidence, null, 2) + "\n"
)
console.log(
  `CLI ${pkg.version}: clean pnpm installation, executable, standalone creation, types, lint, tests, and build passed.\n${directory}`
)
