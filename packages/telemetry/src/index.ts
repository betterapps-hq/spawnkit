import { byteSize, cleanAttributes, cleanText, encodeLogs, levels, LIMITS, validTrace } from "./protocol.js"
import type { Attributes, Level, Resource, TelemetryRecord, TraceContext } from "./protocol.js"
export type { Attributes, Level, TelemetryRecord, TraceContext } from "./protocol.js"

export interface TelemetryOptions {
  endpoint: string
  /** Public, write-only project key. Never supply a provider/admin credential. */
  key: string
  serviceName: string
  release?: string
  environment?: string
  consent?: "granted" | "denied"
  sampleRate?: number
  errorSampleRate?: number
  flushIntervalMs?: number
  requestTimeoutMs?: number
  maxQueueRecords?: number
  maxQueueBytes?: number
  maxRetries?: number
  maxAgeMs?: number
  beforeSend?: (record: TelemetryRecord) => TelemetryRecord | null
  fetch?: typeof globalThis.fetch
}
export interface FlushResult {
  sent: number
  pending: number
  dropped: number
}
interface Queued {
  enqueuedAt: number
  record: TelemetryRecord
  bytes: number
  attempts: number
  nextAttempt: number
}

function bounded(value: number | undefined, fallback: number, min: number, max: number, integer = true) {
  const result = value ?? fallback
  if (!Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result)))
    throw new Error("Invalid telemetry limit.")
  return result
}
function endpointUrl(endpoint: string) {
  const url = new URL(endpoint)
  if (
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Telemetry requires HTTPS (or local HTTP), with no credentials or query string.")
  return url.href
}
function retryDelay(response: Response | undefined, attempts: number) {
  const value = response?.headers.get("retry-after")
  const requested = value ? (/^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now()) : 0
  return Math.max(
    Math.min(Math.max(0, requested || 0), 86_400_000),
    Math.min(60_000, 1000 * 2 ** (attempts - 1)) * (0.5 + Math.random() / 2)
  )
}

async function rejectedRecords(response: Response, count: number, signal: AbortSignal): Promise<number> {
  const reader = response.body?.getReader()
  if (!reader) return 0
  const cancel = () => {
    void reader.cancel().catch(() => {})
  }
  signal.addEventListener("abort", cancel, { once: true })
  if (signal.aborted) cancel()
  let text = ""
  let size = 0
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 4096) {
        void reader.cancel().catch(() => {})
        return count
      }
      text += decoder.decode(value, { stream: true })
    }
    const value = text.trim() ? JSON.parse(text + decoder.decode()) : {}
    const rejected = Number(value.partialSuccess?.rejectedLogRecords ?? 0)
    return Number.isInteger(rejected) && rejected >= 0 ? Math.min(count, rejected) : count
  } catch {
    return count
  } finally {
    signal.removeEventListener("abort", cancel)
    reader.releaseLock()
  }
}

/** Enforce deadlines even for custom transports/streams that ignore AbortSignal. */
function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("Telemetry request aborted"))
    signal.addEventListener("abort", abort, { once: true })
    if (signal.aborted) abort()
    operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort))
  })
}

export function createTelemetry(options: TelemetryOptions) {
  const endpoint = endpointUrl(options.endpoint)
  if (!options.key || options.key.length > 2048 || /\s/.test(options.key))
    throw new Error("A public telemetry key is required.")
  if (!options.serviceName?.trim() || options.serviceName.length > 128)
    throw new Error("A service name of at most 128 characters is required.")
  const sampleRate = bounded(options.sampleRate, 1, 0, 1, false)
  const errorSampleRate = bounded(options.errorSampleRate, 1, 0, 1, false)
  const interval = bounded(options.flushIntervalMs, 5000, 0, 60_000)
  const timeout = bounded(options.requestTimeoutMs, 5000, 100, 30_000)
  const queueLimit = bounded(options.maxQueueRecords, 200, 1, 1000)
  const byteLimit = bounded(options.maxQueueBytes, 256 * 1024, LIMITS.recordBytes, 1024 * 1024)
  const retries = bounded(options.maxRetries, 3, 0, 10)
  const maxAge = bounded(options.maxAgeMs, 300_000, 1000, 3_600_000)
  const transport = options.fetch ?? globalThis.fetch.bind(globalThis)
  const resource: Resource = {
    serviceName: cleanText(options.serviceName, 128),
    release: cleanText(options.release ?? "unknown", 128),
    environment: cleanText(options.environment ?? "production", 64)
  }
  let consent = options.consent === "granted"
  let closed = false
  let session = crypto.randomUUID()
  let context: Attributes = {}
  let breadcrumbs: string[] = []
  let queue: Queued[] = []
  let inFlight: Promise<FlushResult> | undefined
  let controller: AbortController | undefined
  let epoch = 0
  let backoffUntil = 0
  let shutdownPromise: Promise<FlushResult> | undefined
  const sending = new Set<Queued>()
  let sent = 0
  let dropped = 0
  let retryCount = 0
  let lastStatus: number | null = null
  let stopBrowser: (() => void) | undefined
  const stats = () => ({
    sent,
    dropped,
    retries: retryCount,
    queued: queue.length,
    queuedBytes: queue.reduce((sum, entry) => sum + entry.bytes, 0),
    lastStatus
  })
  const result = (): FlushResult => ({ sent, pending: queue.length, dropped })
  function remove(entries: Queued[], countDropped: boolean) {
    const removing = new Set(entries)
    if (countDropped) dropped += queue.filter((entry) => removing.has(entry)).length
    queue = queue.filter((entry) => !removing.has(entry))
  }

  function capture(
    kind: TelemetryRecord["kind"],
    level: Level,
    name: string,
    body: string,
    attributes: unknown,
    trace?: TraceContext,
    time = Date.now()
  ) {
    if (!consent || closed) return
    const captureEpoch = epoch
    try {
      if (Math.random() >= (level === "error" || level === "fatal" ? errorSampleRate : sampleRate)) {
        dropped++
        return
      }
      if (
        !name.trim() ||
        !Number.isFinite(time) ||
        time < Date.now() - LIMITS.retentionMs ||
        time > Date.now() + 300_000
      ) {
        dropped++
        return
      }
      const id = crypto.randomUUID()
      const reserved: Attributes = {
        "session.id": session,
        ...(kind === "error" && breadcrumbs.length ? { "spawn.breadcrumbs": breadcrumbs.join("\n") } : {})
      }
      let record: TelemetryRecord | null = {
        id,
        time,
        kind,
        level,
        name: cleanText(name, 128),
        body: cleanText(body, 2048),
        attributes: { ...context, ...cleanAttributes(attributes, 32), ...reserved },
        ...(validTrace(trace) ? { trace: validTrace(trace)! } : {})
      }
      record = options.beforeSend ? options.beforeSend(record) : record
      if (!record) {
        dropped++
        return
      }
      // Hooks may edit content, but cannot replace stable identity, timestamps or routing metadata.
      record = {
        id,
        time,
        kind,
        level,
        name: cleanText(record.name, 128),
        body: cleanText(record.body, 2048),
        attributes: cleanAttributes(record.attributes),
        ...(validTrace(record.trace) ? { trace: validTrace(record.trace)! } : {})
      }
      const bytes = byteSize(encodeLogs([record], resource))
      if (!consent || closed || captureEpoch !== epoch) {
        dropped++
        return
      }
      if (bytes > LIMITS.recordBytes) {
        dropped++
        return
      }
      while (queue.length >= queueLimit || stats().queuedBytes + bytes > byteLimit) {
        const candidate =
          queue.find((entry) => !sending.has(entry) && !["error", "fatal"].includes(entry.record.level)) ??
          queue.find((entry) => !sending.has(entry))
        if (!candidate) {
          dropped++
          return
        }
        remove([candidate], true)
      }
      queue.push({ record, bytes, enqueuedAt: Date.now(), attempts: 0, nextAttempt: 0 })
    } catch {
      dropped++
    }
  }

  async function sendBatches(keepalive: boolean, deadline: number) {
    const currentEpoch = epoch
    // Work is capped at records present on entry; capture during flush cannot extend its budget.
    const snapshot = queue.slice()
    for (let offset = 0; offset < snapshot.length && Date.now() < deadline;) {
      if (!consent || currentEpoch !== epoch || Date.now() < backoffUntil) break
      remove(
        queue.filter((entry) => entry.enqueuedAt < Date.now() - maxAge),
        true
      )
      const batch: Queued[] = []
      while (offset < snapshot.length && batch.length < LIMITS.batchRecords) {
        const next = snapshot[offset++]!
        if (!queue.includes(next) || next.nextAttempt > Date.now()) continue
        if (byteSize(encodeLogs([...batch.map((entry) => entry.record), next.record], resource)) > LIMITS.batchBytes) {
          offset--
          break
        }
        batch.push(next)
      }
      if (!batch.length) continue
      for (const entry of batch) sending.add(entry)
      controller = new AbortController()
      const activeController = controller
      const timer = setTimeout(() => activeController.abort(), Math.max(1, Math.min(timeout, deadline - Date.now())))
      let response: Response | undefined
      try {
        response = await abortable<Response>(
          transport(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json", "x-spawn-key": options.key },
            body: JSON.stringify(
              encodeLogs(
                batch.map((entry) => entry.record),
                resource
              )
            ),
            signal: activeController.signal,
            credentials: "omit",
            redirect: "error",
            referrerPolicy: "no-referrer",
            keepalive
          }).then((value) => {
            if (activeController.signal.aborted) void value.body?.cancel().catch(() => {})
            return value
          }),
          activeController.signal
        )
        lastStatus = response.status
        // OTLP partial success must not be retried. SpawnKit only accepts whole batches.
        if (response.ok) {
          const rejected = await abortable(
            rejectedRecords(response, batch.length, activeController.signal),
            activeController.signal
          )
          sent += batch.length - rejected
          dropped += rejected
          remove(batch, false)
        } else if (![429, 502, 503, 504].includes(response.status)) remove(batch, true)
        else throw new Error("Retryable response")
      } catch {
        if (currentEpoch !== epoch || !consent) break
        for (const entry of batch) {
          entry.attempts++
          if (entry.attempts > retries) remove([entry], true)
          else {
            entry.nextAttempt = Date.now() + retryDelay(response, entry.attempts)
            retryCount++
          }
        }
        // Back pressure applies to the whole queue, including new captures.
        const nextAttempt = Math.max(...batch.map((entry) => entry.nextAttempt))
        backoffUntil = nextAttempt
        for (const entry of queue) entry.nextAttempt = Math.max(entry.nextAttempt, nextAttempt)
        break
      } finally {
        clearTimeout(timer)
        controller = undefined
        for (const entry of batch) sending.delete(entry)
        // Release unused response bodies without parsing an unbounded response.
        try {
          void response?.body?.cancel().catch(() => {})
        } catch {
          /* Transport cleanup is best effort. */
        }
      }
      if (keepalive) break
    }
    return result()
  }
  function flush({
    keepalive = false,
    timeoutMs = 10_000
  }: { keepalive?: boolean; timeoutMs?: number } = {}): Promise<FlushResult> {
    if (inFlight) return inFlight
    if (!consent || !queue.length) return Promise.resolve(result())
    const budget = Number.isFinite(timeoutMs) ? Math.max(1, Math.min(30_000, timeoutMs)) : 10_000
    inFlight = sendBatches(keepalive, Date.now() + budget)
      .catch(() => result())
      .finally(() => {
        inFlight = undefined
      })
    return inFlight
  }
  const timer = interval
    ? setInterval(() => {
        void flush()
      }, interval)
    : undefined
  if (timer && typeof timer === "object" && "unref" in timer) timer.unref()
  const api = {
    track: (name: string, attributes: Attributes = {}, trace?: TraceContext) =>
      capture("event", "info", name, name, attributes, trace),
    log: (level: Level, message: string, attributes: Attributes = {}, trace?: TraceContext) => {
      if (!(level in levels)) {
        dropped++
        return
      }
      capture("log", level, "log", message, attributes, trace)
    },
    captureException: (error: unknown, attributes: Attributes = {}, trace?: TraceContext) => {
      try {
        const exception =
          error instanceof Error ? error : new Error(typeof error === "string" ? error : "Non-Error exception")
        capture(
          "error",
          "error",
          "exception",
          exception.message,
          {
            ...cleanAttributes(attributes, 28),
            "exception.type": exception.name,
            "exception.message": exception.message,
            "exception.stacktrace": cleanText(exception.stack ?? "", 1024)
          },
          trace
        )
      } catch {
        dropped++
      }
    },
    measure: (name: string, value: number, unit = "1", attributes: Attributes = {}, trace?: TraceContext) => {
      if (!Number.isFinite(value)) {
        dropped++
        return
      }
      capture(
        "measurement",
        "info",
        name,
        name,
        { ...cleanAttributes(attributes, 30), "measurement.value": value, "measurement.unit": cleanText(unit, 32) },
        trace
      )
    },
    addBreadcrumb: (message: string, attributes: Attributes = {}) => {
      if (!consent || closed) return
      try {
        breadcrumbs = [
          ...breadcrumbs.slice(-19),
          cleanText(`${message} ${JSON.stringify(cleanAttributes(attributes, 5))}`, 160)
        ]
      } catch {
        dropped++
      }
    },
    setContext: (attributes: Attributes) => {
      if (consent && !closed) context = cleanAttributes(attributes, 8)
    },
    resetSession: () => {
      session = crypto.randomUUID()
      context = {}
      breadcrumbs = []
    },
    setConsent: (value: "granted" | "denied") => {
      consent = value === "granted" && !closed
      if (!consent) {
        epoch++
        backoffUntil = 0
        controller?.abort()
        remove(queue.slice(), true)
        api.resetSession()
      }
    },
    /** Explicit browser instrumentation; no automatic DOM, network or console capture. */
    installBrowserHandlers: () => {
      if (typeof window === "undefined" || stopBrowser || closed) return stopBrowser ?? (() => {})
      const onError = (event: ErrorEvent) => api.captureException(event.error ?? event.message)
      const onRejection = (event: PromiseRejectionEvent) => api.captureException(event.reason)
      const onHidden = () => {
        if (document.visibilityState === "hidden") void flush({ keepalive: true, timeoutMs: 1000 })
      }
      const onPagehide = () => {
        void flush({ keepalive: true, timeoutMs: 1000 })
      }
      window.addEventListener("error", onError)
      window.addEventListener("unhandledrejection", onRejection)
      window.addEventListener("pagehide", onPagehide)
      document.addEventListener("visibilitychange", onHidden)
      stopBrowser = () => {
        window.removeEventListener("error", onError)
        window.removeEventListener("unhandledrejection", onRejection)
        window.removeEventListener("pagehide", onPagehide)
        document.removeEventListener("visibilitychange", onHidden)
        stopBrowser = undefined
      }
      return stopBrowser
    },
    /** Adapter entrypoint, preserving timestamp and explicit trace context. */
    emit: (
      record: Pick<TelemetryRecord, "level" | "name" | "body" | "attributes"> & { trace?: TraceContext; time?: number }
    ) => capture("log", record.level, record.name, record.body, record.attributes, record.trace, record.time),
    stats,
    flush,
    shutdown: ({ timeoutMs = 5000 }: { timeoutMs?: number } = {}): Promise<FlushResult> => {
      if (shutdownPromise) return shutdownPromise
      closed = true
      clearInterval(timer)
      stopBrowser?.()
      const timeoutTimer = setTimeout(() => controller?.abort(), Math.max(1, Math.min(30_000, timeoutMs)))
      shutdownPromise = flush({ timeoutMs }).finally(() => {
        clearTimeout(timeoutTimer)
      })
      return shutdownPromise
    }
  }
  return api
}
export type Telemetry = ReturnType<typeof createTelemetry>
