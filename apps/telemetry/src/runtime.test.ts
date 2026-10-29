import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { createTelemetry } from "@spawn/telemetry"
import { LIMITS } from "@spawn/telemetry/protocol"
import { Miniflare, convertV4MiniflareOptions } from "miniflare"
import { build } from "rolldown"
import { afterAll, beforeAll, expect, it } from "vitest"

let mf: Miniflare
let directory: string
let requestNumber = 0
beforeAll(async () => {
  directory = await mkdtemp(resolve("../../work/telemetry-runtime-"))
  const source = JSON.stringify(resolve("src/index.ts").replaceAll("\\", "/"))
  // Test-only alarm scheduling; production exports have no scheduling or storage-inspection RPC.
  await writeFile(
    resolve(directory, "entry.ts"),
    `export { default, TelemetryAdmin } from ${source};
    import { TelemetryStore as Base } from ${source};
    export class TelemetryStore extends Base {
      async scheduleTestAlarm() { await this.ctx.storage.setAlarm(Date.now() + 10) }
      async testAlarmState() { return this.ctx.storage.getAlarm() }
    }`
  )
  await build({
    input: resolve(directory, "entry.ts"),
    external: ["cloudflare:workers"],
    output: { file: resolve(directory, "worker.mjs"), format: "es" }
  })
  const script = await readFile(resolve(directory, "worker.mjs"), "utf8")
  mf = new Miniflare({
    ...convertV4MiniflareOptions({
      workers: [
        {
          name: "telemetry",
          modules: true,
          script,
          compatibilityDate: "2026-10-13",
          durableObjects: { TENANTS: { className: "TelemetryStore", useSQLite: true } },
          bindings: {
            SIGNING_KEY: "test-signing-key-only-never-production-123456",
            PUBLIC_ENDPOINT: "http://localhost/v1/logs"
          },
          ratelimits: { EDGE_LIMIT: { namespace_id: "7210", simple: { limit: 120, period: 60 } } }
        },
        {
          name: "admin-test",
          modules: true,
          unsafeDirectSockets: [{ host: "127.0.0.1", port: 0 }],
          script: "export default { fetch(request, env) { return env.ADMIN.fetch(request) } }",
          compatibilityDate: "2026-10-13",
          serviceBindings: { ADMIN: { name: "telemetry", entrypoint: "TelemetryAdmin" } }
        }
      ]
    }),
    resourcePersistencePath: resolve(directory, "storage"),
    unsafeInspectDurableObjects: true
  })
  await mf.ready
})
afterAll(async () => {
  await mf?.dispose()
  if (directory?.startsWith(resolve("../../work/telemetry-runtime-")))
    await rm(directory, { recursive: true, force: true })
})

async function admin(
  project: string,
  operation = "events",
  method = "GET",
  body?: unknown,
  environment = "production"
) {
  // Exercise real HTTP without Miniflare's RPC connection pool, whose idle
  // sockets can expire during the large SQLite fixture setup below.
  const url = new URL(`/${project}/${environment}/${operation}`, await mf.unsafeGetDirectURL("admin-test"))
  return fetch(url, {
    method,
    headers: { "content-type": "application/json", connection: "close" },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
}
async function configure(project: string, environment = "production") {
  const response = await admin(project, "settings", "PUT", { origins: ["https://game.example"] }, environment)
  expect(response.status).toBe(200)
  return (await response.json()) as { key: string }
}

function payload(id = crypto.randomUUID(), body = "event") {
  return {
    resourceLogs: [
      {
        resource: { attributes: [{ key: "service.name", value: { stringValue: "runtime-test" } }] },
        scopeLogs: [
          {
            logRecords: [
              {
                timeUnixNano: `${BigInt(Date.now()) * 1_000_000n}`,
                severityNumber: 9,
                eventName: body,
                body: { stringValue: body },
                attributes: [{ key: "spawn.event.id", value: { stringValue: id } }]
              }
            ]
          }
        ]
      }
    ]
  }
}
async function ingest(key: string, body: unknown, origin = "https://game.example") {
  return fetch(new URL("/v1/logs", await mf.ready), {
    method: "POST",
    headers: {
      "x-spawn-key": key,
      "content-type": "application/json",
      connection: "close",
      origin,
      "cf-connecting-ip": `192.0.2.${++requestNumber % 250}`
    },
    body: JSON.stringify(body)
  })
}

it("persists SDK events and isolates projects and environments in real Durable Object SQLite", async () => {
  const { key } = await configure("roundtrip")
  const client = createTelemetry({
    endpoint: "http://localhost/v1/logs",
    key,
    serviceName: "sdk-runtime",
    release: "release-42",
    consent: "granted",
    flushIntervalMs: 0,
    fetch: async (_url, init) => {
      const response = await mf.dispatchFetch("http://localhost/v1/logs", {
        method: "POST",
        headers: init?.headers as Record<string, string>,
        body: String(init?.body)
      })
      return new Response(await response.text(), { status: response.status })
    }
  })
  client.track("level.completed", { score: 42 })
  client.captureException(Error("save.failed"))
  client.measure("frame", 16, "ms")
  expect((await client.flush()).sent).toBe(3)
  const response = await admin("roundtrip")
  const page = (await response.json()) as {
    events: { name: string; release: string }[]
    summary: { total: number; errors: number }
    groups: unknown[]
  }
  expect(page.summary).toEqual({ total: 3, errors: 1 })
  expect(page.groups).toHaveLength(1)
  expect(page.events).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "level.completed", release: "release-42" })])
  )
  expect(((await (await admin("other")).json()) as { events: unknown[] }).events).toEqual([])
  expect(
    ((await (await admin("roundtrip", "events", "GET", undefined, "sandbox")).json()) as { events: unknown[] }).events
  ).toEqual([])
  const storage = await mf.unsafeGetDurableObjectStorage("telemetry", "TelemetryStore", {
    name: "roundtrip:production"
  })
  expect(await storage.exec("SELECT COUNT(*) AS count FROM events")).toEqual([{ count: 3 }])
  await mf.unsafeEvictDurableObject("telemetry", "TelemetryStore", { name: "roundtrip:production" })
  expect(((await (await admin("roundtrip")).json()) as { summary: { total: number } }).summary.total).toBe(3)
  await client.shutdown()
})

it("rejects forged keys, blocked origins and public admin access; rotation revokes previous keys", async () => {
  const { key } = await configure("keys")
  expect((await ingest(`${key.slice(0, -1)}${key.endsWith("a") ? "b" : "a"}`, payload())).status).toBe(401)
  expect((await ingest(key, payload(), "https://evil.example")).status).toBe(403)
  expect((await mf.dispatchFetch("http://localhost/keys/production/settings")).status).toBe(404)
  const next = await configure("keys")
  expect((await ingest(key, payload())).status).toBe(401)
  expect((await ingest(next.key, payload())).status).toBe(200)
})

it("enforces atomic quotas while acknowledging duplicate retries at the limit", async () => {
  const { key } = await configure("quota")
  const data = payload("stable-id")
  expect((await ingest(key, data)).status).toBe(200)
  const storage = await mf.unsafeGetDurableObjectStorage("telemetry", "TelemetryStore", { name: "quota:production" })
  await storage.exec("UPDATE counters SET value = ? WHERE key = 'quota:count'", LIMITS.dailyRecords)
  expect((await ingest(key, data)).status).toBe(200)
  const rejected = await ingest(key, payload("new-id"))
  expect(rejected.status).toBe(429)
  expect(rejected.headers.get("retry-after")).toBeTruthy()
  expect(await storage.exec("SELECT COUNT(*) AS count FROM events")).toEqual([{ count: 1 }])
  await admin("quota", "events", "DELETE")
  const rotated = await configure("quota")
  expect((await ingest(rotated.key, payload())).status).toBe(429)
})

it("sanitizes direct OTLP, accepts unknown fields and ordinary records, and rejects invalid batches atomically", async () => {
  const { key } = await configure("untrusted")
  const data = payload("direct", "email=user@example.com https://game.example/a?token=secret")
  const log = data.resourceLogs[0]!.scopeLogs[0]!.logRecords[0]!
  log.attributes.push({ key: "authorization", value: { stringValue: "Bearer credential" } })
  const accepted = await ingest(key, { ...data, unknownField: true })
  expect(accepted.status).toBe(200)
  expect(await accepted.json()).toEqual({})
  const page = await (await admin("untrusted")).text()
  expect(page).not.toContain("user@example.com")
  expect(page).not.toContain("credential")
  expect(page).not.toContain("?token")
  log.attributes = []
  expect((await ingest(key, data)).status).toBe(200)
  log.timeUnixNano = "invalid"
  expect((await ingest(key, data)).status).toBe(400)
  expect(
    (await ingest(key, { resourceLogs: [{ scopeLogs: [{ logRecords: Array.from({ length: 21 }, () => log) }] }] }))
      .status
  ).toBe(400)
  expect((await ingest(key, { huge: "x".repeat(LIMITS.batchBytes) })).status).toBe(413)
})

it("paginates without duplicates and hides expired records before physical cleanup", async () => {
  const { key } = await configure("pages")
  await ingest(key, payload("page-a"))
  await ingest(key, payload("page-b"))
  await ingest(key, payload("page-c"))
  const first = (await (await admin("pages", "events?limit=2")).json()) as {
    events: { id: string }[]
    nextCursor: string
    since: number
    until: number
  }
  expect(first.events).toHaveLength(2)
  const next = (await (
    await admin("pages", `events?limit=2&cursor=${first.nextCursor}&since=${first.since}&until=${first.until}`)
  ).json()) as { events: { id: string }[] }
  expect(next.events).toHaveLength(1)
  expect(first.events.map((event) => event.id)).not.toContain(next.events[0]!.id)
  const storage = await mf.unsafeGetDurableObjectStorage("telemetry", "TelemetryStore", { name: "pages:production" })
  await storage.exec("UPDATE events SET received = ?", Date.now() - LIMITS.retentionMs - 1000)
  expect(((await (await admin("pages")).json()) as { events: unknown[] }).events).toEqual([])
  await ingest(key, payload("fresh"))
  expect(await storage.exec("SELECT COUNT(*) AS count FROM events")).toEqual([{ count: 1 }])
})

it("bounds a burst and deduplicates concurrent submissions", async () => {
  const { key } = await configure("burst")
  const start = Date.now()
  const responses = await Promise.all(Array.from({ length: 20 }, () => ingest(key, payload("same-id"))))
  expect(responses.every((response) => response.status === 200)).toBe(true)
  const page = (await (await admin("burst")).json()) as { used: number; summary: { total: number } }
  expect(page.used).toBe(1)
  expect(page.summary.total).toBe(1)
  expect(Date.now() - start).toBeLessThan(10_000)
})

it("runs retention alarms in bounded batches and stops when storage is empty", async () => {
  const { key } = await configure("alarms")
  await ingest(key, payload("alarm-seed"))
  const storage = await mf.unsafeGetDurableObjectStorage("telemetry", "TelemetryStore", { name: "alarms:production" })
  await storage.exec("UPDATE events SET received = ?", Date.now() - LIMITS.retentionMs - 1000)
  await storage.exec(
    "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x < 2004) INSERT INTO events(id,received,level,kind,name,release,fingerprint,bytes,data,body) SELECT 'expired-'||x, received,level,kind,name,release,fingerprint,bytes,data,body FROM n CROSS JOIN events WHERE id = 'alarm-seed'"
  )
  await storage.exec(
    "INSERT INTO counters(key,value) VALUES('storage:count',2005),('storage:bytes',(SELECT SUM(bytes) FROM events)) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  )
  const namespace = await mf.getDurableObjectNamespace("TENANTS", "telemetry")
  const object = namespace.get(namespace.idFromName("alarms:production")) as unknown as {
    scheduleTestAlarm(): Promise<void>
    testAlarmState(): Promise<number | null>
  }
  await object.scheduleTestAlarm()
  await expect
    .poll(async () => (await storage.exec("SELECT COUNT(*) AS count FROM events"))[0]?.count, { timeout: 8000 })
    .toBe(0)
  expect(await object.testAlarmState()).toBeNull()
  expect(await storage.exec("SELECT value FROM counters WHERE key IN ('storage:count','storage:bytes')")).toEqual([
    { value: 0 },
    { value: 0 }
  ])
  expect(((await (await admin("alarms", "settings")).json()) as { used: number }).used).toBe(1)
}, 15_000)

it("accepts the official OTLP/HTTP exporter without a SpawnKit adapter", async () => {
  const { key } = await configure("official-otlp")
  const exporter = new OTLPLogExporter({ url: `${(await mf.ready).origin}/v1/logs`, headers: { "x-spawn-key": key } })
  const provider = new LoggerProvider({ processors: [new BatchLogRecordProcessor({ exporter })] })
  provider
    .getLogger("official-client")
    .emit({ eventName: "official.http", body: "Native OTLP exporter", severityNumber: 9, attributes: { score: 15 } })
  await provider.forceFlush()
  const page = (await (await admin("official-otlp")).json()) as { events: { name: string; body: string }[] }
  expect(page.events).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "official.http", body: "Native OTLP exporter" })])
  )
  await provider.shutdown()
})

it("keeps seven-day snapshot pagination valid after its retention boundary advances", async () => {
  const { key } = await configure("retention-page")
  await ingest(key, payload("recent"))
  const until = Date.now() - 10_000
  const response = await admin("retention-page", `events?since=${until - LIMITS.retentionMs}&until=${until}&limit=1`)
  expect(response.status).toBe(200)
})

it("queries a near-capacity tenant with large records while accepting ingestion", async () => {
  const { key } = await configure("capacity")
  const storage = await mf.unsafeGetDurableObjectStorage("telemetry", "TelemetryStore", { name: "capacity:production" })
  const now = Date.now()
  const data = JSON.stringify({
    id: "seed",
    time: now,
    received: now,
    level: "error",
    kind: "error",
    name: "capacity.error",
    body: "Capacity search target",
    service: "test",
    release: "v1",
    environment: "production",
    attributes: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`detail.${i}`, "x".repeat(1024)])),
    traceId: null,
    spanId: null,
    flags: 0,
    fingerprint: "seed-group"
  })
  // Keep each inspection RPC bounded, without reducing the measured data set.
  for (let first = 1; first <= 79000; first += 1000) {
    await storage.exec(
      "WITH RECURSIVE n(x) AS (VALUES(?) UNION ALL SELECT x+1 FROM n WHERE x < ?) INSERT INTO events(id, received, level, kind, name, release, fingerprint, bytes, data, body) SELECT 'seed-'||x, ?, 'error', 'error', 'capacity.error', 'v1', 'seed-group', ?, ?, 'Capacity search target' FROM n",
      first,
      first + 999,
      now,
      data.length,
      data
    )
  }
  await storage.exec(
    "INSERT INTO counters(key,value) VALUES('storage:count',79000),('storage:bytes',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    data.length * 79000
  )
  const start = Date.now()
  const [query, ingestion] = await Promise.all([
    admin("capacity", `events?since=${now - LIMITS.retentionMs}&until=${now}&query=Capacity&limit=50`),
    ingest(key, payload("during-query"))
  ])
  const page = (await query.json()) as { summary: { total: number }; groups: { count: number }[]; events: unknown[] }
  expect(query.status).toBe(200)
  expect(ingestion.status).toBe(200)
  expect(page.summary.total).toBe(79000)
  expect(page.groups[0]?.count).toBe(79000)
  expect(page.events).toHaveLength(50)
  expect(Date.now() - start).toBeLessThan(5000)
}, 60_000)

it("project purge removes tenant settings, events, counters and alarms without affecting another project", async () => {
  const { key } = await configure("deleted-project")
  await configure("kept-project")
  const response = await admin("deleted-project", "project", "DELETE")
  expect(response.status).toBe(200)
  expect((await admin("deleted-project", "project", "DELETE")).status).toBe(200)
  const storage = await mf.unsafeGetDurableObjectStorage("telemetry", "TelemetryStore", {
    name: "deleted-project:production"
  })
  const tables = await storage.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('events','settings','counters')"
  )
  expect(tables).toEqual([])
  expect((await (await admin("kept-project", "settings")).json()) as object).toMatchObject({ configured: true })
  expect((await ingest(key, payload())).status).toBe(401)
  await mf.unsafeEvictDurableObject("telemetry", "TelemetryStore", { name: "deleted-project:production" })
  expect((await ingest(key, payload())).status).toBe(401)
})
