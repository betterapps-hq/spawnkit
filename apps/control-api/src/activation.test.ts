import { generateKeyPairSync } from "node:crypto"
import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import { activate, type DeploymentRow } from "./activation"
import { deploymentRoute } from "./deployments"
import { queueGitHubBuild, retryGitHubPreview } from "./github"
import { reserveProjectSlug } from "./hosting"

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
    "0006_hostnames"
  ])
    db.exec(readFileSync(new URL(`../migrations/${name}.sql`, import.meta.url), "utf8"))
  db.exec(`INSERT INTO hosting_slots(slot,hostname) VALUES('01','game.example.com');
    INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('p','user','Test','{}','now','now');
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
  it("reserves a stable per-project origin without consuming the legacy hosting pool", async () => {
    const { db, env, deployment } = fixture()
    Object.assign(env, { HOSTING_MODE: "domains", HOSTING_TEST: "false" })
    await reserveProjectSlug(env.DATABASE, "p", "Test")
    db.exec("UPDATE project_hostnames SET ready=1")
    await activate(env, deployment)
    const original = db.prepare("SELECT hostname FROM hosting_slots WHERE project_id='p'").get()
    expect(original).toEqual({ hostname: "test.spawnkit.cloud" })
    db.exec("UPDATE projects SET name='Renamed'")
    await activate(env, deployment)
    expect(db.prepare("SELECT hostname FROM hosting_slots WHERE project_id='p'").get()).toEqual(original)
    expect(db.prepare("SELECT project_id FROM hosting_slots WHERE slot='01'").get()).toEqual({ project_id: null })
    expect(db.prepare("SELECT url FROM releases WHERE id='v1'").get()).toEqual({
      url: expect.stringMatching(/^https:\/\/d-[a-f0-9]{8}\.test\.spawnkit\.cloud$/)
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
    Object.assign(env, { HOSTING_MODE: "domains" })
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
    env.ARTIFACTS = { head: async () => ({}) } as unknown as R2Bucket
    const request = new Request("https://api.example.com/projects/p/promotions", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "promotion" },
      body: JSON.stringify({ releaseId: "v1", environment: "production", expectedReleaseId: null })
    })
    const result = await deploymentRoute(request, env, "p", "user", "promotions")
    expect(await result.json()).toMatchObject({ status: "succeeded", releaseId: "v1", url: "https://game.example.com" })
  })
  it("activates an immutable release and records one audit event on replay", async () => {
    const { db, env, deployment } = fixture()
    await activate(env, deployment)
    await activate(env, deployment)
    expect(db.prepare("SELECT current_release_id FROM environments").get()).toEqual({ current_release_id: "v1" })
    expect(db.prepare("SELECT COUNT(*) AS count FROM audit_events").get()).toEqual({ count: 1 })
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
