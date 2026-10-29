import { afterEach, expect, it } from "vitest"
import type { DeploymentRow } from "./activation"
import { automaticSubmission } from "./automatic-submission"
import { communityFixture } from "./community-fixture"
import { projectListing } from "./project-listing"

const opened: ReturnType<typeof communityFixture>[] = []
afterEach(() => {
  for (const { db } of opened.splice(0)) db.close()
})
const config = {
  title: "From configuration",
  description: "The deployed description.",
  genre: "Shooter",
  dimension: "3D",
  details: { controls: "Arrow keys" }
}
function fixture() {
  const item = communityFixture()
  opened.push(item)
  return item
}
async function listing(env: Env) {
  return (await (await projectListing(new Request("https://api.test/listing"), env, "creator", "p")).json()) as {
    title: string
    description: string
    genre: string
    dimension: string
    details: object
    revision: number
    releaseId: string
    overridden: boolean
  }
}
async function save(env: Env, title = "Dashboard title") {
  const current = await listing(env)
  await projectListing(
    new Request("https://api.test/listing", {
      method: "PUT",
      body: JSON.stringify({
        ...current,
        title,
        description: "A dashboard description.",
        genre: "Puzzle",
        dimension: "2D",
        details: { controls: "Mouse" },
        reset: false
      })
    }),
    env,
    "creator",
    "p"
  )
}
async function prepare(item: ReturnType<typeof fixture>, id: string, manifest?: unknown) {
  item.db
    .prepare(
      "INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES(?,'p',?,'ready','production',?)"
    )
    .run(id, id, id)
  item.db
    .prepare(
      "INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES(?,'p',?,'production','succeeded','deployments',?,'hash','creator',?,?)"
    )
    .run(id, id, id, id, id)
  item.db.prepare("INSERT INTO deployment_hostnames VALUES(?,?,'p','production',?)").run(id, `${id}.spawnkit.games`, id)
  item.env.ARTIFACTS = {
    get: async (key: string) =>
      manifest === undefined || !key.endsWith("/spawnkit.config.json")
        ? null
        : { size: 100, text: async () => JSON.stringify(manifest) }
  } as unknown as R2Bucket
  return automaticSubmission(
    item.env,
    { id, project_id: "p", release_id: id } as DeploymentRow,
    `2026-10-17T12:00:00.${id.slice(-1)}00Z`
  )
}
async function deploy(item: ReturnType<typeof fixture>, id: string, manifest?: unknown) {
  const statements = await prepare(item, id, manifest)
  item.db.prepare("UPDATE environments SET current_release_id=? WHERE project_id='p'").run(id)
  await item.env.DATABASE.batch(statements)
  return statements
}

it("uses the last dashboard save or configured deployment, preserving details when config is absent", async () => {
  const f = fixture()
  await save(f.env)
  await deploy(f, "v1", config)
  expect(await listing(f.env)).toMatchObject({ ...config, overridden: false, revision: 2 })
  expect(f.db.prepare("SELECT title,genre FROM game_submissions WHERE id='s'").get()).toMatchObject({
    title: config.title,
    genre: config.genre
  })
  await save(f.env, "Edited after deployment")
  await deploy(f, "v2")
  expect(await listing(f.env)).toMatchObject({
    title: "Edited after deployment",
    genre: "Puzzle",
    dimension: "2D",
    details: { controls: "Mouse" },
    overridden: true,
    revision: 3
  })
  await deploy(f, "v3", { ...config, title: "Next configured release", details: {} })
  expect(await listing(f.env)).toMatchObject({
    title: "Next configured release",
    details: {},
    overridden: false,
    revision: 4
  })
  await deploy(f, "v4")
  expect(await listing(f.env)).toMatchObject({
    title: "Next configured release",
    genre: config.genre,
    overridden: false,
    revision: 4
  })
})

it.each([
  {},
  { coverPath: null, trailerPath: null },
  [],
  { title: "", description: "bad" },
  { ...config, genre: "Invalid genre" }
])("preserves saved details for unusable or generated metadata: %j", async (manifest) => {
  const f = fixture()
  await save(f.env)
  await deploy(f, "v1", manifest)
  expect(await listing(f.env)).toMatchObject({ title: "Dashboard title", genre: "Puzzle", revision: 1 })
})

it("does not replay config over dashboard edits when activation is retried", async () => {
  const f = fixture()
  const statements = await deploy(f, "v1", config)
  await save(f.env)
  await f.env.DATABASE.batch(statements)
  expect(await listing(f.env)).toMatchObject({ title: "Dashboard title", revision: 2, overridden: true })
  expect(f.db.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='listing.deployment'").get()?.n).toBe(1)
})

it("reads dashboard changes at activation time when there is no config", async () => {
  const f = fixture()
  const statements = await prepare(f, "v1")
  await save(f.env, "Saved during the build")
  f.db.exec("UPDATE environments SET current_release_id='v1'")
  await f.env.DATABASE.batch(statements)
  expect(await listing(f.env)).toMatchObject({ title: "Saved during the build" })
})

it("does not change listing settings for superseded deployments and rolls back a failed transaction", async () => {
  const f = fixture()
  await save(f.env)
  const statements = await prepare(f, "v1", config)
  await f.env.DATABASE.batch(statements)
  expect(await listing(f.env)).toMatchObject({ title: "Dashboard title", revision: 1 })
  f.db.exec("UPDATE environments SET current_release_id='v1'")
  await expect(
    f.env.DATABASE.batch([...statements, f.env.DATABASE.prepare("INSERT INTO nonexistent_table VALUES(1)")])
  ).rejects.toThrow("no such table: nonexistent_table")
  expect(await listing(f.env)).toMatchObject({ title: "Dashboard title", revision: 1 })
  expect(f.db.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='listing.deployment'").get()?.n).toBe(0)
})

it("rejects a stale dashboard form after a configured deployment", async () => {
  const f = fixture()
  const old = await listing(f.env)
  await deploy(f, "v1", config)
  await expect(
    projectListing(
      new Request("https://api.test/listing", {
        method: "PUT",
        body: JSON.stringify({ ...old, ...config, reset: false })
      }),
      f.env,
      "creator",
      "p"
    )
  ).rejects.toMatchObject({ status: 409 })
})

it("reads and activates stored configurations", async () => {
  const f = fixture()
  await deploy(f, "v1", config)
  expect(await listing(f.env)).toMatchObject({
    title: config.title,
    genre: config.genre,
    dimension: config.dimension
  })
  f.db.exec("DELETE FROM project_listing_settings; DELETE FROM game_submissions")
  expect(await listing(f.env)).toMatchObject({
    title: config.title,
    genre: config.genre,
    dimension: config.dimension
  })
})
