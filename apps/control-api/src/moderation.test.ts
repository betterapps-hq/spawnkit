import { readFileSync, readdirSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import type { ManagedGame, ManagedComment, ModerationEvent, ModerationPage } from "@spawn/platform/moderation"
import { afterEach, expect, it, vi } from "vitest"
import { publicFeedback, mutateFeedback } from "./game-feedback"
import { publicGames, adminGamesRoute } from "./game-submissions"
import { moderationRoute } from "./moderation"

const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ username: string }>>(async () => ({ username: "Verified admin" }))
}))
vi.mock("@clerk/backend", () => ({ createClerkClient: () => ({ users: { getUser } }) }))
const databases: DatabaseSync[] = []
afterEach(() => {
  databases.splice(0).forEach((db) => db.close())
  vi.clearAllMocks()
})
function fixture() {
  const db = new DatabaseSync(":memory:")
  databases.push(db)
  const migrations = new URL("../migrations/", import.meta.url)
  for (const file of readdirSync(migrations)
    .filter((file) => file.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(new URL(file, migrations), "utf8"))
  db.exec(`INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('p','creator','Game','{}','2026-10-16T00:00:00.000Z','2026-10-16T00:00:00.000Z');
    INSERT INTO environments(id,project_id,name,enabled,current_release_id) VALUES('p:production','p','production',1,'r');
    INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES('r','p','d','ready','production','2026-10-16T00:00:00.000Z');
    INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES('d','p','r','production','succeeded','deployments','k','h','creator','2026-10-16T00:00:00.000Z','2026-10-16T00:00:00.000Z');
    INSERT INTO deployment_hostnames VALUES('d','d-game.spawnkit.games','p','production','r');
    INSERT INTO game_submissions(id,project_id,release_id,deployment_id,title,description,status,submitted_at,genre,dimension) VALUES('s','p','r','d','Game','Play a game.','approved','2026-10-16T00:00:00.000Z','Arcade','2D');
    INSERT INTO platform_admins VALUES('admin','now');
    INSERT INTO platform_admins VALUES('second-admin','now');
    INSERT INTO game_comments(id,project_id,user_id,author,body,created_at,updated_at) VALUES('c','p','player','Player','Original comment','2026-10-16T00:00:00.000Z','2026-10-16T00:00:00.000Z');`)
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
      },
      execute() {
        return { results: db.prepare(sql).all(...values) }
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
          const results = statements.map((s) => s.execute())
          db.exec("COMMIT")
          return results
        } catch (error) {
          db.exec("ROLLBACK")
          throw error
        }
      }
    },
    CLERK_SECRET_KEY: "test",
    ARTIFACTS: { get: async () => null }
  } as unknown as Env
  return { db, env }
}
const request = (body?: unknown, query = "") =>
  new Request(
    `https://api.spawnkit.cloud/api/platform/v1/admin/manage/games${query}`,
    body === undefined
      ? {}
      : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
  )
const decision = (overrides: Record<string, unknown> = {}) => ({
  requestId: crypto.randomUUID(),
  projectId: "p",
  action: "hide-game",
  revision: 0,
  reason: "Unsafe content",
  note: "Verified the issue in the current game.",
  ...overrides
})
const data = async <T>(response: Promise<Response>) => (await (await response).json()) as T
const read = <T>(env: Env, resource: string, query = "") =>
  data<ModerationPage<T>>(moderationRoute(request(undefined, query), env, "admin", resource))

it("requires administrator access for every read and write, including project owners", async () => {
  const { env } = fixture()
  for (const actor of ["creator", "player"]) {
    for (const resource of ["summary", "games", "comments", "history"])
      await expect(moderationRoute(request(), env, actor, resource)).rejects.toMatchObject({ status: 403 })
    await expect(moderationRoute(request(decision()), env, actor, "decisions")).rejects.toMatchObject({ status: 403 })
  }
  await expect(
    moderationRoute(new Request("https://test", { method: "DELETE" }), env, "admin", "history")
  ).rejects.toMatchObject({ status: 405 })
})
it("lists real games once, includes unlisted games, and paginates literal searches without duplicates", async () => {
  const { env, db } = fixture()
  for (let i = 0; i < 44; i++) {
    const id = `p${String(i).padStart(2, "0")}`
    db.prepare(
      "INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) SELECT ?,owner_id,?,configuration,created_at,updated_at FROM projects WHERE id='p'"
    ).run(id, `Game ${i}%`)
    db.prepare(
      "INSERT INTO environments(id,project_id,name,enabled,current_release_id) VALUES(?,?,'production',1,'r')"
    ).run(id, id)
    db.prepare(
      "INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) SELECT ?,?,'r',environment,status,operation,?,request_hash,actor_id,created_at,updated_at FROM deployments WHERE id='d'"
    ).run(id, id, id)
    db.prepare("INSERT INTO deployment_hostnames VALUES(?,?,?,'production','r')").run(id, `${id}.spawnkit.games`, id)
  }
  const first = await read<ManagedGame>(env, "games")
  expect(first.items).toHaveLength(40)
  const next = await read<ManagedGame>(env, "games", `?cursor=${encodeURIComponent(first.nextCursor!)}`)
  expect(next.items).toHaveLength(5)
  expect(new Set([...first.items, ...next.items].map((g) => g.id)).size).toBe(45)
  expect(next.nextCursor).toBeNull()
  expect((await read<ManagedGame>(env, "games", "?status=Published")).items).toMatchObject([
    { id: "p", views: 0, comments: 1 }
  ])
  expect((await read<ManagedGame>(env, "games", "?q=0%25")).items).toHaveLength(5)
  expect((await read<ManagedGame>(env, "games", "?q=creator")).items).toHaveLength(40)
  await expect(read(env, "games", "?cursor=broken")).rejects.toMatchObject({ status: 400 })
  await expect(read(env, "games", "?status=made-up")).rejects.toMatchObject({ status: 400 })
})
it("keeps hidden games playable by direct link and restrictions across deployments and approval attempts", async () => {
  const { env, db } = fixture()
  await moderationRoute(request(decision()), env, "admin", "decisions")
  expect((await data<{ games: unknown[] }>(publicGames(env))).games).toHaveLength(0)
  expect((await data<{ games: unknown[] }>(publicGames(env, "p"))).games).toHaveLength(1)
  expect((await read<ManagedGame>(env, "games")).items[0]).toMatchObject({
    state: "hidden",
    revision: 1,
    status: "Hidden"
  })
  await moderationRoute(request(decision({ action: "restrict-game", revision: 1 })), env, "admin", "decisions")
  expect((await data<{ games: unknown[] }>(publicGames(env, "p"))).games).toHaveLength(0)
  await expect(publicFeedback(request(), env, "p")).rejects.toMatchObject({ status: 404 })
  db.exec(
    "INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) SELECT 'd2',project_id,release_id,environment,status,operation,'new',request_hash,actor_id,'2026-10-17T00:00:00.000Z',updated_at FROM deployments WHERE id='d'; INSERT INTO deployment_hostnames VALUES('d2','d2.spawnkit.games','p','production','r'); UPDATE game_submissions SET status='pending',reviewer_id='admin',reviewed_at='2026-10-17T00:00:00.000Z';"
  )
  expect((await read<ManagedGame>(env, "games")).items).toMatchObject([{ state: "restricted", revision: 2 }])
  await expect(adminGamesRoute(request({ action: "approve", note: "" }), env, "admin", "s")).rejects.toMatchObject({
    status: 404
  })
  await moderationRoute(
    request(decision({ action: "restore-game", revision: 2, reason: "Issue resolved" })),
    env,
    "admin",
    "decisions"
  )
  expect((await read<ManagedGame>(env, "games")).items[0]).toMatchObject({
    state: "normal",
    revision: 3,
    status: "Unlisted"
  })
  const history = await read<ModerationEvent>(env, "history", "?project=p")
  expect(history.items).toHaveLength(3)
  expect(history.items.find((e) => e.action === "restrict-game")).toMatchObject({
    actorId: "admin",
    actorName: "Verified admin",
    beforeState: "hidden",
    afterState: "restricted"
  })
  expect(getUser).toHaveBeenCalledWith("admin")
})
it("atomically records audit entries, deduplicates retries, and rejects stale or reused requests", async () => {
  const { env, db } = fixture()
  const body = decision({ actorName: "Spoofed" })
  await moderationRoute(request(body), env, "admin", "decisions")
  await moderationRoute(request(body), env, "admin", "decisions")
  expect((await read<ModerationEvent>(env, "history")).items).toHaveLength(1)
  await expect(moderationRoute(request({ ...body, note: "Changed" }), env, "admin", "decisions")).rejects.toMatchObject(
    { status: 409 }
  )
  await expect(
    moderationRoute(request(decision({ action: "restrict-game" })), env, "second-admin", "decisions")
  ).rejects.toMatchObject({ status: 409 })
  expect(() => db.exec("UPDATE moderation_audit SET note='tampered'")).toThrow("immutable")
  expect(() => db.exec("DELETE FROM moderation_audit")).toThrow("immutable")
  db.exec(
    "CREATE TRIGGER fail_audit BEFORE INSERT ON moderation_audit BEGIN SELECT RAISE(ABORT,'storage failure'); END;"
  )
  await expect(
    moderationRoute(request(decision({ action: "restrict-game", revision: 1 })), env, "admin", "decisions")
  ).rejects.toThrow("storage failure")
  expect(db.prepare("SELECT state,revision FROM game_moderation").get()).toEqual({ state: "hidden", revision: 1 })
  expect((await read<ModerationEvent>(env, "history")).items).toHaveLength(1)
})
it("hides comments and totals, keeps edits hidden, and preserves the original audit snapshot after deletion", async () => {
  const { env, db } = fixture()
  db.exec("UPDATE game_submissions SET title='Display title'")
  expect((await read<ManagedComment>(env, "comments", "?q=Display")).items).toMatchObject([
    { id: "c", gameTitle: "Display title" }
  ])
  await moderationRoute(request(decision({ action: "hide-comment", commentId: "c" })), env, "admin", "decisions")
  const feedback = await data<{ totals: { comments: number }; comments: unknown[] }>(
    publicFeedback(request(), env, "p")
  )
  expect(feedback.totals.comments).toBe(0)
  expect(feedback.comments).toHaveLength(0)
  expect((await data<{ games: { comments: number }[] }>(publicGames(env))).games[0]?.comments).toBe(0)
  expect((await read<ManagedComment>(env, "comments", "?status=hidden")).items).toMatchObject([
    { id: "c", hidden: 1, revision: 1 }
  ])
  await mutateFeedback(
    new Request("https://test", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "Edited text" })
    }),
    env,
    "p",
    "player",
    "comments"
  )
  expect(db.prepare("SELECT hidden,moderation_revision FROM game_comments WHERE id='c'").get()).toEqual({
    hidden: 1,
    moderation_revision: 2
  })
  await expect(
    moderationRoute(
      request(decision({ action: "restore-comment", commentId: "c", revision: 1 })),
      env,
      "admin",
      "decisions"
    )
  ).rejects.toMatchObject({ status: 409 })
  await moderationRoute(
    request(decision({ action: "restore-comment", commentId: "c", revision: 2 })),
    env,
    "admin",
    "decisions"
  )
  expect((await data<{ totals: { comments: number } }>(publicFeedback(request(), env, "p"))).totals.comments).toBe(1)
  await mutateFeedback(new Request("https://test", { method: "DELETE" }), env, "p", "player", "comments", "c")
  const audit = await read<ModerationEvent>(env, "history")
  expect(audit.items).toHaveLength(2)
  expect(audit.items.find((e) => e.action === "hide-comment")?.beforeState).toBe(
    JSON.stringify({ hidden: 0, body: "Original comment" })
  )
})
it("rejects incomplete decisions and honors role removal before the transaction commits", async () => {
  const { env, db } = fixture()
  for (const invalid of [
    { note: "" },
    { note: "a".repeat(501) },
    { reason: "anything" },
    { action: "delete-game" },
    { revision: -1 },
    { action: "hide-comment" },
    { requestId: "bad" }
  ])
    await expect(moderationRoute(request(decision(invalid)), env, "admin", "decisions")).rejects.toMatchObject({
      status: 400
    })
  getUser.mockImplementationOnce(async () => {
    db.exec("DELETE FROM platform_admins WHERE user_id='admin'")
    return { username: "Revoked" }
  })
  await expect(moderationRoute(request(decision()), env, "admin", "decisions")).rejects.toMatchObject({ status: 409 })
  expect((await data<{ games: unknown[] }>(publicGames(env))).games).toHaveLength(1)
  expect(db.prepare("SELECT COUNT(*) AS count FROM moderation_audit").get()).toEqual({ count: 0 })
})
