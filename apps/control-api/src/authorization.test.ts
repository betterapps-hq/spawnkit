import { afterEach, expect, it, vi } from "vitest"
import { communityFixture } from "./community-fixture"

vi.mock("cloudflare:workers", () => ({ DurableObject: class {}, WorkerEntrypoint: class {} }))
vi.mock("@cloudflare/sandbox", () => ({ Sandbox: class {}, ContainerProxy: class {} }))
// Exercise the real router/SQL with distinct principals. Signature verification has separate tests.
vi.mock("./auth", async () => {
  const { HttpError } = await import("./http")
  return {
    authenticate: async (request: Request) => {
      const principal = request.headers.get("authorization")?.replace("Bearer ", "")
      if (!principal || !["creator", "stranger", "admin", "observer", "moderator"].includes(principal))
        throw new HttpError(401, "unauthorized", "Sign in.")
      return principal
    }
  }
})
import worker from "./index"

const databases: ReturnType<typeof communityFixture>["db"][] = []
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})
function fixture() {
  const f = communityFixture()
  databases.push(f.db)
  f.db
    .exec(`INSERT INTO community_members(user_id,role,created_at) VALUES('observer','Observer','now'),('moderator','Moderator','now');
    INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('other','stranger','Private project','{}','now','now');
    INSERT INTO environments(id,project_id,name,enabled) VALUES('other:production','other','production',1);
    INSERT INTO uploads VALUES('foreign-upload','other','digest',1,'ready','2099');
    INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES('foreign-release','other','foreign-deploy','ready','production','now');
    INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES('foreign-deploy','other','foreign-release','production','succeeded','deployments','k','h','stranger','now','now');
    INSERT INTO logs(deployment_id,message,created_at) VALUES('foreign-deploy','private-build-log','now');
    INSERT INTO domains VALUES('private.example','other','production','private-token','pending-dns','now');`)
  return {
    ...f,
    send: (path: string, method = "GET", principal?: string, body?: unknown) =>
      worker.fetch(
        new Request(`https://api.spawnkit.cloud/api/platform/v1/${path}`, {
          method,
          headers: {
            ...(principal ? { authorization: `Bearer ${principal}` } : {}),
            "content-type": "application/json"
          },
          ...(["GET", "HEAD"].includes(method) ? {} : { body: JSON.stringify(body ?? {}) })
        }),
        f.env
      )
  }
}

const projectRoutes = [
  ["", "DELETE"],
  ["deletion", "GET"],
  ["", "GET"],
  ["", "PATCH"],
  ["state", "GET"],
  ["listing", "GET"],
  ["listing", "PUT"],
  ["releases", "GET"],
  ["release-changes?to=foreign-release", "GET"],
  ["uploads", "POST"],
  ["uploads/foreign-upload", "PUT"],
  ["deployments", "POST"],
  ["deployments/foreign-deploy", "GET"],
  ["deployments/foreign-deploy/logs", "GET"],
  ["promotions", "POST"],
  ["rollbacks", "POST"],
  ["domains", "GET"],
  ["domains", "POST"],
  ["domains/private.example", "DELETE"],
  ["domains/private.example/verify", "POST"],
  ["telemetry/settings", "GET"],
  ["telemetry/settings", "PUT"],
  ["telemetry/settings", "DELETE"],
  ["telemetry/events", "GET"],
  ["telemetry/events", "DELETE"],
  ["github/connect", "POST"],
  ["github/deploy", "POST"],
  ["previews/foreign-event/close", "POST"],
  ["previews/foreign-event/retry", "POST"]
] as const

it.each(projectRoutes)(
  "authorizes project %s %s before database child lookup or side effects",
  async (suffix, method) => {
    const { send, db } = fixture()
    const path = `projects/p${suffix ? `/${suffix}` : ""}`
    expect((await send(path, method)).status).toBe(401)
    expect((await send(path, method, "stranger", { ownerId: "creator", userId: "admin" })).status).toBe(404)
    expect(db.prepare("SELECT COUNT(*) n FROM deployments").get()?.n).toBe(2)
    expect(
      db.prepare("SELECT current_release_id FROM environments WHERE project_id='p'").get()?.current_release_id
    ).toBe("r")
  }
)

it.each([
  ["uploads/foreign-upload", "PUT", 404],
  ["deployments/foreign-deploy", "GET", 404],
  ["deployments/foreign-deploy/logs", "GET", 404],
  ["domains/private.example", "DELETE", 404],
  ["domains/private.example/verify", "POST", 404],
  ["release-changes?to=foreign-release", "GET", 404]
] as const)("rejects another project's child ID on the owner's route: %s", async (suffix, method, status) => {
  const { send } = fixture()
  const response = await send(`projects/p/${suffix}`, method, "creator")
  expect(response.status).toBe(status)
  expect(await response.text()).not.toContain("private-build-log")
})

const adminReads = [
  "team/members",
  "team/history",
  "reports",
  "reports/missing",
  "reports/missing?feed=evidence",
  "reports/missing?feed=history",
  "manage/summary",
  "manage/games",
  "manage/games/p",
  "manage/comments",
  "manage/history",
  "submissions"
]
it.each(adminReads)("guards admin read %s", async (route) => {
  const { send } = fixture()
  expect((await send(`admin/${route}`)).status).toBe(401)
  expect((await send(`admin/${route}`, "GET", "creator")).status).toBe(403)
})
it.each([
  "team/members/creator",
  "team/invitations",
  "team/invitations/missing",
  "reports/missing",
  "manage/decisions",
  "submissions/s"
])("blocks Observer writes to %s", async (route) => {
  const { send } = fixture()
  expect((await send(`admin/${route}`, "POST", "observer", { role: "Admin", actorId: "admin" })).status).toBe(403)
})
it.each(["team/members/creator", "team/invitations", "submissions/s"])(
  "blocks Moderator escalation through %s",
  async (route) => {
    const { send } = fixture()
    expect((await send(`admin/${route}`, "POST", "moderator", { role: "Admin", actorId: "admin" })).status).toBe(403)
  }
)
it("filters the project collection and ignores forged owner fields", async () => {
  const { send } = fixture()
  const response = await send("projects", "GET", "creator")
  const body = (await response.json()) as { projects: { id: string }[] }
  expect(body.projects.map((p) => p.id)).toEqual(["p"])
  expect(
    (
      await send("projects", "POST", "stranger", {
        id: "p",
        name: "Take over",
        configuration: { sandbox: false },
        ownerId: "stranger"
      })
    ).status
  ).toBe(409)
})
it.each([
  ["games/p/feedback/me", "GET"],
  ["games/p/rating", "PUT"],
  ["games/p/rating", "DELETE"],
  ["games/p/comments", "PUT"],
  ["games/p/comments/c", "DELETE"],
  ["games/p/reports", "POST"],
  ["team/accept", "POST"],
  ["github/callback", "GET"],
  ["me", "GET"]
] as const)("requires authentication for %s %s", async (path, method) => {
  expect((await fixture().send(path, method)).status).toBe(401)
})
it("does not expose private projects, hidden comments, or author IDs in the public feed", async () => {
  const { send, db } = fixture()
  db.exec("UPDATE game_comments SET hidden=1")
  expect(await (await send("games/other/feedback")).json()).toMatchObject({ error: { code: "not_found" } })
  const feed = await (await send("games/p/feedback")).json()
  expect(feed).toMatchObject({ comments: [] })
  const games = await (await send("games?project=other")).json()
  expect(games).toEqual({ games: [] })
  expect((await send("games/p/comments/c", "DELETE", "stranger")).status).toBe(404)
  expect(db.prepare("SELECT body FROM game_comments WHERE id='c'").get()?.body).toBe("Original comment")
})

it("starts address provisioning immediately without blocking project creation", async () => {
  const provisioning = await import("./provisioning")
  let finish: (value: boolean) => void = () => {}
  const provision = vi.spyOn(provisioning, "provisionProjectDomain").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const f = fixture()
  const background: Promise<unknown>[] = []
  try {
    const response = await worker.fetch(
      new Request("https://api.spawnkit.cloud/api/platform/v1/projects", {
        method: "POST",
        headers: { authorization: "Bearer creator", "content-type": "application/json" },
        body: JSON.stringify({ id: "fresh-game", name: "Fresh game", configuration: { sandbox: false } })
      }),
      f.env,
      { waitUntil: (promise: Promise<unknown>) => background.push(promise) } as unknown as ExecutionContext
    )
    expect(response.status).toBe(201)
    expect(background).toHaveLength(1)
    // Dynamic import is attached to the Worker lifetime, independently of the response.
    await vi.waitFor(() => expect(provision).toHaveBeenCalledWith(f.env, "fresh-game", "fresh-game"))
    finish(false)
    await Promise.all(background)
  } finally {
    provision.mockRestore()
  }
})

it("checks normalized names and rejects collisions without creating a project", async () => {
  const f = fixture()
  f.db.exec("INSERT INTO project_hostnames(project_id,slug) VALUES('other','taken-game')")
  expect((await f.send("projects/name-availability?name=Taken%20Game")).status).toBe(401)
  const check = await f.send("projects/name-availability?name=Taken%20Game", "GET", "creator")
  expect(await check.json()).toEqual({ available: false, slug: "taken-game" })
  const response = await f.send("projects", "POST", "creator", {
    id: "collision",
    name: "Taken Game!",
    configuration: { sandbox: false },
    requireUniqueName: true
  })
  expect(response.status).toBe(409)
  expect(f.db.prepare("SELECT id FROM projects WHERE id='collision'").get()).toBeUndefined()
  const free = await f.send("projects/name-availability?name=Fresh%20Name", "GET", "creator")
  expect(await free.json()).toEqual({ available: true, slug: "fresh-name" })
})

it.each(["GET", "POST"])("does not expose retired owner submissions via %s", async (method) => {
  const f = fixture()
  const response = await f.send("projects/p/submissions", method, "creator")
  expect(response.status).toBe(404)
})
