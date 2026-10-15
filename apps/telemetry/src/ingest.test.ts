import { expect, it } from "vitest"
import { readJson } from "./http"
import { parseLogs } from "./ingest"
import { signScope, verifyScope } from "./keys"

it("verifies signed scope and rejects mutation before routing", async () => {
  const scope = { project: "project-1", environment: "production" as const, generation: crypto.randomUUID() }
  const key = await signScope(scope, "sufficient-test-key-length-for-HMAC")
  expect(await verifyScope(key, "sufficient-test-key-length-for-HMAC")).toEqual(scope)
  await expect(
    verifyScope(key.replace("project-1", "project-2"), "sufficient-test-key-length-for-HMAC")
  ).rejects.toThrow("Invalid write key")
  await expect(verifyScope("bad", "sufficient-test-key-length-for-HMAC")).rejects.toThrow("Invalid write key")
  await expect(signScope(scope, "")).rejects.toThrow("not configured")
})

it("checks bounds while reading a streamed request without Content-Length", async () => {
  const request = new Request("https://telemetry.example/v1/logs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(2048))
        controller.close()
      }
    }),
    duplex: "half"
  } as RequestInit)
  await expect(readJson(request, 1000)).rejects.toMatchObject({ status: 413 })
  await expect(
    readJson(new Request("https://example.test", { method: "POST", body: "{}" }), 1000)
  ).rejects.toMatchObject({ status: 415 })
  await expect(
    readJson(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "bad"
      }),
      1000
    )
  ).rejects.toMatchObject({ status: 400 })
})

it("preserves standard severity and trace context while overriding tenant resource context", async () => {
  const [event] = await parseLogs(
    {
      resourceLogs: [
        {
          resource: { attributes: [{ key: "deployment.environment.name", value: { stringValue: "other" } }] },
          scopeLogs: [
            {
              logRecords: [
                {
                  severityNumber: 17,
                  eventName: "exception",
                  traceId: "a".repeat(32),
                  spanId: "b".repeat(16),
                  flags: 1,
                  body: { stringValue: "token=secret" },
                  attributes: [
                    { key: "exception.type", value: { stringValue: "TypeError" } },
                    { key: "nested", value: { arrayValue: { values: [{ stringValue: "ignored" }] } } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    "sandbox"
  )
  expect(event).toMatchObject({
    environment: "sandbox",
    level: "error",
    name: "exception",
    traceId: "a".repeat(32),
    flags: 1,
    body: "token=[redacted]"
  })
  expect(event?.fingerprint).toMatch(/^[a-f0-9]{64}$/)
  expect(event?.attributes).not.toHaveProperty("nested")
})

it("accepts trace-only correlation, numeric int64 attributes, and observed timestamps", async () => {
  const time = Date.now() - 60_000
  const [event] = await parseLogs(
    {
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "0",
                  observedTimeUnixNano: String(BigInt(time) * 1_000_000n),
                  traceId: "a".repeat(32),
                  body: { stringValue: "observed" },
                  attributes: [{ key: "score", value: { intValue: 42 } }]
                }
              ]
            }
          ]
        }
      ]
    },
    "production"
  )
  expect(event).toMatchObject({ time, traceId: "a".repeat(32), attributes: { score: 42 } })
  expect(event?.spanId).toBeNull()
})

it("rejects duplicate attributes and unrealistic event clocks", async () => {
  const log = { timeUnixNano: "1", attributes: [] as unknown[] }
  const data = { resourceLogs: [{ scopeLogs: [{ logRecords: [log] }] }] }
  await expect(parseLogs(data, "production")).rejects.toThrow("Timestamp")
  log.timeUnixNano = "0"
  log.attributes = [
    { key: "a", value: { stringValue: "a" } },
    { key: "a", value: { stringValue: "b" } }
  ]
  await expect(parseLogs(data, "production")).rejects.toThrow("Duplicate")
})
