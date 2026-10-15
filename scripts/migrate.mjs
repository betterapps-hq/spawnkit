import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

const { values } = parseArgs({
  options: { environment: { type: "string" }, baseline: { type: "boolean", default: false } }
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
function query(sql) {
  const results = cf(["d1", "query", database, "--sql", sql])
  if (results.some((result) => !result.success)) throw new Error("Database query failed")
  return results[0].results
}
if (values.baseline) {
  // One-time adoption of the eight migrations already applied before CI existed.
  // Compare the actual schema with a fresh SQLite database before recording history.
  const names = readdirSync(directory)
    .filter((name) => /^000[1-8]_.*\.sql$/.test(name))
    .sort()
  if (names.length !== 8) throw new Error("Expected exactly the eight initial migrations")
  const expected = new DatabaseSync(":memory:")
  for (const name of names)
    expected.exec(readFileSync(new URL(`../apps/control-api/migrations/${name}`, import.meta.url), "utf8"))
  const schema =
    "SELECT type, name, sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name"
  const actual = new Map(query(schema).map((row) => [row.name, row]))
  const normalize = (sql) =>
    sql
      .toLowerCase()
      .replace(/[\s`"\[\]]+/g, "")
      .replace(/;$/, "")
  for (const row of expected.prepare(schema).all()) {
    if (actual.get(row.name)?.type !== row.type || normalize(actual.get(row.name)?.sql ?? "") !== normalize(row.sql))
      throw new Error(`Existing schema does not match migration baseline: ${row.name}; no history was changed`)
  }
  expected.close()
  query(
    "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)"
  )
  for (const name of names) query(`INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${name}')`)
  console.log(`Verified and recorded existing ${values.environment} migration history`)
} else {
  const pending = cf(["d1", "migrations", "list", database, "--dir", directory])
  if (
    pending.some((migration) => migration.Name === "0001_control.sql") &&
    query("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").length
  )
    throw new Error("Legacy database detected. Run the schema-verified --baseline adoption once before deploying.")
  cf(["d1", "migrations", "apply", database, "--dir", directory])
  console.log(`Applied pending ${values.environment} migrations`)
}
