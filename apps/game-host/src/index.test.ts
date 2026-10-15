import { DatabaseSync } from "node:sqlite"
import { expect, it, vi } from "vitest"
import worker from "./index"

it("caches release bytes without delaying rollback or serving a closed preview", async () => {
  const entries = new Map<string, Response>()
  const writes: Promise<unknown>[] = []
  let current: string | null = "v1"
  const get = vi.fn<(key: string) => Promise<{ body: string; size: number; httpEtag: string }>>(async (key) => ({
    body: key,
    size: key.length,
    httpEtag: `"${key}"`
  }))
  const env = {
    SLOT: "",
    DATABASE: {
      prepare: () => ({
        bind: () => ({
          first: async () => (current ? { project_id: "p", current_release_id: current, immutable: 1 } : null)
        })
      })
    },
    ARTIFACTS: { get }
  } as unknown as Env
  vi.stubGlobal("caches", {
    default: {
      match: async (request: Request) => entries.get(request.url)?.clone(),
      put: async (request: Request, response: Response) => {
        entries.set(request.url, response)
      }
    }
  })
  const ctx = { waitUntil: (promise: Promise<unknown>) => writes.push(promise) } as unknown as ExecutionContext
  const request = new Request("https://d-a1b2c3d4.game.spawnkit.cloud/assets/game.js")
  try {
    const first = await worker.fetch(request, env, ctx)
    expect(first.headers.get("cache-control")).toContain("immutable")
    expect(await first.text()).toContain("v1")
    await Promise.all(writes)
    expect(await (await worker.fetch(request, env, ctx)).text()).toContain("v1")
    expect(get).toHaveBeenCalledTimes(1)
    current = "v2"
    expect(await (await worker.fetch(request, env, ctx)).text()).toContain("v2")
    await Promise.all(writes)
    current = "v1"
    expect(await (await worker.fetch(request, env, ctx)).text()).toContain("v1")
    expect(get).toHaveBeenCalledTimes(2)
    const conditional = new Request(request, { headers: { "if-none-match": '"releases/p/v1/assets/game.js"' } })
    expect((await worker.fetch(conditional, env, ctx)).status).toBe(304)
    expect(await (await worker.fetch(new Request(request, { method: "HEAD" }), env, ctx)).text()).toBe("")
    current = null
    expect((await worker.fetch(request, env, ctx)).status).toBe(404)
  } finally {
    vi.unstubAllGlobals()
  }
})

it("resolves the exact hostname and serves only that project's current release", async () => {
  const hosts: Record<string, { project_id: string; current_release_id: string | null }> = {
    "one-prod.spawnkit.cloud": { project_id: "one", current_release_id: "release-one" },
    "two-stage.spawnkit.cloud": { project_id: "two", current_release_id: "release-two" }
  }
  const get = vi.fn<(key: string) => Promise<{ body: string; size: number; httpEtag: string }>>(
    async (key: string) => ({ body: key, size: key.length, httpEtag: '"test"' })
  )
  const env = {
    SLOT: "",
    DATABASE: {
      prepare: (sql: string) => {
        expect(sql).toContain("e.enabled=1")
        return { bind: (hostname: string) => ({ first: async () => hosts[hostname] ?? null }) }
      }
    },
    ARTIFACTS: { get }
  } as unknown as Env
  expect(await (await worker.fetch(new Request("https://one-prod.spawnkit.cloud/"), env)).text()).toBe(
    "releases/one/release-one/index.html"
  )
  expect(await (await worker.fetch(new Request("https://two-stage.spawnkit.cloud/"), env)).text()).toBe(
    "releases/two/release-two/index.html"
  )
  expect((await worker.fetch(new Request("https://unknown-prod.spawnkit.cloud/"), env)).status).toBe(404)
  expect((await worker.fetch(new Request("https://spawnkit.cloud/"), env)).status).toBe(404)
  expect(get).toHaveBeenCalledTimes(2)
  expect((await worker.fetch(new Request("https://one-prod.spawnkit.cloud/%2e%2e%2fprivate"), env)).status).toBe(400)
})

it("keeps aliases movable, pins deployment artifacts, and closes every address of a disabled preview", async () => {
  const db = new DatabaseSync(":memory:")
  db.exec(`
    CREATE TABLE hosting_slots(slot TEXT, hostname TEXT, project_id TEXT, environment TEXT);
    CREATE TABLE hosting_aliases(hostname TEXT, slot TEXT);
    CREATE TABLE environments(project_id TEXT, name TEXT, current_release_id TEXT, enabled INTEGER);
    CREATE TABLE deployment_hostnames(deployment_id TEXT, hostname TEXT, project_id TEXT, environment TEXT, release_id TEXT);
    CREATE TABLE deployments(id TEXT, status TEXT);
    CREATE TABLE releases(id TEXT, project_id TEXT, status TEXT);
    INSERT INTO hosting_slots VALUES('slot','pr-42.ember.spawnkit.cloud','p','preview-42');
    INSERT INTO hosting_aliases VALUES('old-long-test-preview.spawnkit.cloud','slot');
    INSERT INTO environments VALUES('p','preview-42','v2',1);
    INSERT INTO deployment_hostnames VALUES('d1','d-a1b2c3d4.ember.spawnkit.cloud','p','preview-42','v1');
    INSERT INTO deployments VALUES('d1','succeeded');
    INSERT INTO releases VALUES('v1','p','ready');
  `)
  const env = {
    SLOT: "",
    DATABASE: {
      prepare: (sql: string) => ({ bind: (value: string) => ({ first: async () => db.prepare(sql).get(value) }) })
    },
    ARTIFACTS: { get: async (key: string) => ({ body: key, size: key.length, httpEtag: '"test"' }) }
  } as unknown as Env
  const get = (host: string) => worker.fetch(new Request(`https://${host}/`), env)
  try {
    expect(await (await get("pr-42.ember.spawnkit.cloud")).text()).toBe("releases/p/v2/index.html")
    expect(await (await get("old-long-test-preview.spawnkit.cloud")).text()).toBe("releases/p/v2/index.html")
    expect(await (await get("d-a1b2c3d4.ember.spawnkit.cloud")).text()).toBe("releases/p/v1/index.html")
    db.exec("UPDATE environments SET enabled=0")
    for (const host of [
      "pr-42.ember.spawnkit.cloud",
      "old-long-test-preview.spawnkit.cloud",
      "d-a1b2c3d4.ember.spawnkit.cloud"
    ])
      expect((await get(host)).status).toBe(404)
  } finally {
    db.close()
  }
})
