import { byteSize, cleanAttributes, cleanText, LIMITS, validTrace } from "@spawn/telemetry/protocol"
import type { Attributes, Level } from "@spawn/telemetry/protocol"
import { object, requireValue } from "./http"

export interface StoredEvent {
  id: string
  time: number
  received: number
  level: Level
  kind: string
  name: string
  body: string
  service: string
  release: string
  environment: string
  attributes: Attributes
  traceId: string | null
  spanId: string | null
  flags: number
  fingerprint: string | null
}
function array(value: unknown, max: number) {
  requireValue(Array.isArray(value) && value.length <= max, "Invalid collection size.")
  return value
}
function values(value: unknown): Attributes {
  const attributes: Attributes = Object.create(null)
  for (const item of array(value ?? [], LIMITS.attributes)) {
    const entry = object(item)
    requireValue(typeof entry.key === "string" && entry.key.length <= 128, "Invalid attribute key.")
    requireValue(!Object.hasOwn(attributes, entry.key), "Duplicate attribute key.")
    const v = object(entry.value)
    // OTLP permits nested AnyValue. Bound them in the request, then discard non-scalar values.
    if (typeof v.stringValue === "string") attributes[entry.key] = v.stringValue
    else if (typeof v.boolValue === "boolean") attributes[entry.key] = v.boolValue
    else if (typeof v.doubleValue === "number" && Number.isFinite(v.doubleValue)) attributes[entry.key] = v.doubleValue
    else if (typeof v.intValue === "string" && /^-?\d{1,20}$/.test(v.intValue)) attributes[entry.key] = v.intValue
    else if (typeof v.intValue === "number" && Number.isSafeInteger(v.intValue)) attributes[entry.key] = v.intValue
  }
  return cleanAttributes(attributes)
}
function timestamp(value: unknown, now: number) {
  if (value === undefined || value === "0" || value === 0) return now
  requireValue(
    (typeof value === "string" && /^\d{1,20}$/.test(value)) ||
      (typeof value === "number" && Number.isSafeInteger(value) && value >= 0),
    "Invalid timestamp."
  )
  const millis = Number(BigInt(value) / 1_000_000n)
  requireValue(
    millis >= now - LIMITS.retentionMs && millis <= now + 300_000,
    "Timestamp is outside the accepted window."
  )
  return millis
}
export async function parseLogs(payload: unknown, environment: string, now = Date.now()): Promise<StoredEvent[]> {
  const events: StoredEvent[] = []
  for (const rawResource of array(object(payload).resourceLogs ?? [], 20)) {
    const resource = object(rawResource)
    const attrs = values(resource.resource ? object(resource.resource).attributes : [])
    for (const rawScope of array(resource.scopeLogs ?? [], 20)) {
      const scope = object(rawScope)
      for (const rawLog of array(scope.logRecords ?? [], LIMITS.batchRecords)) {
        requireValue(
          events.length < LIMITS.batchRecords && byteSize(rawLog) <= LIMITS.recordBytes,
          "Batch or record exceeds the limit."
        )
        const log = object(rawLog)
        const attributes = values(log.attributes)
        const number = log.severityNumber ?? 0
        requireValue(
          typeof number === "number" && Number.isInteger(number) && number >= 0 && number <= 24,
          "Invalid severity."
        )
        const level: Level =
          number >= 21
            ? "fatal"
            : number >= 17
              ? "error"
              : number >= 13
                ? "warn"
                : number >= 9 || number === 0
                  ? "info"
                  : number >= 5
                    ? "debug"
                    : "trace"
        const id = attributes["spawn.event.id"] ?? crypto.randomUUID()
        requireValue(typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id), "Invalid event ID.")
        const bodyValue = log.body ? object(log.body) : {}
        const body = cleanText(
          typeof bodyValue.stringValue === "string" ? bodyValue.stringValue : "Structured OpenTelemetry log",
          2048
        )
        const name = cleanText(
          typeof log.eventName === "string" ? log.eventName : String(attributes["event.name"] ?? "log"),
          128
        )
        const trace =
          typeof log.traceId === "string"
            ? validTrace({
                traceId: log.traceId,
                ...(typeof log.spanId === "string" && log.spanId ? { spanId: log.spanId } : {}),
                traceFlags: typeof log.flags === "number" ? log.flags : 0
              })
            : undefined
        const kind = ["event", "log", "error", "measurement"].includes(String(attributes["spawn.kind"]))
          ? String(attributes["spawn.kind"])
          : number >= 17
            ? "error"
            : "log"
        delete attributes["spawn.event.id"]
        delete attributes["spawn.kind"]
        delete attributes["deployment.environment.name"]
        delete attributes["spawn.project.id"]
        const event: StoredEvent = {
          id,
          time: timestamp(
            log.timeUnixNano && log.timeUnixNano !== "0" ? log.timeUnixNano : log.observedTimeUnixNano,
            now
          ),
          received: now,
          level,
          kind,
          name,
          body,
          service: cleanText(String(attrs["service.name"] ?? "unknown"), 128),
          release: cleanText(String(attrs["service.version"] ?? "unknown"), 128),
          environment,
          attributes: { ...attributes },
          traceId: trace?.traceId ?? null,
          spanId: trace?.spanId ?? null,
          flags: trace?.traceFlags ?? 0,
          fingerprint: null
        }
        if (number >= 17) {
          const grouping = `${attributes["exception.type"] ?? "Error"}\n${body}\n${attributes["exception.stacktrace"] ?? ""}`
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(grouping))
          event.fingerprint = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
        }
        requireValue(byteSize(event) <= LIMITS.recordBytes, "Normalized record exceeds the limit.")
        events.push(event)
      }
    }
  }
  return events
}
