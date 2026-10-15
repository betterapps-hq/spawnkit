import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { afterEach, expect, it, vi } from "vitest"
import { createTelemetry } from "./index"
import type { TelemetryOptions } from "./index"
import { createOtelLogExporter } from "./otel"
import { cleanAttributes, cleanText, encodeLogs, LIMITS } from "./protocol"

const clients: ReturnType<typeof createTelemetry>[] = []
function setup(options: Partial<TelemetryOptions> = {}) {
  const send = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({}))
  const client = createTelemetry({
    endpoint: "https://telemetry.example/v1/logs",
    key: "public-test-key",
    serviceName: "test-game",
    consent: "granted",
    flushIntervalMs: 0,
    fetch: send,
    ...options
  })
  clients.push(client)
  return { client, send }
}
function logs(send: ReturnType<typeof vi.fn<typeof fetch>>, call = 0) {
  return JSON.parse(String(send.mock.calls[call]?.[1]?.body)).resourceLogs[0].scopeLogs[0].logRecords as {
    attributes: { key: string; value: { stringValue?: string } }[]
    body: { stringValue: string }
    eventName: string
    timeUnixNano: string
    traceId?: string
  }[]
}
afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.setConsent("denied")
    await client.shutdown()
  }
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it("gates capture on consent, isolates instances and emits OTLP event/error/measurement records", async () => {
  const { client, send } = setup({ consent: "denied" })
  client.track("denied")
  client.addBreadcrumb("hidden")
  client.setContext({ hidden: "hidden" })
  expect((await client.flush()).pending).toBe(0)
  client.setConsent("granted")
  client.setContext({ renderer: "pixi" })
  client.addBreadcrumb("level.entered", { level: 2 })
  client.track("level.completed", { score: 3 }, { traceId: "a".repeat(32), spanId: "b".repeat(16), traceFlags: 1 })
  client.captureException(new Error("save failed"))
  client.measure("frame.duration", 12, "ms")
  client.log("warn", "slow frame")
  expect((await client.flush()).sent).toBe(4)
  expect(logs(send)[0]).toMatchObject({ eventName: "level.completed", traceId: "a".repeat(32) })
  expect(logs(send)[0]!.timeUnixNano).toMatch(/^\d{19}$/)
  expect(JSON.stringify(logs(send))).toContain("spawn.breadcrumbs")
  expect(JSON.stringify(logs(send))).not.toContain("hidden")
  expect(setup().client.stats().sent).toBe(0)
})

it("sanitizes secrets, accessors and hostile values before and after hooks", async () => {
  let getterCalled = false
  const hostile = Object.defineProperty(
    { good: 1, email: "player@example.com", token: "secret", nested: { secret: "x" } },
    "accessor",
    {
      enumerable: true,
      get() {
        getterCalled = true
        throw Error("getter")
      }
    }
  )
  expect(cleanAttributes(hostile)).toEqual({ good: 1, email: "[redacted]", token: "[redacted]" })
  expect(getterCalled).toBe(false)
  expect(cleanText("https://game.example/a?secret=x player@example.com Bearer abc.def")).toBe(
    "https://game.example/a [email] Bearer [redacted]"
  )
  const { client, send } = setup({
    beforeSend(record) {
      return { ...record, id: "changed", time: 0, attributes: { token: "new-secret" } }
    }
  })
  client.track("test")
  await client.flush()
  expect(JSON.stringify(logs(send))).not.toContain("changed")
  expect(JSON.stringify(logs(send))).not.toContain("new-secret")
  expect(logs(send)[0]!.timeUnixNano).not.toBe("0")
})

it("contains hooks that throw, opt out or revoke consent during capture", () => {
  const dropped = setup({ beforeSend: () => null }).client
  dropped.track("drop")
  expect(dropped.stats().dropped).toBe(1)
  const thrown = setup({
    beforeSend: () => {
      throw Error("bad hook")
    }
  }).client
  expect(() => thrown.track("drop")).not.toThrow()
  expect(thrown.stats().dropped).toBe(1)
  const { client } = setup({
    beforeSend: (record) => {
      client.setConsent("denied")
      return record
    }
  })
  client.track("revoked")
  expect(client.stats().queued).toBe(0)
})

it("bounds queue and batch bytes, preserves errors, samples independently and handles invalid options", async () => {
  const { client, send } = setup({ maxQueueRecords: 3 })
  client.captureException(Error("keep me"))
  for (let i = 0; i < 100; i++) client.track(`event.${i}`)
  expect(client.stats()).toMatchObject({ queued: 3, dropped: 98 })
  await client.flush()
  expect(JSON.stringify(logs(send))).toContain("keep me")
  for (const [, init] of send.mock.calls)
    expect(new TextEncoder().encode(String(init?.body)).length).toBeLessThanOrEqual(LIMITS.batchBytes)
  const sampled = setup({ sampleRate: 0, errorSampleRate: 1 }).client
  sampled.track("dropped")
  sampled.captureException("captured")
  sampled.measure("bad", NaN)
  expect(sampled.stats()).toMatchObject({ queued: 1, dropped: 2 })
  expect(() => setup({ sampleRate: 2 })).toThrow("Invalid telemetry limit")
  expect(() => setup({ endpoint: "http://public.example/v1/logs" })).toThrow("Telemetry requires HTTPS")
  expect(() => setup({ endpoint: "https://secret@public.example/v1/logs" })).toThrow("Telemetry requires HTTPS")
})

it("serializes flush, obeys Retry-After for new captures, and keeps retry IDs", async () => {
  vi.useFakeTimers()
  const { client, send } = setup()
  send.mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "60" } }))
  client.track("first")
  const first = client.flush()
  expect(client.flush()).toBe(first)
  await first
  client.track("second")
  await client.flush()
  expect(send).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(60_001)
  await client.flush()
  expect(send).toHaveBeenCalledTimes(2)
  expect(logs(send, 1)[0]).toEqual(logs(send, 0)[0])
  expect(client.stats()).toMatchObject({ sent: 2, queued: 0, retries: 1 })
})

it("does not retry terminal HTTP responses or OTLP partial success", async () => {
  const { client, send } = setup()
  send.mockResolvedValueOnce(new Response(null, { status: 408 }))
  client.track("terminal")
  await client.flush()
  expect(client.stats().queued).toBe(0)
  send.mockResolvedValueOnce(
    Response.json({ partialSuccess: { rejectedLogRecords: "1", errorMessage: "one rejected" } })
  )
  client.track("one")
  client.track("two")
  await client.flush()
  expect(client.stats()).toMatchObject({ sent: 1, dropped: 2, retries: 0, queued: 0 })
})

it("does not resurrect revoked records after regranting consent during a failed request", async () => {
  let reject!: (error: Error) => void
  const { client, send } = setup({
    fetch: () =>
      new Promise((_resolve, no) => {
        reject = no
      })
  })
  client.track("old")
  const pending = client.flush()
  client.setConsent("denied")
  client.setConsent("granted")
  client.track("new")
  reject(Error("old request failed"))
  await pending
  expect(client.stats()).toMatchObject({ queued: 1, retries: 0 })
  expect(send).not.toHaveBeenCalled()
})

it("times out transport, expires old records, and shuts down idempotently", async () => {
  vi.useFakeTimers()
  const { client } = setup({
    requestTimeoutMs: 100,
    maxRetries: 0,
    fetch: (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(Error("aborted"))))
  })
  client.track("timeout")
  const pending = client.flush()
  await vi.advanceTimersByTimeAsync(101)
  await pending
  expect(client.stats()).toMatchObject({ queued: 0, dropped: 1 })
  client.track("expired")
  await vi.advanceTimersByTimeAsync(300_001)
  await client.flush()
  expect(client.stats().dropped).toBe(2)
  const shutdown = client.shutdown()
  expect(client.shutdown()).toBe(shutdown)
  await shutdown
  client.track("after close")
  expect(client.stats().queued).toBe(0)
})

it("bounds shutdown and body reads when custom transports ignore cancellation", async () => {
  vi.useFakeTimers()
  const stalled = setup({ fetch: () => new Promise(() => {}), maxRetries: 0 }).client
  stalled.track("stalled")
  const shutdown = stalled.shutdown({ timeoutMs: 100 })
  await vi.advanceTimersByTimeAsync(101)
  expect(await shutdown).toMatchObject({ pending: 0, dropped: 1 })
  const streaming = setup({
    fetch: async () => new Response(new ReadableStream({ start() {} })),
    maxRetries: 0,
    requestTimeoutMs: 100
  }).client
  streaming.track("stalled-body")
  const flush = streaming.flush()
  await vi.advanceTimersByTimeAsync(101)
  expect(await flush).toMatchObject({ pending: 0, dropped: 1 })
})

it("captures browser errors/rejections only while handlers are installed and flushes on pagehide", async () => {
  const browser = new EventTarget()
  const document = Object.assign(new EventTarget(), { visibilityState: "hidden" })
  vi.stubGlobal("window", browser)
  vi.stubGlobal("document", document)
  const { client, send } = setup()
  const cleanup = client.installBrowserHandlers()
  expect(client.installBrowserHandlers()).toBe(cleanup)
  browser.dispatchEvent(Object.assign(new Event("error"), { error: new Error("browser failure") }))
  browser.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: "rejected promise" }))
  browser.dispatchEvent(new Event("pagehide"))
  await vi.waitFor(() => expect(client.stats().sent).toBe(2))
  expect(send.mock.calls[0]?.[1]?.keepalive).toBe(true)
  cleanup()
  browser.dispatchEvent(Object.assign(new Event("error"), { error: new Error("removed") }))
  expect(client.stats().queued).toBe(0)
  client.installBrowserHandlers()
  client.track("hidden")
  document.dispatchEvent(new Event("visibilitychange"))
  await vi.waitFor(() => expect(client.stats().sent).toBe(3))
  await client.shutdown()
  browser.dispatchEvent(Object.assign(new Event("error"), { error: new Error("closed") }))
  expect(client.stats().queued).toBe(0)
})

it("accepts official OpenTelemetry LoggerProvider records with event names and severity", async () => {
  const { client, send } = setup()
  const provider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor({ exporter: createOtelLogExporter(client) })]
  })
  provider
    .getLogger("game-otel", "1.2.3")
    .emit({ eventName: "official.event", body: "from OpenTelemetry", severityNumber: 13, attributes: { score: 5 } })
  await provider.forceFlush()
  await client.flush()
  expect(logs(send)[0]).toMatchObject({
    eventName: "official.event",
    severityNumber: 13,
    body: { stringValue: "from OpenTelemetry" }
  })
  expect(JSON.stringify(logs(send))).toContain("game-otel")
  await provider.shutdown()
})

it("does not expire freshly queued OpenTelemetry records based on their historical event time", async () => {
  const { client, send } = setup()
  const provider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor({ exporter: createOtelLogExporter(client) })]
  })
  const timestamp = Date.now() - 60 * 60 * 1000
  provider.getLogger("historical").emit({ body: "historical record", timestamp })
  await provider.forceFlush()
  expect((await client.flush()).sent).toBe(1)
  expect(logs(send)[0]!.timeUnixNano).toBe(String(BigInt(timestamp) * 1_000_000n))
  await provider.shutdown()
})

it("uses JSON decimal nanoseconds and rejects invalid trace correlation", () => {
  const payload = encodeLogs(
    [{ id: "id", time: 1_792_000_000_000, level: "info", kind: "event", name: "test", body: "test", attributes: {} }],
    { serviceName: "game", release: "v1", environment: "production" }
  )
  expect(payload.resourceLogs[0]!.scopeLogs[0]!.logRecords[0]!.timeUnixNano).toBe("1792000000000000000")
  const { client } = setup()
  client.track("test", {}, { traceId: "0".repeat(32), spanId: "x" })
  expect(client.stats().queued).toBe(1)
})
