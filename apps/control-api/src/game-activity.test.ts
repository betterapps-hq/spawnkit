import { readFileSync, readdirSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import { afterEach, expect, it } from "vitest"
import { recordGameActivity, pruneGameActivity } from "./game-activity"
import { publicGames } from "./game-submissions"
const databases: DatabaseSync[] = []
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})
function fixture() {
  const db = new DatabaseSync(":memory:")
  databases.push(db)
  const directory = new URL("../migrations/", import.meta.url)
  for (const name of readdirSync(directory)
    .filter((n) => n.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(new URL(name, directory), "utf8"))
  db.exec(`INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('p','creator','Snake','{}','now','now');
 INSERT INTO environments(id,project_id,name,enabled,current_release_id) VALUES('p:production','p','production',1,'r1');
 INSERT INTO platform_admins VALUES('admin','now');`)
  function release(id: string) {
    db.prepare(
      "INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES(?,'p',?,'ready','production','now')"
    ).run(id, `d${id}`)
    db.prepare(
      "INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES(?,'p',?,'production','succeeded','deployments',?,'hash','creator','now','now')"
    ).run(`d${id}`, id, id)
    db.prepare("INSERT INTO deployment_hostnames VALUES(?,?,'p','production',?)").run(
      `d${id}`,
      `${id}.snake.spawnkit.cloud`,
      id
    )
  }
  release("r1")
  db.exec(
    "INSERT INTO game_submissions(id,project_id,release_id,deployment_id,title,description,status,submitted_at) VALUES('s','p','r1','dr1','Snake','Collect fruit','approved','now')"
  )
  const prepare = (sql: string) => {
    let values: (string | number | null)[] = []
    const statement = {
      bind(...args: (string | number | null)[]) {
        values = args
        return statement
      },
      async first() {
        return db.prepare(sql).get(...values) ?? null
      },
      async all() {
        return { results: db.prepare(sql).all(...values) }
      },
      async run() {
        return db.prepare(sql).run(...values)
      }
    }
    return statement
  }
  const env = {
    DATABASE: {
      prepare,
      async batch(statements: ReturnType<typeof prepare>[]) {
        db.exec("BEGIN")
        try {
          const result = []
          for (const stmt of statements) result.push(await stmt.all())
          db.exec("COMMIT")
          return result
        } catch (e) {
          db.exec("ROLLBACK")
          throw e
        }
      }
    }
  } as unknown as Env
  return { db, env, release }
}
const visitorId = "12345678-1234-4234-8234-123456789abc"
function request(kind: unknown = "view", visitor: unknown = visitorId, project = "p") {
  return new Request(`https://activity.internal/api/platform/v1/games/${project}/activity`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-spawn-client-ip": "192.0.2.1" },
    body: JSON.stringify({ kind, visitorId: visitor })
  })
}
async function count(env: Env, kind = "view", time = 1_000_000, visitor = visitorId) {
  return (await recordGameActivity(request(kind, visitor), env, time)).json()
}
it("counts views and launches independently, deduplicating refreshes and restarts for a full 30 minutes", async () => {
  const { env, db } = fixture()
  expect(await count(env)).toEqual({ counted: true, views: 1, plays: 0 })
  expect(await count(env, "view", 1_000_001)).toEqual({ counted: false, views: 1, plays: 0 })
  expect(await count(env, "play")).toEqual({ counted: true, views: 1, plays: 1 })
  expect(await count(env, "play", 2_799_999)).toEqual({ counted: false, views: 1, plays: 1 })
  expect(await count(env, "view", 2_799_999)).toEqual({ counted: false, views: 1, plays: 1 })
  expect(await count(env, "view", 2_800_000)).toEqual({ counted: true, views: 2, plays: 1 })
  expect(await count(env, "play", 2_800_000)).toEqual({ counted: true, views: 2, plays: 2 })
  const row = db.prepare("SELECT visitor_hash FROM game_activity_visitors LIMIT 1").get()
  expect(row?.visitor_hash).toMatch(/^[a-f0-9]{64}$/)
  expect(row?.visitor_hash).not.toBe(visitorId)
  const catalog = (await (await publicGames(env)).json()) as { games: { views: number; plays: number }[] }
  expect(catalog.games[0]).toMatchObject({ views: 2, plays: 2 })
})
it("handles simultaneous duplicates atomically and permits different visitors", async () => {
  const { env } = fixture()
  // D1 serializes batched transactions; queue this adapter's batches equivalently.
  const batch = env.DATABASE.batch.bind(env.DATABASE)
  let pending = Promise.resolve<unknown>(undefined)
  env.DATABASE.batch = ((statements: D1PreparedStatement[]) => {
    const result = pending.then(() => batch(statements))
    pending = result
    return result
  }) as typeof env.DATABASE.batch
  const results = (await Promise.all(Array.from({ length: 8 }, () => count(env)))) as { counted: boolean }[]
  expect(results.filter((r) => r.counted)).toHaveLength(1)
  expect(await count(env, "view", 1_000_000, "87654321-1234-4234-8234-123456789abc")).toEqual({
    counted: true,
    views: 2,
    plays: 0
  })
})
it("rejects missing, unapproved and disabled games, invalid input and rate-limited traffic", async () => {
  const { env, db } = fixture()
  await expect(recordGameActivity(request("view", visitorId, "missing"), env)).rejects.toMatchObject({ status: 404 })
  db.exec("UPDATE game_submissions SET status='pending',reviewer_id='admin',reviewed_at='now'")
  await expect(recordGameActivity(request(), env)).rejects.toMatchObject({ status: 404 })
  db.exec("UPDATE game_submissions SET status='approved'; UPDATE environments SET enabled=0")
  await expect(recordGameActivity(request(), env)).rejects.toMatchObject({ status: 404 })
  db.exec("UPDATE environments SET enabled=1")
  await expect(recordGameActivity(request("rating"), env)).rejects.toMatchObject({ status: 400 })
  await expect(recordGameActivity(request("view", "bad"), env)).rejects.toMatchObject({ status: 400 })
  await expect(recordGameActivity(request("x".repeat(1100)), env)).rejects.toMatchObject({ status: 413 })
  env.API_READ_LIMIT = { limit: async () => ({ success: false }) }
  await expect(recordGameActivity(request(), env)).rejects.toMatchObject({ status: 429 })
  expect(db.prepare("SELECT COUNT(*) AS n FROM game_activity_totals").get()?.n).toBe(0)
})
it("expires deduplication data while retaining totals across new releases", async () => {
  const { env, db, release } = fixture()
  await count(env)
  await pruneGameActivity(env, 2_799_999)
  expect(db.prepare("SELECT COUNT(*) AS n FROM game_activity_visitors").get()?.n).toBe(1)
  await pruneGameActivity(env, 2_800_000)
  expect(db.prepare("SELECT COUNT(*) AS n FROM game_activity_visitors").get()?.n).toBe(0)
  release("r2")
  db.exec("UPDATE game_submissions SET release_id='r2',deployment_id='dr2'")
  expect(await count(env, "view", 2_800_000)).toEqual({ counted: true, views: 2, plays: 0 })
})
it("rolls back the deduplication write if the total cannot be updated", async () => {
  const { env, db } = fixture()
  db.exec(
    "CREATE TRIGGER fail_totals BEFORE INSERT ON game_activity_totals BEGIN SELECT RAISE(ABORT,'test failure'); END"
  )
  await expect(count(env)).rejects.toThrow("test failure")
  expect(db.prepare("SELECT COUNT(*) AS n FROM game_activity_visitors").get()?.n).toBe(0)
  db.exec("DROP TRIGGER fail_totals")
  expect(await count(env)).toEqual({ counted: true, views: 1, plays: 0 })
})
it("ranks the last 30 UTC days without replaying refreshes or counting expired history", async () => {
  const { env, db } = fixture()
  const now = Date.parse("2026-10-16T12:00:00Z")
  await count(env, "view", Date.parse("2026-09-16T23:59:59Z"))
  await count(env, "view", Date.parse("2026-09-17T00:30:00Z"))
  await count(env, "view", now)
  await count(env, "view", now + 1)
  await count(env, "play", now)
  const catalog = (await (await publicGames(env, "p", now)).json()) as {
    games: { monthlyViews: number; views: number }[]
  }
  expect(catalog.games[0]).toMatchObject({ monthlyViews: 2, views: 3 })
  await pruneGameActivity(env, now + 1800_000)
  expect(db.prepare("SELECT SUM(views) AS views FROM game_activity_daily").get()?.views).toBe(3)
  const later = (await (await publicGames(env, "p", now + 30 * 86400_000)).json()) as {
    games: { monthlyViews: number }[]
  }
  expect(later.games[0]?.monthlyViews).toBe(0)
})
