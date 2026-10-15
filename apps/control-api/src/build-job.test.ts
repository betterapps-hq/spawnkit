import { expect, it, vi } from "vitest"
import { HttpError } from "./http"

const mocks = vi.hoisted(() => ({ activate: vi.fn<() => Promise<void>>(), sandbox: vi.fn<() => never>() }))
vi.mock("./activation", () => ({ activate: mocks.activate }))
vi.mock("@cloudflare/sandbox", () => ({ getSandbox: mocks.sandbox }))
vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      public ctx: DurableObjectState,
      public env: Env
    ) {}
  }
}))
import { BuildJob } from "./build-job"

it("waits for project HTTPS without rebuilding or failing an already saved release", async () => {
  const state = new Map<string, unknown>([
    ["deployment", "d1"],
    ["artifactsReady", true]
  ])
  const alarms: number[] = []
  const writes: string[] = []
  const ctx = {
    storage: {
      get: async (key: string) => state.get(key),
      put: async (key: string, value: unknown) => {
        state.set(key, value)
      },
      setAlarm: async (time: number) => {
        alarms.push(time)
      }
    }
  } as unknown as DurableObjectState
  const env = {
    DATABASE: {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => ({
            id: "d1",
            project_id: "p1",
            release_id: "r1",
            environment: "production",
            status: "activating"
          }),
          run: async () => {
            writes.push(sql)
          }
        })
      })
    }
  } as unknown as Env
  const job = new BuildJob(ctx, env)
  mocks.activate.mockRejectedValueOnce(new HttpError(503, "hosting_pending", "Waiting for HTTPS"))
  mocks.activate.mockResolvedValueOnce(undefined)
  await job.alarm()
  expect(state.get("done")).toBeUndefined()
  expect(alarms).toHaveLength(1)
  expect(alarms[0]).toBeGreaterThan(Date.now() + 55_000)
  await job.alarm()
  expect(state.get("done")).toBe(true)
  expect(mocks.sandbox).not.toHaveBeenCalled()
  expect(writes.every((sql) => sql.startsWith("INSERT INTO logs"))).toBe(true)
})
