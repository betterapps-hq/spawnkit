import { byteSize, LIMITS } from "@spawn/telemetry/protocol"
import { DurableObject } from "cloudflare:workers"
import { failure, requireValue, TelemetryError } from "./http"
import type { StoredEvent } from "./ingest"

interface Settings {
  generation: string
  origins: string[]
  enabled: boolean
}
type EventRow = { id: string; received: number; data: string }
const minute = 60_000
export function allowedOrigin(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return (
      value === url.origin &&
      (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
    )
  } catch {
    return false
  }
}

export class TelemetryStore extends DurableObject<Env> {
  private purged = false
  async purge() {
    this.purged = true
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
    return Response.json({ deleted: true })
  }
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id = 1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, received INTEGER NOT NULL, level TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, release TEXT NOT NULL, fingerprint TEXT, bytes INTEGER NOT NULL, data TEXT NOT NULL, body TEXT NOT NULL DEFAULT '');
      CREATE INDEX IF NOT EXISTS events_time ON events(received DESC, id DESC);
      CREATE INDEX IF NOT EXISTS events_level ON events(level, received DESC, id DESC);
      CREATE INDEX IF NOT EXISTS events_release ON events(release, received DESC, id DESC);
      CREATE INDEX IF NOT EXISTS events_fingerprint ON events(fingerprint, received DESC);
      CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
    `)
    if (
      !ctx.storage.sql
        .exec<{ name: string }>("PRAGMA table_info(events)")
        .toArray()
        .some((column) => column.name === "body")
    ) {
      ctx.storage.transactionSync(() => {
        ctx.storage.sql.exec("ALTER TABLE events ADD COLUMN body TEXT NOT NULL DEFAULT ''")
        ctx.storage.sql.exec("UPDATE events SET body = COALESCE(json_extract(data, '$.body'), '')")
      })
    }
    // Keep filtered counts and groups on a compact covering index. Reading body from
    // the main table otherwise walks the large JSON payload pages for every record.
    ctx.storage.sql.exec(
      "CREATE INDEX IF NOT EXISTS events_summary ON events(received,level,kind,name,release,fingerprint,body)"
    )
  }
  private settings(): Settings | null {
    const row = this.ctx.storage.sql.exec<{ data: string }>("SELECT data FROM settings WHERE id = 1").toArray()[0]
    return row ? (JSON.parse(row.data) as Settings) : null
  }
  private counter(key: string) {
    return (
      this.ctx.storage.sql.exec<{ value: number }>("SELECT value FROM counters WHERE key = ?", key).toArray()[0]
        ?.value ?? 0
    )
  }
  private setCounter(key: string, value: number) {
    this.ctx.storage.sql.exec(
      "INSERT INTO counters(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value
    )
  }
  private throttle(kind: string, limit: number) {
    const bucket = Math.floor(Date.now() / minute)
    if (this.counter(`${kind}:minute`) !== bucket) {
      this.setCounter(`${kind}:minute`, bucket)
      this.setCounter(`${kind}:count`, 0)
    }
    const count = this.counter(`${kind}:count`)
    if (count >= limit) throw new TelemetryError(429, "Request limit reached.", 60)
    this.setCounter(`${kind}:count`, count + 1)
  }
  private usage() {
    const day = Math.floor(Date.now() / 86_400_000)
    return {
      dailyLimit: LIMITS.dailyRecords,
      used: this.counter("quota:day") === day ? this.counter("quota:count") : 0,
      resetsAt: new Date((day + 1) * 86_400_000).toISOString(),
      retentionDays: 7
    }
  }
  private cleanup() {
    this.ctx.storage.transactionSync(() => {
      const removed = this.ctx.storage.sql
        .exec<{ bytes: number }>(
          "DELETE FROM events WHERE id IN (SELECT id FROM events WHERE received < ? ORDER BY received LIMIT 1000) RETURNING bytes",
          Date.now() - LIMITS.retentionMs
        )
        .toArray()
      this.setCounter("storage:count", Math.max(0, this.counter("storage:count") - removed.length))
      this.setCounter(
        "storage:bytes",
        Math.max(0, this.counter("storage:bytes") - removed.reduce((sum, row) => sum + row.bytes, 0))
      )
    })
  }
  async alarm() {
    if (this.purged) return
    this.cleanup()
    const first = this.ctx.storage.sql
      .exec<{ received: number }>("SELECT received FROM events ORDER BY received LIMIT 1")
      .toArray()[0]
    if (first) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, first.received + LIMITS.retentionMs + 1000))
  }
  async ingest(events: StoredEvent[], generation: string, origin: string | null): Promise<Response> {
    if (this.purged) return Response.json({ message: "Write key is disabled." }, { status: 401 })
    try {
      const settings = this.settings()
      if (!settings || !settings.enabled || settings.generation !== generation)
        throw new TelemetryError(401, "Write key is disabled or rotated.")
      if (origin && !settings.origins.includes(origin)) throw new TelemetryError(403, "Game origin is not allowed.")
      this.throttle("ingest", 60)
      this.cleanup()
      this.ctx.storage.transactionSync(() => {
        const seen = new Set<string>()
        const unique = events.filter((event) => {
          if (seen.has(event.id)) return false
          seen.add(event.id)
          return true
        })
        const fresh = unique.filter(
          (event) => !this.ctx.storage.sql.exec("SELECT id FROM events WHERE id = ?", event.id).toArray().length
        )
        if (!fresh.length) return
        const usage = this.usage()
        if (usage.used + fresh.length > usage.dailyLimit)
          throw new TelemetryError(
            429,
            "Daily telemetry quota reached.",
            Math.ceil((Date.parse(usage.resetsAt) - Date.now()) / 1000)
          )
        const size = { count: this.counter("storage:count"), bytes: this.counter("storage:bytes") }
        if (
          size.count + fresh.length > LIMITS.storedRecords ||
          size.bytes + fresh.reduce((sum, event) => sum + byteSize(event), 0) > 640 * 1024 * 1024
        )
          throw new TelemetryError(429, "Telemetry storage quota reached.", 3600)
        for (const event of fresh)
          this.ctx.storage.sql.exec(
            "INSERT INTO events(id,received,level,kind,name,release,fingerprint,bytes,data,body) VALUES(?,?,?,?,?,?,?,?,?,?)",
            event.id,
            event.received,
            event.level,
            event.kind,
            event.name,
            event.release,
            event.fingerprint,
            byteSize(event),
            JSON.stringify(event),
            event.body
          )
        this.setCounter("quota:day", Math.floor(Date.now() / 86_400_000))
        this.setCounter("quota:count", usage.used + fresh.length)
        this.setCounter("storage:count", size.count + fresh.length)
        this.setCounter("storage:bytes", size.bytes + fresh.reduce((sum, event) => sum + byteSize(event), 0))
      })
      if (events.length && (await this.ctx.storage.getAlarm()) === null)
        await this.ctx.storage.setAlarm(Date.now() + LIMITS.retentionMs + 1000)
      return Response.json({})
    } catch (error) {
      return failure(error)
    }
  }
  async manage(action: string, input: Record<string, unknown>): Promise<Response> {
    if (this.purged) return Response.json({ message: "Project was deleted." }, { status: 410 })
    try {
      this.throttle("admin", 30)
      if (action === "configure") {
        requireValue(
          Array.isArray(input.origins) && input.origins.length <= 10 && input.origins.every(allowedOrigin),
          "Provide up to ten exact HTTPS game origins (local HTTP allowed)."
        )
        requireValue(
          typeof input.generation === "string" && /^[a-f0-9-]{36}$/.test(input.generation),
          "Invalid key generation."
        )
        this.ctx.storage.sql.exec(
          "INSERT INTO settings(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
          JSON.stringify({ generation: input.generation, origins: [...new Set(input.origins)], enabled: true })
        )
        return Response.json({ configured: true, origins: input.origins, ...this.usage() })
      }
      if (action === "disable" || action === "erase") {
        const settings = this.settings()
        if (settings)
          this.ctx.storage.sql.exec(
            "UPDATE settings SET data = ? WHERE id = 1",
            JSON.stringify({ ...settings, enabled: false })
          )
        // Erasure is bounded because the entire tenant is capped at 80,000 records.
        if (action === "erase") {
          this.ctx.storage.sql.exec("DELETE FROM events")
          this.setCounter("storage:count", 0)
          this.setCounter("storage:bytes", 0)
          await this.ctx.storage.deleteAlarm()
        }
        return Response.json({ configured: false, ...this.usage() })
      }
      if (action === "settings") {
        const settings = this.settings()
        return Response.json({
          configured: settings?.enabled ?? false,
          origins: settings?.origins ?? [],
          ...this.usage()
        })
      }
      requireValue(action === "events", "Unknown telemetry operation.")
      const now = Date.now()
      const since = input.since === undefined ? now - 3_600_000 : Number(input.since)
      const until = input.until === undefined ? now : Number(input.until)
      const limit = input.limit === undefined ? 50 : Number(input.limit)
      requireValue(
        Number.isSafeInteger(since) &&
          Number.isSafeInteger(until) &&
          since >= 0 &&
          until - since <= LIMITS.retentionMs &&
          since <= until &&
          until <= now + 300_000,
        "Invalid time range (maximum seven days)."
      )
      requireValue(Number.isInteger(limit) && limit > 0 && limit <= 100, "Invalid page size.")
      const clauses = ["received >= ?", "received <= ?"]
      const params: (string | number)[] = [Math.max(since, now - LIMITS.retentionMs), until]
      for (const field of ["level", "kind", "release", "fingerprint"] as const) {
        if (input[field]) {
          requireValue(typeof input[field] === "string" && input[field].length <= 128, `Invalid ${field}.`)
          clauses.push(`${field} = ?`)
          params.push(input[field])
        }
      }
      if (input.query) {
        requireValue(typeof input.query === "string" && input.query.length <= 100, "Search is too long.")
        clauses.push("(instr(lower(name), lower(?)) > 0 OR instr(lower(body), lower(?)) > 0)")
        params.push(input.query, input.query)
      }
      // Summary shares filters and snapshot bounds, but not the pagination cursor.
      const summary = this.ctx.storage.sql
        .exec<{ total: number; errors: number }>(
          `SELECT COUNT(*) AS total, COALESCE(SUM(level IN ('error','fatal')),0) AS errors FROM events WHERE ${clauses.join(" AND ")}`,
          ...params
        )
        .one()
      const groups = this.ctx.storage.sql
        .exec<{ fingerprint: string; count: number; message: string; lastSeen: number }>(
          `SELECT fingerprint, COUNT(*) AS count, MIN(body) AS message, MAX(received) AS lastSeen FROM events WHERE ${clauses.join(" AND ")} AND fingerprint IS NOT NULL GROUP BY fingerprint ORDER BY lastSeen DESC LIMIT 20`,
          ...params
        )
        .toArray()
      if (input.cursor) {
        requireValue(typeof input.cursor === "string" && input.cursor.length <= 200, "Invalid cursor.")
        const match = /^(\d{13}):([A-Za-z0-9_-]{1,128})$/.exec(input.cursor)
        requireValue(match, "Invalid cursor.")
        clauses.push("(received < ? OR (received = ? AND id < ?))")
        params.push(Number(match[1]), Number(match[1]), match[2]!)
      }
      const rows = this.ctx.storage.sql
        .exec<EventRow>(
          `SELECT id, received, data FROM events WHERE ${clauses.join(" AND ")} ORDER BY received DESC, id DESC LIMIT ?`,
          ...params,
          limit + 1
        )
        .toArray()
      const page = rows.slice(0, limit)
      const last = page.at(-1)
      return Response.json({
        events: page.map((row) => JSON.parse(row.data) as StoredEvent),
        nextCursor: rows.length > limit && last ? `${last.received}:${last.id}` : null,
        summary,
        groups,
        since,
        until,
        ...this.usage()
      })
    } catch (error) {
      return failure(error)
    }
  }
}
