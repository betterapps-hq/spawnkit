import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

const { values } = parseArgs({
  options: { environment: { type: "string" } }
})
if (!["production", "staging"].includes(values.environment)) throw new Error("Choose production or staging")
const root = fileURLToPath(new URL("..", import.meta.url))
const database =
  values.environment === "production" ? "6d546779-70b6-42af-9a61-c646ab642012" : "42c76813-8fd1-4831-9500-5155eb1dab20"
const directory = fileURLToPath(new URL("../apps/control-api/migrations", import.meta.url))
function cf(args) {
  const result = spawnSync(process.execPath, ["apps/dashboard/node_modules/cf/bin/cf", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  })
  if (result.status !== 0 || /APIError|Aborted\./.test(result.stderr))
    throw new Error(result.stderr || "Migration command failed")
  return JSON.parse(result.stdout)
}
cf(["d1", "migrations", "apply", database, "--dir", directory])
console.log(`Applied pending ${values.environment} migrations`)
