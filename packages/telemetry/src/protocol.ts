/** OTLP/HTTP JSON logs. Constants are shared by SDK and ingestion. */
export const LIMITS = {
  batchRecords: 20,
  batchBytes: 48 * 1024,
  recordBytes: 8 * 1024,
  attributes: 48,
  stringLength: 1024,
  retentionMs: 7 * 24 * 60 * 60 * 1000,
  dailyRecords: 10_000,
  storedRecords: 80_000
} as const
export const VERSION = "0.1.0"
export const levels = { trace: 1, debug: 5, info: 9, warn: 13, error: 17, fatal: 21 } as const
export type Level = keyof typeof levels
export type Attributes = Record<string, string | number | boolean>
export interface TraceContext {
  traceId: string
  spanId?: string
  traceFlags?: number
}
export interface TelemetryRecord {
  id: string
  time: number
  level: Level
  kind: "event" | "log" | "error" | "measurement"
  name: string
  body: string
  attributes: Attributes
  trace?: TraceContext
}
export interface Resource {
  serviceName: string
  release: string
  environment: string
}
export interface KeyValue {
  key: string
  value: { stringValue?: string; doubleValue?: number; boolValue?: boolean; intValue?: string }
}
export interface OtlpLogRecord {
  eventName: string
  timeUnixNano: string
  observedTimeUnixNano: string
  severityNumber: number
  severityText: string
  body: { stringValue: string }
  attributes: KeyValue[]
  traceId?: string
  spanId?: string
  flags?: number
}

const sensitive =
  /password|passwd|secret|token|authorization|cookie|email|phone|ip[._-]?address|credit[._-]?card|session[._-]?key|api[._-]?key/i
export function cleanText(value: string, limit: number = LIMITS.stringLength): string {
  return (
    value
      .slice(0, limit)
      .replace(/\bBearer\s+[\w.+/=-]+/gi, "Bearer [redacted]")
      .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, "[redacted]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      .replace(/(https?:\/\/[^\s?#]+)[?#][^\s)]+/gi, "$1")
      .replace(/\b(password|secret|token|api[_-]?key)\s*[=:]\s*[^\s&,;]+/gi, "$1=[redacted]")
      // oxlint-disable-next-line no-control-regex -- Strip unsafe control characters from untrusted telemetry text.
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
  )
}

/** Only own data properties and scalar values are accepted; accessors are never invoked. */
export function cleanAttributes(value: unknown, max: number = LIMITS.attributes): Attributes {
  const result: Attributes = Object.create(null)
  if (!value || typeof value !== "object" || Array.isArray(value)) return result
  try {
    for (const key of Object.keys(value).slice(0, max)) {
      if (key.length > 128 || !key || ["__proto__", "prototype", "constructor"].includes(key)) continue
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !("value" in descriptor)) continue
      const entry: unknown = descriptor.value
      if (sensitive.test(key)) result[key] = "[redacted]"
      else if (typeof entry === "string") result[key] = cleanText(entry)
      else if (typeof entry === "boolean" || (typeof entry === "number" && Number.isFinite(entry))) result[key] = entry
    }
  } catch {
    /* Revoked proxies and hostile objects produce only already-safe values. */
  }
  return result
}

export function validTrace(value: TraceContext | undefined): TraceContext | undefined {
  if (
    !value ||
    !/^[a-f0-9]{32}$/i.test(value.traceId) ||
    /^0+$/.test(value.traceId) ||
    (value.spanId !== undefined && (!/^[a-f0-9]{16}$/i.test(value.spanId) || /^0+$/.test(value.spanId)))
  )
    return undefined
  return {
    traceId: value.traceId.toLowerCase(),
    ...(value.spanId ? { spanId: value.spanId.toLowerCase() } : {}),
    traceFlags: (value.traceFlags ?? 0) & 255
  }
}

export function keyValues(attributes: Attributes): KeyValue[] {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value:
      typeof value === "string"
        ? { stringValue: value }
        : typeof value === "boolean"
          ? { boolValue: value }
          : { doubleValue: value }
  }))
}
export function byteSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

export function encodeLogs(records: readonly TelemetryRecord[], resource: Resource) {
  return {
    resourceLogs: [
      {
        resource: {
          attributes: keyValues({
            "service.name": resource.serviceName,
            "service.version": resource.release,
            "deployment.environment.name": resource.environment,
            "telemetry.sdk.name": "spawn",
            "telemetry.sdk.version": VERSION,
            "telemetry.sdk.language": "webjs"
          })
        },
        scopeLogs: [
          {
            scope: { name: "@spawn/telemetry", version: VERSION },
            logRecords: records.map((record): OtlpLogRecord => ({
              eventName: record.name,
              timeUnixNano: `${BigInt(Math.trunc(record.time)) * 1_000_000n}`,
              observedTimeUnixNano: `${BigInt(Math.trunc(record.time)) * 1_000_000n}`,
              severityNumber: levels[record.level],
              severityText: record.level.toUpperCase(),
              body: { stringValue: record.body },
              attributes: keyValues({
                ...record.attributes,
                "event.name": record.name,
                "spawn.event.id": record.id,
                "spawn.kind": record.kind
              }),
              ...(record.trace
                ? {
                    traceId: record.trace.traceId,
                    ...(record.trace.spanId ? { spanId: record.trace.spanId } : {}),
                    flags: record.trace.traceFlags ?? 0
                  }
                : {})
            }))
          }
        ]
      }
    ]
  }
}
