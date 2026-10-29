import { afterEach, expect, it, vi } from "vitest"
import { communityFixture } from "./community-fixture"
import { publicGames } from "./game-submissions"
import { deleteProject, deletionStatus, processProjectDeletion } from "./project-deletion"
import { putProjectArtifact } from "./project-lifecycle"

const databases: ReturnType<typeof communityFixture>["db"][] = []
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
  vi.unstubAllGlobals()
})
function fixture() {
  const { db, env } = communityFixture()
  databases.push(db)
  db.exec(`INSERT INTO project_hostnames(project_id,slug,ready) VALUES('p','game',1);
    INSERT INTO hosting_slots VALUES('p:production','game.spawnkit.games','p','production');
    INSERT INTO build_queue(deployment_id,owner_id,enqueued_at,reserved) VALUES('d','creator','now',1);
    INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('other','another','Other','{}','now','now');
    INSERT INTO project_hostnames(project_id,slug) VALUES('other','other');
    INSERT INTO game_ratings VALUES('p','player',5,'now');
    INSERT INTO game_activity_totals VALUES('p',4,2);`)
  const objects = new Map<string, string>([
    ["sources/p/a.gz", "source"],
    ["releases/p/r/index.html", "game"],
    ["releases/p-other/r/index.html", "neighbor"],
    ["sources/other/a.gz", "neighbor"]
  ])
  const cancel = vi.fn<() => Promise<boolean>>(async () => true)
  const telemetry = vi.fn<() => Promise<Response>>(async () => Response.json({ deleted: true }))
  Object.assign(env, {
    HOSTING_API_TOKEN: "test-only",
    HOSTING_TEST: "false",
    BUILD_JOBS: { getByName: () => ({ cancel }) },
    TELEMETRY: { fetch: telemetry },
    ARTIFACTS: {
      async list({ prefix, limit }: { prefix: string; limit: number }) {
        const keys = [...objects.keys()].filter((key) => key.startsWith(prefix)).sort()
        return { objects: keys.slice(0, limit).map((key) => ({ key })), truncated: keys.length > limit }
      },
      async delete(keys: string | string[]) {
        for (const key of typeof keys === "string" ? [keys] : keys) objects.delete(key)
      },
      async put(key: string) {
        objects.set(key, "written")
      },
      async get() {
        return null
      }
    }
  })
  const providerDeletes: string[] = []
  const provider = vi.fn<typeof fetch>(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === "DELETE") {
      providerDeletes.push(url)
      return Response.json({ success: true, result: {} })
    }
    if (url.includes("workers/domains"))
      return Response.json({
        success: true,
        result: [
          {
            id: "owned",
            hostname: "game.spawnkit.games",
            service: "spawnkit-games",
            zone_id: "b0f105530cc52d9f3a95ee4fd5592531"
          },
          { id: "neighbor", hostname: "other.spawnkit.games", service: "spawnkit-games" }
        ]
      })
    if (url.includes("certificate_packs"))
      return Response.json({
        success: true,
        result: [
          {
            id: "owned-cert",
            type: "advanced",
            hosts: ["spawnkit.games", "game.spawnkit.games", "*.game.spawnkit.games"]
          },
          { id: "shared-cert", type: "universal", hosts: ["spawnkit.games", "*.spawnkit.games"] }
        ]
      })
    const name = new URL(url).searchParams.get("name")!
    return Response.json({
      success: true,
      result:
        name === "*.game.spawnkit.games"
          ? [{ id: "wildcard", name, type: "A", content: "192.0.2.0", proxied: true }]
          : []
    })
  })
  vi.stubGlobal("fetch", provider)
  const request = (name = "Game", owner = "creator") =>
    deleteProject(
      new Request("https://test/projects/p", { method: "DELETE", body: JSON.stringify({ name }) }),
      env,
      owner,
      "p"
    )
  return { db, env, objects, cancel, telemetry, provider, providerDeletes, request }
}

it("requires the owner and exact saved name, then atomically takes every origin offline", async () => {
  const f = fixture()
  await expect(f.request("Game", "other")).rejects.toMatchObject({ status: 404 })
  await expect(f.request("game")).rejects.toMatchObject({ status: 400 })
  expect(f.provider).not.toHaveBeenCalled()
  await f.request()
  await f.request()
  expect(f.db.prepare("SELECT lifecycle FROM projects WHERE id='p'").get()?.lifecycle).toBe("deleting")
  expect(f.db.prepare("SELECT enabled,current_release_id FROM environments WHERE project_id='p'").get()).toMatchObject({
    enabled: 0,
    current_release_id: null
  })
  expect((await (await publicGames(f.env)).json<{ games: unknown[] }>()).games).toHaveLength(0)
  expect(f.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='project.deletion-requested'").get()?.n).toBe(1)
  expect(() => f.db.exec("UPDATE environments SET enabled=1 WHERE project_id='p'")).toThrow("deleted")
  expect(() => f.db.exec("INSERT INTO uploads VALUES('late','p','digest',1,'ready','2099')")).toThrow("deleted")
})

it("drains live work, deletes paginated project files and owned providers, and keeps audit evidence", async () => {
  const f = fixture()
  for (let i = 0; i < 1101; i++) f.objects.set(`releases/p/r/${i}.js`, "data")
  f.db.exec("INSERT INTO project_resource_operations VALUES('upload','p',9999999999999)")
  await f.request()
  await processProjectDeletion(f.env, "p")
  expect(f.cancel).not.toHaveBeenCalled()
  f.db.exec("DELETE FROM project_resource_operations")
  f.cancel.mockResolvedValueOnce(false)
  await processProjectDeletion(f.env, "p")
  expect(f.provider).not.toHaveBeenCalled()
  await processProjectDeletion(f.env, "p")
  expect(await deletionStatus(f.env, "p")).toMatchObject({ state: "pending" })
  expect(f.db.prepare("SELECT reserved FROM build_queue").get()?.reserved).toBe(0)
  await processProjectDeletion(f.env, "p")
  expect(await deletionStatus(f.env, "p")).toMatchObject({ state: "complete" })
  expect([...f.objects.keys()]).toEqual(["releases/p-other/r/index.html", "sources/other/a.gz"])
  expect(f.telemetry.mock.calls.length).toBe(2)
  expect(f.providerDeletes).toHaveLength(3)
  expect(f.providerDeletes.join(" ")).not.toMatch(/neighbor|shared-cert/)
  for (const table of [
    "uploads",
    "releases",
    "deployments",
    "logs",
    "game_submissions",
    "game_comments",
    "game_ratings",
    "game_activity_totals",
    "project_deletion_builds",
    "project_resource_operations",
    "deployment_hostnames",
    "environments"
  ])
    expect({ table, count: f.db.prepare(`SELECT COUNT(*) n FROM ${table}`).get()?.n }).toEqual({ table, count: 0 })
  expect(f.db.prepare("SELECT slug FROM project_hostnames").all()).toEqual([{ slug: "other" }])
  expect(f.db.prepare("SELECT lifecycle,name,configuration FROM projects WHERE id='p'").get()).toMatchObject({
    lifecycle: "deleted",
    name: "Deleted project",
    configuration: "{}"
  })
  expect(f.db.prepare("SELECT action FROM audit_events ORDER BY created_at").all()).toEqual([
    { action: "project.deletion-requested" },
    { action: "project.deleted" }
  ])
  expect(f.db.prepare("PRAGMA foreign_key_check").all()).toEqual([])
  await f.request()
  expect(f.providerDeletes).toHaveLength(3)
  expect(() => f.db.exec("UPDATE projects SET lifecycle='active' WHERE id='p'")).toThrow("restored")
})

it("persists provider failures and reserves the address until an idempotent retry succeeds", async () => {
  const f = fixture()
  await f.request()
  f.provider.mockResolvedValueOnce(Response.json({ success: false }, { status: 503 }))
  await processProjectDeletion(f.env, "p")
  expect(await deletionStatus(f.env, "p")).toMatchObject({ state: "retrying" })
  expect(f.db.prepare("SELECT slug FROM project_hostnames WHERE project_id='p'").get()?.slug).toBe("game")
  expect(f.db.prepare("SELECT lifecycle FROM projects WHERE id='p'").get()?.lifecycle).toBe("deleting")
  const calls = f.provider.mock.calls.length
  await processProjectDeletion(f.env, "p")
  expect(f.provider.mock.calls.length).toBe(calls)
  await f.request()
  await processProjectDeletion(f.env, "p")
  expect(await deletionStatus(f.env, "p")).toMatchObject({ state: "complete" })
  expect(f.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='project.deletion-retry'").get()?.n).toBe(1)
})

it.each([200, 204])("accepts an empty successful provider deletion response (%s)", async (status) => {
  const f = fixture()
  const provider = f.provider.getMockImplementation()!
  f.provider.mockImplementation((input, init) =>
    init?.method === "DELETE" ? Promise.resolve(new Response(null, { status })) : provider(input, init)
  )
  await f.request()
  await processProjectDeletion(f.env, "p")
  expect(await deletionStatus(f.env, "p")).toMatchObject({ state: "complete" })
  expect([...f.objects.keys()]).toEqual(["releases/p-other/r/index.html", "sources/other/a.gz"])
})

it("does not accept an empty failed provider deletion response", async () => {
  const f = fixture()
  const provider = f.provider.getMockImplementation()!
  f.provider.mockImplementation((input, init) =>
    init?.method === "DELETE" ? Promise.resolve(new Response(null, { status: 503 })) : provider(input, init)
  )
  await f.request()
  await processProjectDeletion(f.env, "p")
  expect(await deletionStatus(f.env, "p")).toMatchObject({ state: "retrying" })
  expect(f.objects.has("releases/p/r/index.html")).toBe(true)
  expect(f.db.prepare("SELECT slug FROM project_hostnames WHERE project_id='p'").get()?.slug).toBe("game")
})

it("removes a late artifact write crossing the deletion fence and rejects subsequent writes", async () => {
  const f = fixture()
  Object.assign(f.env.ARTIFACTS, {
    async put(key: string) {
      f.objects.set(key, "late")
      await f.request()
    }
  })
  await expect(putProjectArtifact(f.env, "p", "sources/p/late.gz", new Uint8Array([1]))).rejects.toMatchObject({
    code: "project_deleting"
  })
  expect(f.objects.has("sources/p/late.gz")).toBe(false)
  await expect(putProjectArtifact(f.env, "p", "sources/p/another.gz", new Uint8Array([1]))).rejects.toMatchObject({
    code: "project_deleting"
  })
  expect(f.db.prepare("SELECT COUNT(*) n FROM project_resource_operations").get()?.n).toBe(0)
})

it("does not detach domains belonging to another service", async () => {
  const f = fixture()
  await f.request()
  f.provider.mockResolvedValueOnce(
    Response.json({
      success: true,
      result: [{ id: "foreign", hostname: "game.spawnkit.games", service: "other-service" }]
    })
  )
  await processProjectDeletion(f.env, "p")
  expect(f.providerDeletes).toHaveLength(0)
  expect(await deletionStatus(f.env, "p")).toMatchObject({ state: "retrying" })
})
