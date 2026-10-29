import { readFileSync, readdirSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import { afterEach, expect, it } from "vitest"
import { attributeRelease, creatorMetrics, pruneCreatorMetrics, recordKitDownload } from "./creator-metrics"
const databases: DatabaseSync[] = []
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})
function fixture() {
  const db = new DatabaseSync(":memory:")
  databases.push(db)
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort())
    db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"))
  const prepare = (sql: string) => {
    let values: (string | number | null)[] = []
    const statement = {
      bind(...args: typeof values) {
        values = args
        return statement
      },
      async run() {
        return db.prepare(sql).run(...values)
      },
      async all() {
        return { results: db.prepare(sql).all(...values) }
      }
    }
    return statement
  }
  const env = {
    DATABASE: {
      prepare,
      batch: async (statements: ReturnType<typeof prepare>[]) => {
        for (const statement of statements) await statement.run()
      }
    }
  } as unknown as Env
  function release(id: string, project: string, status = "succeeded", time = "2026-10-17T00:00:00Z") {
    db.prepare(
      "INSERT OR IGNORE INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES(?,'owner',?,'{}',?,?)"
    ).run(project, project, time, time)
    db.prepare(
      "INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES(?,?,?,'ready','production',?)"
    ).run(id, project, id, time)
    db.prepare(
      "INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES(?,?,?,'production',?,'deployments',?,'hash','owner',?,?)"
    ).run(id, project, id, status, id, time, time)
  }
  return { db, env, release }
}
const file = (data: unknown) => [
  { path: "spawnkit-attribution.json", content: new TextEncoder().encode(JSON.stringify(data)) }
]
it("counts copied folders as one converted download and multiple first-deployed projects, excluding retries and failures", async () => {
  const { env, release } = fixture(),
    download = await recordKitDownload(env, "phaser")
  release("a", "project-a")
  release("b", "project-b")
  release("c", "project-a", "succeeded", "2026-10-17T01:00:00Z")
  release("d", "failed", "failed")
  for (const id of ["a", "b", "c", "d"]) await attributeRelease(env, id, file(download))
  expect((await creatorMetrics(env)).kits).toEqual([
    { kit_id: "phaser", prepared_downloads: 1, converted_downloads: 1, first_deployed_projects: 2 }
  ])
  release("early", "existing", "succeeded", "2026-10-16T00:00:00Z")
  release("later", "existing")
  await attributeRelease(env, "later", file(download))
  expect((await creatorMetrics(env)).kits[0]).toMatchObject({ first_deployed_projects: 2 })
})
it("ignores absent, revoked, malformed and unknown attribution; expires analytics links", async () => {
  const { env, db, release } = fixture(),
    download = await recordKitDownload(env, "pixi")
  release("r", "p")
  for (const files of [
    [],
    file(null),
    file({ ...download, consent: false }),
    file({ ...download, downloadId: crypto.randomUUID() }),
    [{ path: "spawnkit-attribution.json", content: new TextEncoder().encode("{") }]
  ])
    await attributeRelease(env, "r", files)
  expect(db.prepare("SELECT kit_download_id FROM releases WHERE id='r'").get()?.kit_download_id).toBeNull()
  await attributeRelease(env, "r", file(download))
  db.prepare("UPDATE kit_downloads SET created_at='2020-01-01'").run()
  expect((await creatorMetrics(env)).kits).toEqual([])
  await pruneCreatorMetrics(env)
  expect(db.prepare("SELECT kit_download_id FROM releases WHERE id='r'").get()?.kit_download_id).toBeNull()
  expect(db.prepare("SELECT COUNT(*) AS n FROM kit_downloads").get()?.n).toBe(0)
  await expect(recordKitDownload(env, "missing")).rejects.toThrow("Unknown kit")
})
