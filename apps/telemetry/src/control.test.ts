import { afterAll, beforeAll, expect, it } from "vitest"
import { startTelemetryRuntime } from "../testing/runtime"

let runtime: Awaited<ReturnType<typeof startTelemetryRuntime>>
beforeAll(async () => {
  runtime = await startTelemetryRuntime()
})
afterAll(async () => {
  await runtime?.dispose()
})

it("requires ownership for every read/configuration/deletion and preserves inactive environment administration", async () => {
  const created = await runtime.request("/projects", "POST", {
    id: "control-test",
    name: "Telemetry test",
    configuration: { sandbox: false }
  })
  expect(created.status).toBe(201)
  const path = "/projects/control-test/telemetry/settings"
  expect((await runtime.request(path, "GET", undefined, "telemetry-test-other")).status).toBe(404)
  expect((await runtime.request(path, "PUT", { origins: [] }, "telemetry-test-other")).status).toBe(404)
  expect(
    (await runtime.request("/projects/control-test/telemetry/events", "DELETE", undefined, "telemetry-test-other"))
      .status
  ).toBe(404)
  expect((await runtime.request(path, "GET", undefined, "invalid")).status).toBe(401)
  expect((await runtime.request(path, "PUT", { origins: ["https://game.example"] })).status).toBe(200)
  expect((await runtime.request(`${path}?environment=sandbox`, "GET")).status).toBe(200)
  expect((await runtime.request(`${path}?environment=sandbox`, "PUT", { origins: [] })).status).toBe(409)
  expect((await runtime.request(`${path}?environment=sandbox`, "DELETE")).status).toBe(200)
})
