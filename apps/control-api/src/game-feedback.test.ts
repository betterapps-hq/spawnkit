import { readFileSync, readdirSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import { afterEach, expect, it, vi } from "vitest"
import { mutateFeedback, personalFeedback, publicFeedback } from "./game-feedback"
import { publicGames } from "./game-submissions"
const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ username: null; firstName: string; emailAddresses: { emailAddress: string }[] }>>(
    async () => ({
      username: null,
      firstName: "Alex",
      emailAddresses: [{ emailAddress: "private@example.com" }]
    })
  )
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
  const directory = new URL("../migrations/", import.meta.url)
  for (const file of readdirSync(directory)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(new URL(file, directory), "utf8"))
  db.exec(`INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('p','creator','Game','{}','now','now');
    INSERT INTO environments(id,project_id,name,enabled,current_release_id) VALUES('p:production','p','production',1,'r');
    INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES('r','p','d','ready','production','now');
    INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES('d','p','r','production','succeeded','deployments','k','h','creator','now','now');
    INSERT INTO deployment_hostnames VALUES('d','d.game.spawnkit.cloud','p','production','r');
    INSERT INTO game_submissions(id,project_id,release_id,deployment_id,title,description,status,submitted_at,genre,dimension) VALUES('s','p','r','d','Game','Play a game.','approved','now','Arcade','2D');
    INSERT INTO platform_admins VALUES('admin','now');`)
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
  const env = { DATABASE: { prepare }, CLERK_SECRET_KEY: "test" } as unknown as Env
  return { db, env }
}
const request = (method = "GET", body?: unknown, suffix = "") =>
  new Request(`https://api.spawnkit.cloud/api/platform/v1/games/p/feedback${suffix}`, {
    method,
    ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  })
type Payload = {
  totals: { rating: number; reviews: number; comments: number }
  comments: { id: string; rating: number }[]
  nextCursor: string
  rating: number
  comment: { id: string }
  games: unknown[]
}
async function data(response: Promise<Response>) {
  return (await (await response).json()) as Payload
}
it("keeps one rating per account, updates averages and persists totals across releases", async () => {
  const { env, db } = fixture()
  await mutateFeedback(request("PUT", { rating: 5, userId: "spoof" }), env, "p", "one", "rating")
  await mutateFeedback(request("PUT", { rating: 5 }), env, "p", "one", "rating")
  await mutateFeedback(request("PUT", { rating: 3 }), env, "p", "two", "rating")
  expect((await data(publicFeedback(request(), env, "p"))).totals).toEqual({
    rating: 4,
    reviews: 2,
    comments: 0
  })
  await mutateFeedback(request("PUT", { rating: 1 }), env, "p", "one", "rating")
  expect((await data(publicGames(env))).games[0]).toMatchObject({
    rating: 2,
    reviews: 2,
    genre: "Arcade",
    dimension: "2D"
  })
  db.exec("UPDATE environments SET current_release_id='new-release'")
  expect((await data(personalFeedback(env, "p", "one"))).rating).toBe(1)
  await mutateFeedback(request("DELETE"), env, "p", "one", "rating")
  await mutateFeedback(request("DELETE"), env, "p", "two", "rating")
  expect((await data(publicFeedback(request(), env, "p"))).totals).toEqual({
    rating: 0,
    reviews: 0,
    comments: 0
  })
})
it("validates inputs and refuses unavailable games", async () => {
  const { env, db } = fixture()
  for (const rating of [0, 6, 2.5, "5", null])
    await expect(mutateFeedback(request("PUT", { rating }), env, "p", "one", "rating")).rejects.toMatchObject({
      status: 400
    })
  for (const body of ["", " ", "a".repeat(2001)])
    await expect(mutateFeedback(request("PUT", { body }), env, "p", "one", "comments")).rejects.toMatchObject({
      status: 400
    })
  await expect(mutateFeedback(request("POST"), env, "p", "one", "rating")).rejects.toMatchObject({ status: 405 })
  await expect(publicFeedback(request("GET", undefined, "?cursor=broken"), env, "p")).rejects.toMatchObject({
    status: 400
  })
  db.exec("UPDATE environments SET enabled=0")
  await expect(publicFeedback(request(), env, "p")).rejects.toMatchObject({ status: 404 })
  await expect(mutateFeedback(request("PUT", { rating: 5 }), env, "p", "one", "rating")).rejects.toMatchObject({
    status: 404
  })
})
it("edits comments idempotently, uses verified names, hides private identity and enforces deletion ownership", async () => {
  const { env } = fixture()
  await mutateFeedback(request("PUT", { body: "Nice game", author: "Administrator" }), env, "p", "one", "comments")
  await mutateFeedback(request("PUT", { body: "Updated feedback" }), env, "p", "one", "comments")
  const feed = await data(publicFeedback(request(), env, "p"))
  expect(feed.totals.comments).toBe(1)
  expect(feed.comments[0]).toMatchObject({ author: "Alex", body: "Updated feedback" })
  expect(JSON.stringify(feed)).not.toMatch(/private@example|user_id|userId/)
  const id = feed.comments[0]!.id
  expect((await data(personalFeedback(env, "p", "one"))).comment.id).toBe(id)
  await expect(mutateFeedback(request("DELETE"), env, "p", "other", "comments", id)).rejects.toMatchObject({
    status: 404
  })
  await expect(mutateFeedback(request("DELETE"), env, "p", "admin", "comments", id)).rejects.toMatchObject({
    status: 404
  })
  await mutateFeedback(request("DELETE"), env, "p", "one", "comments", id)
  expect((await data(publicFeedback(request(), env, "p"))).totals.comments).toBe(0)
  await mutateFeedback(request("PUT", { body: "My new comment" }), env, "p", "one", "comments")
  const own = await data(personalFeedback(env, "p", "one"))
  await mutateFeedback(request("DELETE"), env, "p", "one", "comments", own.comment.id)
})
it("paginates without duplicates and joins each author's current rating", async () => {
  const { env, db } = fixture()
  for (let i = 0; i < 23; i++)
    db.prepare(
      "INSERT INTO game_comments(id,project_id,user_id,author,body,created_at,updated_at) VALUES(?, 'p', ?, 'Player', 'Comment', '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z')"
    ).run(`c${i.toString().padStart(2, "0")}`, `u${i}`)
  await mutateFeedback(request("PUT", { rating: 4 }), env, "p", "u22", "rating")
  const first = await data(publicFeedback(request(), env, "p"))
  expect(first.comments).toHaveLength(20)
  expect(first.comments[0]!.rating).toBe(4)
  const next = await data(
    publicFeedback(request("GET", undefined, `?cursor=${encodeURIComponent(first.nextCursor)}`), env, "p")
  )
  expect(next.comments).toHaveLength(3)
  expect(next.nextCursor).toBeNull()
  expect(new Set([...first.comments, ...next.comments].map((c: { id: string }) => c.id)).size).toBe(23)
})
