import { DatabaseSync } from "node:sqlite"
import { expect, it, vi } from "vitest"
import worker from "./index"

it.each(
  ["unknown hostname", "unpublished game", "missing artifact"].flatMap((scenario) =>
    ["missing.spawnkit.cloud", "missing.spawnkit.games"].map((hostname) => [scenario, hostname])
  )
)("serves a recoverable, uncached 404 for %s at %s", async (scenario, hostname) => {
  const get = vi.fn<() => Promise<null>>(async () => null)
  const env = {
    DATABASE: {
      prepare: () => ({
        bind: () => ({
          first: async () =>
            scenario === "unknown hostname"
              ? null
              : { project_id: "p", current_release_id: scenario === "unpublished game" ? null : "v1" }
        })
      })
    },
    ARTIFACTS: { get }
  } as unknown as Env
  const url = `https://${hostname}/deep/link?next=https://untrusted.example`
  const response = await worker.fetch(new Request(url), env)
  expect(response.status).toBe(404)
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(response.headers.get("x-robots-tag")).toBe("noindex")
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(response.headers.get("content-security-policy")).toContain("default-src 'none'")
  const html = await response.text()
  expect(html).toContain("<h1>Game not found</h1>")
  expect(html).toContain("Discover more games powered by SpawnKit.")
  expect(html).toContain('href="https://spawnkit.cloud/">Discover games')
  expect(html).not.toContain(hostname)
  expect(html).not.toContain("untrusted.example")
  expect(html).not.toContain("<script")
  expect(get).toHaveBeenCalledTimes(scenario === "missing artifact" && hostname.endsWith(".games") ? 1 : 0)

  const head = await worker.fetch(new Request(url, { method: "HEAD" }), env)
  expect(head.status).toBe(404)
  expect(Object.fromEntries(head.headers)).toEqual(Object.fromEntries(response.headers))
  expect(await head.text()).toBe("")
})

it.each(["GET", "HEAD"])(
  "redirects the games apex to discovery for %s without querying game storage",
  async (method) => {
    const prepare = vi.fn<D1Database["prepare"]>()
    const get = vi.fn<R2Bucket["get"]>()
    const env = { DATABASE: { prepare }, ARTIFACTS: { get } } as unknown as Env
    const response = await worker.fetch(
      new Request("https://spawnkit.games/unmatched?next=https://untrusted.example", { method }),
      env
    )
    expect(response.status).toBe(301)
    expect(response.headers.get("location")).toBe("https://spawnkit.cloud/")
    expect(await response.text()).toBe("")
    expect(prepare).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
  }
)

it("does not forward a submitted body from the games apex to the account site", async () => {
  const response = await worker.fetch(
    new Request("https://spawnkit.games/", { method: "POST", body: "test" }),
    {} as Env
  )
  expect(response.status).toBe(405)
  expect(response.headers.has("location")).toBe(false)
})

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
  const request = new Request("https://d-a1b2c3d4.game.spawnkit.games/assets/game.js")
  try {
    const first = await worker.fetch(request, env, ctx)
    expect(first.headers.get("cache-control")).toContain("immutable")
    expect(first.headers.get("cache-control")).not.toContain("no-transform")
    expect(await first.text()).toContain("v1")
    await Promise.all(writes)
    const cached = await worker.fetch(request, env, ctx)
    expect(cached.headers.get("cache-control")).not.toContain("no-transform")
    expect(await cached.text()).toContain("v1")
    expect(get).toHaveBeenCalledTimes(1)
    current = "v2"
    expect(await (await worker.fetch(request, env, ctx)).text()).toContain("v2")
    await Promise.all(writes)
    current = "v1"
    expect(await (await worker.fetch(request, env, ctx)).text()).toContain("v1")
    expect(get).toHaveBeenCalledTimes(2)
    const conditional = new Request(request, { headers: { "if-none-match": '"releases/p/v1/assets/game.js"' } })
    expect((await worker.fetch(conditional, env, ctx)).status).toBe(304)
    const compressed = new Request(request, {
      headers: { "if-none-match": '"other", W/"releases/p/v1/assets/game.js"' }
    })
    expect((await worker.fetch(compressed, env, ctx)).status).toBe(304)
    expect(await (await worker.fetch(new Request(request, { method: "HEAD" }), env, ctx)).text()).toBe("")
    current = null
    expect((await worker.fetch(request, env, ctx)).status).toBe(404)
  } finally {
    vi.unstubAllGlobals()
  }
})

it("resolves the exact hostname and serves only that project's current release", async () => {
  const hosts: Record<string, { project_id: string; current_release_id: string | null }> = {
    "one.spawnkit.games": { project_id: "one", current_release_id: "release-one" },
    "staging.two.spawnkit.games": { project_id: "two", current_release_id: "release-two" }
  }
  const get = vi.fn<(key: string) => Promise<{ body: string; size: number; httpEtag: string }>>(
    async (key: string) => ({ body: key, size: key.length, httpEtag: '"test"' })
  )
  const env = {
    DATABASE: {
      prepare: (sql: string) => {
        expect(sql).toContain("e.enabled=1")
        return { bind: (hostname: string) => ({ first: async () => hosts[hostname] ?? null }) }
      }
    },
    ARTIFACTS: { get }
  } as unknown as Env
  expect(await (await worker.fetch(new Request("https://one.spawnkit.games/"), env)).text()).toBe(
    "releases/one/release-one/index.html"
  )
  expect(await (await worker.fetch(new Request("https://staging.two.spawnkit.games/"), env)).text()).toBe(
    "releases/two/release-two/index.html"
  )
  expect((await worker.fetch(new Request("https://unknown-prod.spawnkit.cloud/"), env)).status).toBe(404)
  expect((await worker.fetch(new Request("https://spawnkit.cloud/"), env)).status).toBe(404)
  expect(get).toHaveBeenCalledTimes(2)
  expect((await worker.fetch(new Request("https://one.spawnkit.games/%2e%2e%2fprivate"), env)).status).toBe(400)
})

it("keeps aliases movable, pins deployment artifacts, and closes every address of a disabled preview", async () => {
  const db = new DatabaseSync(":memory:")
  db.exec(`
    CREATE TABLE hosting_slots(slot TEXT, hostname TEXT, project_id TEXT, environment TEXT);
    CREATE TABLE environments(project_id TEXT, name TEXT, current_release_id TEXT, enabled INTEGER);
    CREATE TABLE deployment_hostnames(deployment_id TEXT, hostname TEXT, project_id TEXT, environment TEXT, release_id TEXT);
    CREATE TABLE deployments(id TEXT, status TEXT);
    CREATE TABLE releases(id TEXT, project_id TEXT, status TEXT);
    CREATE TABLE game_moderation(project_id TEXT PRIMARY KEY, state TEXT);
    INSERT INTO hosting_slots VALUES('slot','pr-42.ember.spawnkit.games','p','preview-42');
    INSERT INTO environments VALUES('p','preview-42','v2',1);
    INSERT INTO deployment_hostnames VALUES('d1','d-a1b2c3d4.ember.spawnkit.games','p','preview-42','v1');
    INSERT INTO deployments VALUES('d1','succeeded');
    INSERT INTO releases VALUES('v1','p','ready');
  `)
  const env = {
    DATABASE: {
      prepare: (sql: string) => ({ bind: (value: string) => ({ first: async () => db.prepare(sql).get(value) }) })
    },
    ARTIFACTS: { get: async (key: string) => ({ body: key, size: key.length, httpEtag: '"test"' }) }
  } as unknown as Env
  const get = (host: string) => worker.fetch(new Request(`https://${host}/`), env)
  try {
    expect(await (await get("pr-42.ember.spawnkit.games")).text()).toBe("releases/p/v2/index.html")
    expect((await get("old-long-test-preview.spawnkit.cloud")).status).toBe(404)
    expect(await (await get("d-a1b2c3d4.ember.spawnkit.games")).text()).toBe("releases/p/v1/index.html")
    expect(await (await get("pr-42.ember.spawnkit.games")).text()).toBe("releases/p/v2/index.html")
    expect(await (await get("d-a1b2c3d4.ember.spawnkit.games")).text()).toBe("releases/p/v1/index.html")
    // A cached artifact or an unsupported address must not bypass project-wide restrictions.
    const cacheMatch = vi.fn<() => Promise<Response>>(async () => new Response("cached game"))
    vi.stubGlobal("caches", { default: { match: cacheMatch } })
    db.exec("INSERT INTO game_moderation VALUES('p','restricted')")
    for (const hostname of [
      "pr-42.ember.spawnkit.games",
      "pr-42.ember.spawnkit.games",
      "old-long-test-preview.spawnkit.cloud",
      "d-a1b2c3d4.ember.spawnkit.games",
      "d-a1b2c3d4.ember.spawnkit.games"
    ]) {
      for (const [path, init] of [
        ["/", {}],
        ["/assets/game.js", {}],
        ["/assets/game.js", { method: "HEAD" }],
        ["/trailer.webm", { headers: { range: "bytes=0-9" } }]
      ] as const) {
        const response = await worker.fetch(new Request(`https://${hostname}${path}`, init), env)
        expect(response.status).toBe(404)
        expect(response.headers.get("cache-control")).toBe("no-store")
        expect(response.headers.has("location")).toBe(false)
      }
    }
    expect(cacheMatch).not.toHaveBeenCalled()
    db.exec("UPDATE game_moderation SET state='hidden'")
    expect((await get("pr-42.ember.spawnkit.games")).status).toBe(200)
    expect(cacheMatch).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
    db.exec("UPDATE environments SET enabled=0")
    for (const host of [
      "pr-42.ember.spawnkit.games",
      "old-long-test-preview.spawnkit.cloud",
      "d-a1b2c3d4.ember.spawnkit.games"
    ])
      expect((await get(host)).status).toBe(404)
  } finally {
    vi.unstubAllGlobals()
    db.close()
  }
})
