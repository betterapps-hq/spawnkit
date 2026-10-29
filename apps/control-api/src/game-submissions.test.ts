import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import sharp from "sharp"
import { afterEach, expect, it } from "vitest"
import { adminGamesRoute, publicGames, publicGameSitemap, publicGameBrowse } from "./game-submissions"
import { moderationRoute } from "./moderation"
const databases: DatabaseSync[] = []

it("sitemap inventory follows approval, moderation and serving availability", async () => {
  const { env, db } = fixture()
  const submission = await submit(env)
  expect(await (await publicGameSitemap(env, "1")).json()).toEqual({ games: [], total: 0, categories: [] })
  await adminGamesRoute(request({ action: "approve", note: "" }), env, "admin", submission.id)
  expect(await (await publicGameSitemap(env, "1")).json()).toEqual({
    games: [{ projectId: "p" }],
    total: 1,
    categories: []
  })
  db.exec("INSERT INTO game_moderation(project_id,state) VALUES('p','hidden')")
  expect(await (await publicGameSitemap(env, "1")).json()).toEqual({ games: [], total: 0, categories: [] })
  const hidden = (await (await publicGames(env, "p")).json()) as { games: { discoverable: boolean }[] }
  expect(hidden.games[0]?.discoverable).toBe(false)
  db.exec("UPDATE game_moderation SET state='restricted'")
  expect(await (await publicGameSitemap(env, "1")).json()).toEqual({ games: [], total: 0, categories: [] })
  db.exec("DELETE FROM game_moderation; UPDATE environments SET enabled=0")
  expect(await (await publicGameSitemap(env, "1")).json()).toEqual({ games: [], total: 0, categories: [] })
  db.exec("UPDATE environments SET enabled=1; UPDATE game_submissions SET status='unpublished'")
  expect(await (await publicGameSitemap(env, "1")).json()).toEqual({ games: [], total: 0, categories: [] })
  for (const page of ["0", "-1", "1.5", "50000", "1 OR 1=1"])
    await expect(publicGameSitemap(env, page)).rejects.toMatchObject({ status: 400 })
})

it("paginates complete sitemap inventory beyond the newest 100 games without duplicates", async () => {
  const { env, db } = fixture()
  db.exec("BEGIN")
  for (let index = 0; index < 1001; index++) {
    const id = `game-${String(index).padStart(4, "0")}`
    db.prepare(
      "INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES(?,'creator','Game','{}','now','now')"
    ).run(id)
    db.prepare(
      "INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES(?,?,?,'ready','production','now')"
    ).run(id, id, id)
    db.prepare(
      "INSERT INTO environments(id,project_id,name,enabled,current_release_id) VALUES(?,?,'production',1,?)"
    ).run(id, id, id)
    db.prepare(
      "INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES(?,?,?,'production','succeeded','deployments',?,'hash','creator','now','now')"
    ).run(id, id, id, id)
    db.prepare("INSERT INTO deployment_hostnames VALUES(?,?,?,'production',?)").run(id, `${id}.spawnkit.games`, id, id)
    db.prepare(
      "INSERT INTO game_submissions(id,project_id,release_id,deployment_id,title,description,status,submitted_at,reviewed_at) VALUES(?,?,?,?,'Game','Play this game','approved','now','now')"
    ).run(id, id, id, id)
  }
  db.exec("COMMIT")
  const first = (await (await publicGameSitemap(env, "1")).json()) as { games: { projectId: string }[]; total: number }
  const second = (await (await publicGameSitemap(env, "2")).json()) as { games: { projectId: string }[]; total: number }
  const browse = (await (await publicGameBrowse(env, new URLSearchParams("page=42"))).json()) as {
    games: { projectId: string }[]
    total: number
  }
  expect(browse.total).toBe(1001)
  expect(browse.games).toHaveLength(17)
  expect(browse.games.at(-1)?.projectId).toBe("game-1000")
  await expect(publicGameBrowse(env, new URLSearchParams("page=43"))).rejects.toMatchObject({ status: 404 })
  for (const invalid of ["page=0", "page=-1", "page=1.2", "genre=fake"])
    await expect(publicGameBrowse(env, new URLSearchParams(invalid))).rejects.toMatchObject({ status: 400 })
  db.exec("UPDATE game_submissions SET genre='Arcade'")
  const eligible = (await (await publicGameSitemap(env, "1")).json()) as { categories: unknown[] }
  expect(eligible.categories).toEqual([{ genre: "Arcade", slug: "arcade", total: 1001 }])
  db.exec("UPDATE game_submissions SET status='unpublished',reviewer_id='admin' WHERE project_id > 'game-0003'")
  expect(((await (await publicGameSitemap(env, "1")).json()) as { categories: unknown[] }).categories).toEqual([])
  expect(first.total).toBe(1001)
  expect(first.games).toHaveLength(1000)
  expect(second.games).toEqual([{ projectId: "game-1000" }])
  expect(new Set([...first.games, ...second.games].map((game) => game.projectId)).size).toBe(1001)
})
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
      `${id}.snake.spawnkit.games`,
      id
    )
  }
  release("r1")
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
function request(body?: unknown) {
  return new Request(
    "https://api.spawnkit.cloud/api/platform/v1/test",
    body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}
  )
}
// Seed an activation-created listing so these tests isolate administrative review.
async function submit(env: Env, releaseId = "r1") {
  await env.DATABASE.prepare(
    "INSERT OR IGNORE INTO game_submissions(id,project_id,release_id,deployment_id,title,description,submitted_at) VALUES(?,'p',?,?,'Snake','Collect fruit with arrow keys.',?)"
  )
    .bind(`submission-${releaseId}`, releaseId, `d${releaseId}`, new Date().toISOString())
    .run()
  return { id: `submission-${releaseId}`, url: `https://${releaseId}.snake.spawnkit.games` }
}
it("restricts review actions to administrators", async () => {
  const { env } = fixture()
  await expect(adminGamesRoute(request(), env, "creator")).rejects.toMatchObject({ status: 403 })
  const s = await submit(env)
  await expect(adminGamesRoute(request({ action: "approve", note: "" }), env, "creator", s.id)).rejects.toMatchObject({
    status: 403
  })
  expect(await (await publicGames(env)).json()).toEqual({ games: [] })
})
it.each(["role", "content", "restriction", "release"])(
  "rejects review when %s changes before commit",
  async (change) => {
    const { env, db } = fixture()
    const s = await submit(env)
    const batch = env.DATABASE.batch.bind(env.DATABASE)
    env.DATABASE.batch = async (statements) => {
      if (change === "role")
        db.exec("INSERT INTO community_members(user_id,role,created_at) VALUES('admin','Observer','now')")
      if (change === "content") db.exec("UPDATE game_submissions SET description='Edited after the review started.'")
      if (change === "restriction") db.exec("INSERT INTO game_moderation(project_id,state) VALUES('p','restricted')")
      if (change === "release") db.exec("UPDATE environments SET current_release_id=NULL")
      return batch(statements)
    }
    await expect(adminGamesRoute(request({ action: "approve", note: "" }), env, "admin", s.id)).rejects.toMatchObject({
      status: 409
    })
    expect(db.prepare("SELECT status FROM game_submissions WHERE id=?").get(s.id)?.status).toBe("pending")
    expect(db.prepare("SELECT COUNT(*) n FROM audit_events").get()?.n).toBe(0)
  }
)
it("includes submission decisions in Manage history and prevents history rewriting", async () => {
  const { env, db } = fixture()
  const s = await submit(env)
  await adminGamesRoute(request({ action: "approve", note: "Reviewed" }), env, "admin", s.id)
  const history = await (await moderationRoute(request(), env, "admin", "history")).json()
  expect(history).toMatchObject({
    items: [
      { action: "game.approved", gameTitle: "Snake", beforeState: "pending", afterState: "approved", note: "Reviewed" }
    ]
  })
  expect(() => db.exec("UPDATE audit_events SET actor_id='other'")).toThrow("immutable")
  expect(() => db.exec("DELETE FROM audit_events")).toThrow("immutable")
})
it("submits once per release and pins approved discovery to its immutable deployment", async () => {
  const { env, db, release } = fixture()
  const s = await submit(env)
  expect((await submit(env)).id).toBe(s.id)
  expect(s.url).toBe("https://r1.snake.spawnkit.games")
  await adminGamesRoute(request({ action: "approve", note: "Played successfully" }), env, "admin", s.id)
  release("r2")
  db.exec("UPDATE environments SET current_release_id='r2'")
  const catalog = (await (await publicGames(env)).json()) as { games: { url: string }[] }
  expect(catalog.games[0]?.url).toBe(s.url)
  const next = await submit(env, "r2")
  await adminGamesRoute(request({ action: "approve", note: "" }), env, "admin", next.id)
  expect(db.prepare("SELECT status FROM game_submissions WHERE id=?").get(s.id)?.status).toBe("superseded")
  expect(((await (await publicGames(env)).json()) as { games: { url: string }[] }).games[0]?.url).toContain("r2.")
  expect(db.prepare("SELECT count(*) AS n FROM audit_events").get()?.n).toBe(3)
  await expect(
    adminGamesRoute(request({ action: "reject", note: "late" }), env, "admin", next.id)
  ).rejects.toMatchObject({ status: 409 })
})
it("checks production availability, review notes, and unpublishing", async () => {
  const { env, db } = fixture()
  const s = await submit(env)
  await adminGamesRoute(request({ action: "approve", note: "" }), env, "admin", s.id)
  db.exec("UPDATE environments SET enabled=0")
  expect(await (await publicGames(env)).json()).toEqual({ games: [] })
  db.exec("UPDATE environments SET enabled=1")
  await adminGamesRoute(request({ action: "unpublish", note: "Needs a fix" }), env, "admin", s.id)
  expect(await (await publicGames(env)).json()).toEqual({ games: [] })
  expect(
    (
      (await (await adminGamesRoute(request(), env, "admin")).json()) as {
        submissions: { reviewNote: string }[]
      }
    ).submissions[0]?.reviewNote
  ).toBe("Needs a fix")
})
it("rejects a submission without exposing it publicly", async () => {
  const { env } = fixture()
  const s = await submit(env)
  await adminGamesRoute(request({ action: "reject", note: "Controls need work" }), env, "admin", s.id)
  expect(await (await publicGames(env)).json()).toEqual({ games: [] })
  expect(
    ((await (await adminGamesRoute(request(), env, "admin")).json()) as { submissions: { status: string }[] })
      .submissions[0]?.status
  ).toBe("rejected")
})
it("validates release-owned media and pins it with approval", async () => {
  const { env, db } = fixture()
  const bytes = await sharp({ create: { width: 100, height: 80, channels: 3, background: "purple" } })
    .webp()
    .toBuffer()
  const cover = `spawnkit-cover-${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.webp`
  const video = readFileSync(new URL("../fixtures/trailer.mp4", import.meta.url))
  const trailer = `spawnkit-trailer-${createHash("sha256").update(video).digest("hex").slice(0, 20)}.mp4`
  const lookedUp: string[] = []
  env.ARTIFACTS = {
    get: async (key: string) => {
      lookedUp.push(key)
      const content = key === `releases/p/r1/${cover}` ? bytes : key === `releases/p/r1/${trailer}` ? video : null
      return content ? { size: content.length, arrayBuffer: async () => content } : null
    }
  } as unknown as R2Bucket
  const record = await submit(env)
  db.prepare("UPDATE game_submissions SET cover_path=?,trailer_path=? WHERE id=?").run(cover, trailer, record.id)
  const submission = { ...record, coverUrl: `${record.url}/${cover}`, trailerUrl: `${record.url}/${trailer}` }
  expect(await (await publicGames(env)).json()).toEqual({ games: [] })
  await adminGamesRoute(request({ action: "approve", note: "Media matches gameplay." }), env, "admin", submission.id)
  const { games } = (await (await publicGames(env)).json()) as { games: { coverUrl: string; trailerUrl: string }[] }
  expect(games[0]?.coverUrl).toBe(submission.coverUrl)
  expect(games[0]?.trailerUrl).toBe(submission.trailerUrl)
  expect(lookedUp.every((key) => key.startsWith("releases/p/r1/"))).toBe(true)
})

it("lists only the latest submission per game and retains historical decisions", async () => {
  const { env, db, release } = fixture()
  const first = await submit(env)
  release("r2")
  db.exec("UPDATE environments SET current_release_id='r2'")
  const next = await submit(env, "r2")
  db.exec("UPDATE game_submissions SET submitted_at='2026-10-16T00:00:00Z'")
  const list = async () =>
    (await (await adminGamesRoute(request(), env, "admin")).json()) as { submissions: { id: string }[] }
  expect((await list()).submissions.map((s) => s.id)).toEqual([next.id])
  await adminGamesRoute(request({ action: "reject", note: "" }), env, "admin", next.id)
  expect((await list()).submissions.map((s) => s.id)).toEqual([next.id])
  expect(db.prepare("SELECT status FROM game_submissions WHERE id=?").get(first.id)?.status).toBe("pending")
  expect(db.prepare("SELECT count(*) AS n FROM game_submissions").get()?.n).toBe(2)
})

it("approval removes unprocessed media rather than bypassing the serving policy", async () => {
  const { env, db } = fixture()
  const s = await submit(env)
  db.prepare(
    "UPDATE game_submissions SET cover_path='media/unbounded.svg',trailer_path='media/unbounded.mp4' WHERE id=?"
  ).run(s.id)
  await adminGamesRoute(request({ action: "approve", note: "" }), env, "admin", s.id)
  const { games } = (await (await publicGames(env)).json()) as {
    games: { coverUrl: string | null; trailerUrl: string | null }[]
  }
  expect(games[0]?.coverUrl).toBe(null)
  expect(games[0]?.trailerUrl).toBe(null)
  expect(db.prepare("SELECT status FROM game_submissions WHERE id=?").get(s.id)?.status).toBe("approved")
})
