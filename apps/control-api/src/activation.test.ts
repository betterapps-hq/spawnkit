import { createHash, generateKeyPairSync } from "node:crypto"
import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import { activate, type DeploymentRow } from "./activation"
import { deploymentRoute } from "./deployments"
import { queueGitHubBuild, retryGitHubPreview } from "./github"
import { reserveDeploymentHostname, reserveProjectSlug } from "./hosting"

const databases: DatabaseSync[] = []
afterEach(() => {
  vi.unstubAllGlobals()
  for (const db of databases.splice(0)) db.close()
})
function fixture() {
  const db = new DatabaseSync(":memory:")
  databases.push(db)
  for (const name of [
    "0001_control",
    "0002_project_metadata",
    "0003_activation_lock",
    "0004_hosting_slots",
    "0005_github",
    "0006_hostnames",
    "0010_game_submissions",
    "0011_submission_media",
    "0014_game_metadata_feedback",
    "0017_release_media_warnings",
    "0018_game_domains",
    "0019_moderation",
    "0020_community_access_reports",
    "0022_game_details",
    "0013_game_activity",
    "0015_monthly_game_activity",
    "0024_project_deletion"
  ])
    db.exec(readFileSync(new URL(`../migrations/${name}.sql`, import.meta.url), "utf8"))
  db.exec(`
    INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('p','user','Test','{}','now','now');
    INSERT INTO project_hostnames(project_id,slug,ready,domain) VALUES('p','test',1,'spawnkit.games');
    INSERT INTO environments(id,project_id,name,enabled) VALUES('p:production','p','production',1);
    INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES('v1','p','b1','ready','production','now');
    INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES('d1','p','v1','production','activating','promotions','k1','h1','user','now','now');`)
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
      async run() {
        return db.prepare(sql).run(...values)
      }
    }
    return statement
  }
  const env = {
    ARTIFACTS: { get: async () => null, head: async () => null },
    DATABASE: {
      prepare,
      async batch(statements: ReturnType<typeof prepare>[]) {
        db.exec("BEGIN")
        try {
          const result = []
          for (const statement of statements) result.push(await statement.run())
          db.exec("COMMIT")
          return result
        } catch (error) {
          db.exec("ROLLBACK")
          throw error
        }
      }
    }
  } as unknown as Env
  const deployment: DeploymentRow = {
    id: "d1",
    project_id: "p",
    release_id: "v1",
    upload_id: "",
    environment: "production",
    status: "activating",
    expected_release_id: null
  }
  return { db, env, deployment }
}

describe("atomic release activation", () => {
  it("reuses an immutable deployment reservation without changing its release", async () => {
    const { db, env, deployment } = fixture()
    db.exec(
      "INSERT INTO deployment_hostnames(deployment_id,hostname,project_id,environment,release_id) VALUES('d1','d-a1b2c3d4.ember.spawnkit.games','p','production','v1')"
    )
    const hostname = await reserveDeploymentHostname(env.DATABASE, deployment, "ember.spawnkit.games")
    expect(hostname).toBe("d-a1b2c3d4.ember.spawnkit.games")
    expect(await reserveDeploymentHostname(env.DATABASE, deployment, "ember.spawnkit.games")).toBe(hostname)
    expect(db.prepare("SELECT release_id FROM deployment_hostnames WHERE deployment_id='d1'").get()).toEqual({
      release_id: "v1"
    })
  })
  it("returns persistent media warnings and the dashboard URL without review metadata", async () => {
    const { db, env } = fixture()
    env.DASHBOARD_URL = "https://spawnkit.cloud"
    const warnings = [{ kind: "cover", message: "Cover input must be between 1 byte and 1 MiB." }]
    db.prepare("UPDATE releases SET media_warnings=? WHERE id='v1'").run(JSON.stringify(warnings))
    const result = await deploymentRoute(
      new Request("https://api.example/api/platform/v1/projects/p/deployments/d1"),
      env,
      "p",
      "user",
      "deployments",
      "d1"
    )
    expect(await result.json()).toMatchObject({
      dashboardUrl: "https://spawnkit.cloud/dashboard/projects/p",
      mediaWarnings: warnings,
      status: "activating"
    })
  })
  it("reserves a stable per-project origin", async () => {
    const { db, env, deployment } = fixture()
    Object.assign(env, { HOSTING_TEST: "false" })
    await reserveProjectSlug(env.DATABASE, "p", "Test")
    db.exec("UPDATE project_hostnames SET ready=1,domain='spawnkit.games'")
    await activate(env, deployment)
    const original = db.prepare("SELECT hostname FROM hosting_slots WHERE project_id='p'").get()
    expect(original).toEqual({ hostname: "test.spawnkit.games" })
    db.exec("UPDATE projects SET name='Renamed'")
    await activate(env, deployment)
    expect(db.prepare("SELECT hostname FROM hosting_slots WHERE project_id='p'").get()).toEqual(original)
    expect(db.prepare("SELECT url FROM releases WHERE id='v1'").get()).toEqual({
      url: expect.stringMatching(/^https:\/\/d-[a-f0-9]{8}\.test\.spawnkit\.games$/)
    })
  })
  it("reserves duplicate display names atomically and keeps the chosen public name on rename", async () => {
    const { db, env } = fixture()
    db.exec(
      "INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('p2','user','Test','{}','now','now')"
    )
    const names = await Promise.all([
      reserveProjectSlug(env.DATABASE, "p", "Test"),
      reserveProjectSlug(env.DATABASE, "p2", "Test")
    ])
    expect(new Set(names).size).toBe(2)
    expect(names).toContain("test")
    expect(names.find((name) => name !== "test")).toMatch(/^test-[a-f0-9]{6}$/)
    expect(await reserveProjectSlug(env.DATABASE, "p", "Renamed")).toBe(names[0])
  })
  it("does not advertise an address before HTTPS provisioning is complete", async () => {
    const { db, env, deployment } = fixture()
    db.exec("UPDATE project_hostnames SET ready=0")
    await expect(activate(env, deployment)).rejects.toThrow("HTTPS provisioning is pending")
    expect(db.prepare("SELECT current_release_id FROM environments").get()).toEqual({ current_release_id: null })
  })
  it("pins a GitHub branch to a commit and deduplicates build requests", async () => {
    const { db, env } = fixture()
    db.exec(
      "INSERT INTO github_connections(project_id,installation_id,repository_id,repository,connected_by,created_at) VALUES('p',1,2,'team/game','user','now')"
    )
    Object.assign(env, {
      BUILDS_ENABLED: "true",
      GITHUB_APP_ID: "1",
      GITHUB_APP_PRIVATE_KEY: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({
        type: "pkcs8",
        format: "pem"
      }),
      GITHUB_CLIENT_ID: "client",
      GITHUB_CLIENT_SECRET: "secret",
      GITHUB_WEBHOOK_SECRET: "webhook"
    })
    const fetcher = vi.fn<(url: string) => Promise<Response>>(async (url: string) =>
      Response.json(url.includes("access_tokens") ? { token: "installation-token" } : { sha: "a".repeat(40) })
    )
    vi.stubGlobal("fetch", fetcher)
    const request = (branch = "main") =>
      new Request("https://api.example.com", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "request" },
        body: JSON.stringify({ environment: "production", branch, expectedReleaseId: null })
      })
    expect((await queueGitHubBuild(request(), env, "p")).status).toBe(202)
    expect((await queueGitHubBuild(request(), env, "p")).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(db.prepare("SELECT commit_sha FROM github_events").get()).toEqual({ commit_sha: "a".repeat(40) })
    await expect(queueGitHubBuild(request("different"), env, "p")).rejects.toMatchObject({ status: 409 })
  })
  it("does not enqueue builds when hosted execution is disabled", async () => {
    const { db, env } = fixture()
    await expect(queueGitHubBuild(new Request("https://api.example.com"), env, "p")).rejects.toMatchObject({
      status: 503
    })
    await expect(retryGitHubPreview(env, "p", "preview")).rejects.toMatchObject({ status: 503 })
    expect(db.prepare("SELECT COUNT(*) AS count FROM github_events").get()).toEqual({ count: 0 })
  })
  it("promotes a preview-origin artifact after a successful Sandbox deployment", async () => {
    const { db, env } = fixture()
    db.exec(
      "UPDATE releases SET environment='preview-7',artifact_digest='digest'; UPDATE deployments SET environment='sandbox',status='succeeded'"
    )
    env.ARTIFACTS = { head: async () => ({}), get: async () => null } as unknown as R2Bucket
    const request = new Request("https://api.example.com/projects/p/promotions", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "promotion" },
      body: JSON.stringify({ releaseId: "v1", environment: "production", expectedReleaseId: null })
    })
    const result = await deploymentRoute(request, env, "p", "user", "promotions")
    expect(await result.json()).toMatchObject({
      status: "succeeded",
      releaseId: "v1",
      url: "https://test.spawnkit.games"
    })
  })
  it("activates an immutable release and records one audit event on replay", async () => {
    const { db, env, deployment } = fixture()
    await activate(env, deployment)
    await activate(env, deployment)
    expect(db.prepare("SELECT current_release_id FROM environments").get()).toEqual({ current_release_id: "v1" })
    expect(db.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action='promotions'").get()).toEqual({
      count: 1
    })
  })
  it("does not replace a different current release", async () => {
    const { db, env, deployment } = fixture()
    db.exec("UPDATE environments SET current_release_id='newer'")
    await activate(env, deployment)
    expect(db.prepare("SELECT current_release_id FROM environments").get()).toEqual({ current_release_id: "newer" })
    expect(db.prepare("SELECT status FROM deployments").get()).toEqual({ status: "superseded" })
  })
  it.each(["closed", "newer"])("does not activate a %s pull-request build", async (reason) => {
    const { db, env, deployment } = fixture()
    db.exec(
      "INSERT INTO github_events(id,project_id,kind,environment,commit_sha,title,branch,status,deployment_id,created_at) VALUES('event','p','pull_request','production','sha','title','branch','submitted','d1','now')"
    )
    if (reason === "closed") db.exec("UPDATE github_events SET status='closed'")
    else
      db.exec(
        "INSERT INTO github_events(id,project_id,kind,environment,commit_sha,title,branch,created_at) VALUES('later','p','pull_request','production','sha2','title','branch','now')"
      )
    await activate(env, deployment)
    expect(db.prepare("SELECT current_release_id FROM environments").get()).toEqual({ current_release_id: null })
    expect(db.prepare("SELECT status FROM deployments").get()).toEqual({ status: "superseded" })
  })
})

it("automatically queues the exact live production release and retains reviewed metadata on replay", async () => {
  const { db, env, deployment } = fixture()
  await reserveProjectSlug(env.DATABASE, "p", "Test")
  db.exec("UPDATE project_hostnames SET ready=1,domain='spawnkit.games'")
  const video = readFileSync(new URL("../fixtures/trailer.mp4", import.meta.url))
  const trailer = `spawnkit-trailer-${createHash("sha256").update(video).digest("hex").slice(0, 20)}.mp4`
  env.ARTIFACTS = {
    get: async (key: string) =>
      key.endsWith(trailer)
        ? { size: video.length, arrayBuffer: async () => video }
        : {
            size: 200,
            text: async () =>
              JSON.stringify({
                title: "Orchard Snake",
                genre: "Arcade",
                dimension: "2D",
                description: "Collect apples in the orchard.",
                coverPath: "media/cover.png",
                trailerPath: trailer
              })
          },
    head: async () => ({ size: 1000 })
  } as unknown as R2Bucket
  await activate(env, deployment)
  expect(db.prepare("SELECT genre,dimension FROM game_submissions").get()).toEqual({ genre: "Arcade", dimension: "2D" })
  expect(
    db.prepare("SELECT title,status,release_id,deployment_id,cover_path,trailer_path FROM game_submissions").get()
  ).toEqual({
    title: "Orchard Snake",
    status: "pending",
    release_id: "v1",
    deployment_id: "d1",
    cover_path: null,
    trailer_path: trailer
  })
  db.exec("UPDATE game_submissions SET status='approved',reviewer_id='admin',reviewed_at='now'")
  await activate(env, deployment)
  expect(db.prepare("SELECT COUNT(*) AS count,status FROM game_submissions").get()).toEqual({
    count: 1,
    status: "approved"
  })
})
it("does not submit sandbox or superseded production deployments", async () => {
  const { db, env, deployment } = fixture()
  await reserveProjectSlug(env.DATABASE, "p", "Test")
  db.exec(
    "UPDATE project_hostnames SET ready=1,domain='spawnkit.games'; UPDATE environments SET current_release_id='newer'"
  )
  await activate(env, deployment)
  expect(db.prepare("SELECT COUNT(*) AS count FROM game_submissions").get()).toEqual({ count: 0 })
  db.exec(
    "UPDATE deployments SET environment='sandbox'; INSERT INTO environments(id,project_id,name,enabled) VALUES('p:sandbox','p','sandbox',1)"
  )
  await activate(env, { ...deployment, environment: "sandbox" })
  expect(db.prepare("SELECT COUNT(*) AS count FROM game_submissions").get()).toEqual({ count: 0 })
})
it("ignores invalid listing metadata and unsafe or oversized media while still queuing the game", async () => {
  const { db, env, deployment } = fixture()
  await reserveProjectSlug(env.DATABASE, "p", "Test")
  db.exec("UPDATE project_hostnames SET ready=1,domain='spawnkit.games'")
  const head = vi.fn<() => Promise<{ size: number }>>(async () => ({ size: 20 * 1024 * 1024 }))
  env.ARTIFACTS = {
    get: async () => ({
      size: 100,
      text: async () => JSON.stringify({ title: "", description: "bad", coverPath: "../cover.png" })
    }),
    head
  } as unknown as R2Bucket
  await activate(env, deployment)
  expect(db.prepare("SELECT title,description,status,cover_path,trailer_path FROM game_submissions").get()).toEqual({
    title: "Test",
    description: "Play Test in your browser.",
    status: "pending",
    cover_path: null,
    trailer_path: null
  })
  expect(head).not.toHaveBeenCalled()
})
it("backfills existing current production releases once without approving or replacing prior decisions", async () => {
  const { db, env, deployment } = fixture()
  await reserveProjectSlug(env.DATABASE, "p", "Test")
  db.exec("UPDATE project_hostnames SET ready=1,domain='spawnkit.games'")
  await activate(env, deployment)
  db.exec("DELETE FROM game_submissions")
  const migration = readFileSync(new URL("../migrations/0012_automatic_submissions.sql", import.meta.url), "utf8")
  db.exec(migration)
  expect(db.prepare("SELECT status,release_id FROM game_submissions").get()).toEqual({
    status: "pending",
    release_id: "v1"
  })
  db.exec("UPDATE game_submissions SET status='rejected',reviewer_id='admin',reviewed_at='now';" + migration)
  expect(db.prepare("SELECT COUNT(*) AS count,status FROM game_submissions").get()).toEqual({
    count: 1,
    status: "rejected"
  })
})
