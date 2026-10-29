import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import { gzipSync } from "node:zlib"
import type { ProcessLogEvent } from "@cloudflare/sandbox"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { buildReservation, buildRetryDelay, dispatchBuilds, enqueueBuild, processBuildQueue } from "./build-queue"
import { HttpError } from "./http"

const mocks = vi.hoisted(() => ({
  activate: vi.fn<typeof import("./activation").activate>(),
  sandbox: vi.fn<(_namespace: unknown, id: string) => unknown>()
}))
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

const databases: DatabaseSync[] = []
beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-16T12:00:00Z"))
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  for (const db of databases.splice(0)) db.close()
})

function fakeProcess(text = "Built", code = 0, timedOut = false) {
  return {
    logs: async () =>
      new ReadableStream<ProcessLogEvent>({
        start(controller) {
          controller.enqueue({
            type: "stdout",
            cursor: "1",
            timestamp: "now",
            data: new TextEncoder().encode(text + "\n")
          })
          controller.enqueue({
            type: "terminal",
            state: "exited",
            cursor: "2",
            timestamp: "now",
            exit: { code, timedOut }
          })
          controller.close()
        }
      })
  }
}

function fixture() {
  const db = new DatabaseSync(":memory:")
  databases.push(db)
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort())
    db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"))
  const source = gzipSync(
    JSON.stringify({
      version: 1,
      files: ["package.json", "game.config.json", "pnpm-lock.yaml"].map((path) => ({
        path,
        content: Buffer.from("{}").toString("base64")
      }))
    })
  )
  const prepare = (sql: string) => {
    let values: (string | number | null)[] = []
    const statement = {
      bind(...args: (string | number | null)[]) {
        values = args
        return statement
      },
      async first() {
        return db.prepare(sql).get(...values) ?? null
      },
      async all() {
        return { results: db.prepare(sql).all(...values) }
      },
      async run() {
        return db.prepare(sql).run(...values)
      }
    }
    return statement
  }
  const wake = vi.fn<(id: string) => Promise<void>>(async () => {})
  const put = vi.fn<() => Promise<void>>(async () => {})
  const env = {
    BUILDS_ENABLED: "true",
    BUILD_JOBS: { getByName: () => ({ start: wake }) },
    DATABASE: {
      prepare,
      async batch(statements: ReturnType<typeof prepare>[]) {
        if (statements.length === 0) throw new Error("D1_ERROR: No SQL statements detected.")
        db.exec("BEGIN")
        try {
          const results = []
          for (const statement of statements) results.push(await statement.run())
          db.exec("COMMIT")
          return results
        } catch (error) {
          db.exec("ROLLBACK")
          throw error
        }
      }
    },
    ARTIFACTS: { get: async () => ({ arrayBuffer: async () => source }), put }
  } as unknown as Env
  const add = (id: string, owner = "owner") => {
    db.prepare("INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES(?,?,?,'{}',?,?)").run(
      id,
      owner,
      id,
      id,
      id
    )
    db.prepare(
      "INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES(?,?,?,'building','production',?)"
    ).run(id, id, id, id)
    db.prepare(
      "INSERT INTO uploads(id,project_id,sha256,size_bytes,status,expires_at) VALUES(?,?,?,1,'ready','2099')"
    ).run(id, id, createHash("sha256").update(source).digest("hex"))
    db.prepare(
      "INSERT INTO deployments(id,project_id,release_id,upload_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES(?,?,?,?,'production','queued','deployments',?,'hash','github',?,?)"
    ).run(id, id, id, id, id, id, id)
  }
  const context = (id: string) => {
    const state = new Map<string, unknown>([["deployment", id]])
    let alarm: number | null = null
    const ctx = {
      storage: {
        get: async (key: string) => state.get(key),
        put: async (key: string, value: unknown) => {
          state.set(key, value)
        },
        getAlarm: async () => alarm,
        setAlarm: async (time: number) => {
          alarm = time
        },
        deleteAlarm: async () => {
          alarm = null
        },
        deleteAll: async () => {
          state.clear()
        }
      }
    } as unknown as DurableObjectState
    return {
      ctx,
      state,
      alarm: () => alarm,
      fire: async () => {
        alarm = null
        await new BuildJob(ctx, env).alarm()
      }
    }
  }
  const sandbox = {
    setOutboundHandler: vi.fn<(handler: string) => Promise<void>>(async () => {}),
    destroy: vi.fn<() => Promise<void>>(async () => {}),
    writeFile: vi.fn<() => Promise<void>>(async () => {}),
    exec: vi.fn<() => Promise<ReturnType<typeof fakeProcess>>>(async () => fakeProcess()),
    readFile: vi.fn<() => Promise<{ size: number; content: ReadableStream<Uint8Array> }>>(async () => {
      const bytes = Buffer.from(
        JSON.stringify({
          files: [{ path: "index.html", content: Buffer.from("<html>game</html>").toString("base64") }]
        })
      )
      return {
        size: bytes.length,
        content: new ReadableStream({
          start(c) {
            c.enqueue(bytes)
            c.close()
          }
        })
      }
    })
  }
  const media = {
    ...sandbox,
    destroy: vi.fn<() => Promise<void>>(async () => {}),
    setOutboundHandler: vi.fn<(handler: string) => Promise<void>>(async () => {}),
    writeFile: vi.fn<() => Promise<void>>(async () => {}),
    exec: vi.fn<() => Promise<ReturnType<typeof fakeProcess>>>(async () => fakeProcess()),
    readFile: vi.fn<() => Promise<{ size: number; content: ReadableStream<Uint8Array> }>>(async () => {
      const bytes = Buffer.from(
        JSON.stringify({
          files: [
            {
              path: "spawnkit.config.json",
              content: Buffer.from('{"coverPath":null,"trailerPath":null}').toString("base64")
            }
          ]
        })
      )
      return {
        size: bytes.length,
        content: new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(bytes)
            c.close()
          }
        })
      }
    })
  }
  mocks.sandbox.mockImplementation((_namespace, id) => (id.startsWith("media-") ? media : sandbox))
  mocks.activate.mockImplementation(async (_env, deployment) => {
    db.prepare("UPDATE deployments SET status='succeeded' WHERE id=?").run(deployment.id)
  })
  const status = (id: string) => db.prepare("SELECT status FROM deployments WHERE id=?").get(id)?.status
  const reserved = () =>
    db
      .prepare("SELECT deployment_id FROM build_queue WHERE reserved=1 ORDER BY deployment_id")
      .all()
      .map((row) => row.deployment_id)
  return { db, env, add, context, sandbox, media, wake, put, status, reserved }
}

it("atomically admits only three builds under competing dispatchers and recovers accepted submissions", async () => {
  const f = fixture()
  for (let i = 0; i < 20; i++) f.add(`job${i}`, `owner${i % 4}`)
  await Promise.all(Array.from({ length: 12 }, () => processBuildQueue(f.env)))
  expect(f.reserved()).toHaveLength(3)
  expect(f.db.prepare("SELECT COUNT(*) AS count FROM build_queue").get()?.count).toBe(20)
  expect(f.db.prepare("SELECT SUM(attempts) AS count FROM build_queue").get()?.count).toBe(3)
  expect(f.db.prepare("SELECT COUNT(DISTINCT owner_id) AS count FROM build_queue WHERE reserved=1").get()?.count).toBe(
    3
  )
  expect(f.status("job9")).toBe("queued")
})

it("gives a newly waiting owner the next slot, uses project owner rather than actor, and preserves FIFO", async () => {
  const f = fixture()
  for (const id of ["a1", "a2", "a3", "a4", "a5"]) f.add(id, "alice")
  await processBuildQueue(f.env)
  expect(f.reserved()).toEqual(["a1", "a2", "a3"])
  f.add("b1", "bob")
  await enqueueBuild(f.env, "b1")
  await f.context("a1").fire()
  expect(f.status("a1")).toBe("succeeded")
  expect(f.reserved()).toEqual(["a2", "a3", "b1"])
  await f.context("a2").fire()
  expect(f.reserved()).toEqual(["a3", "a4", "b1"])
})

it("retries failed dispatch without losing or duplicating its reserved slot", async () => {
  const f = fixture()
  vi.spyOn(console, "error").mockImplementation(() => {})
  f.add("a")
  f.wake.mockRejectedValueOnce(new Error("RPC unavailable"))
  await enqueueBuild(f.env, "a")
  await processBuildQueue(f.env)
  expect(f.wake).toHaveBeenCalledTimes(2)
  expect((await buildReservation(f.env, "a"))?.attempts).toBe(1)
})

it("switches network policy before execution and destroys the build before the separate media job", async () => {
  const f = fixture()
  f.add("isolated")
  await enqueueBuild(f.env, "isolated")
  await f.context("isolated").fire()
  expect(f.status("isolated")).toBe("succeeded")
  expect(f.sandbox.setOutboundHandler.mock.calls).toEqual([["dependencies"], ["blocked"]])
  const policies = f.sandbox.setOutboundHandler.mock.invocationCallOrder
  const commands = f.sandbox.exec.mock.invocationCallOrder
  expect(policies[0]).toBeLessThan(commands[0]!)
  expect(commands[0]).toBeLessThan(policies[1]!)
  expect(policies[1]).toBeLessThan(commands[1]!)
  const destroyed = f.sandbox.destroy.mock.invocationCallOrder[1]!
  expect(commands[1]).toBeLessThan(destroyed)
  expect(destroyed).toBeLessThan(f.media.exec.mock.invocationCallOrder[0]!)
  expect(f.media.setOutboundHandler).toHaveBeenCalledExactlyOnceWith("blocked")
  expect(f.media.destroy.mock.invocationCallOrder[2]).toBeLessThan(f.put.mock.invocationCallOrder[0]!)
})

it("never starts an unreserved job even when its alarm is delivered directly", async () => {
  const f = fixture()
  f.add("a")
  await f.context("a").fire()
  expect(mocks.sandbox).not.toHaveBeenCalled()
  expect(f.status("a")).toBe("queued")
})

it("backs off temporary container failures, respects that delay during sweeps, and reuses the daily claim", async () => {
  const f = fixture()
  f.add("a")
  await enqueueBuild(f.env, "a")
  f.sandbox.writeFile.mockRejectedValueOnce(
    Object.assign(new Error("Capacity unavailable"), { name: "ContainerUnavailableError" })
  )
  await f.context("a").fire()
  expect(f.status("a")).toBe("queued")
  expect(f.reserved()).toEqual([])
  await processBuildQueue(f.env)
  expect(f.reserved()).toEqual([])
  vi.advanceTimersByTime(30_000)
  await processBuildQueue(f.env)
  await f.context("a").fire()
  expect(f.status("a")).toBe("succeeded")
  expect((await buildReservation(f.env, "a"))?.attempts).toBe(2)
  expect(f.db.prepare("SELECT COUNT(*) AS count FROM build_budget_claims").get()?.count).toBe(1)
  expect(f.put).toHaveBeenCalledTimes(2)
})

it("retains capacity on cleanup failure and resumes cleanup after eviction without rebuilding", async () => {
  const f = fixture()
  vi.spyOn(console, "error").mockImplementation(() => {})
  for (const id of ["a", "b", "c", "d"]) f.add(id)
  await processBuildQueue(f.env)
  f.sandbox.destroy
    .mockResolvedValueOnce()
    .mockResolvedValueOnce()
    .mockRejectedValueOnce(new Error("Cleanup unavailable"))
  const job = f.context("a")
  await job.fire()
  expect(job.alarm()).toBe(Date.now() + 30_000)
  expect(f.reserved()).toEqual(["a", "b", "c"])
  expect((await buildReservation(f.env, "a"))?.outcome).toBe("activate")
  expect(mocks.activate).not.toHaveBeenCalled()
  await job.fire()
  expect(f.sandbox.exec).toHaveBeenCalledTimes(2)
  expect(f.reserved()).toEqual(["b", "c", "d"])
  expect(f.status("a")).toBe("succeeded")
})

it("releases capacity while waiting for HTTPS, and duplicate starts do not shorten its alarm", async () => {
  const f = fixture()
  f.add("a")
  await enqueueBuild(f.env, "a")
  mocks.activate.mockRejectedValueOnce(new HttpError(503, "hosting_pending", "Waiting for HTTPS"))
  const job = f.context("a")
  await job.fire()
  expect(f.status("a")).toBe("activating")
  expect(f.reserved()).toEqual([])
  expect(job.alarm()).toBe(Date.now() + 10_000)
  await new BuildJob(job.ctx, f.env).start("a")
  expect(job.alarm()).toBe(Date.now() + 10_000)
  await job.fire()
  expect(f.sandbox.exec).toHaveBeenCalledTimes(2)
  expect(f.status("a")).toBe("succeeded")
})

it("fails broken game builds without retrying and immediately admits the next waiting job", async () => {
  const f = fixture()
  for (const id of ["a", "b", "c", "d"]) f.add(id)
  await processBuildQueue(f.env)
  f.sandbox.exec.mockResolvedValueOnce(fakeProcess("Compilation failed", 1, false))
  await f.context("a").fire()
  expect(f.status("a")).toBe("failed")
  expect(f.reserved()).toEqual(["b", "c", "d"])
  expect(f.sandbox.exec).toHaveBeenCalledOnce()
  expect((await buildReservation(f.env, "a"))?.attempts).toBe(1)
})

it("bounds infrastructure retries and leaves the existing live release alone", async () => {
  const f = fixture()
  f.add("a")
  await enqueueBuild(f.env, "a")
  f.db.exec("UPDATE build_queue SET attempts=6 WHERE deployment_id='a'")
  f.sandbox.writeFile.mockRejectedValueOnce(Object.assign(new Error("Still unavailable"), { retryable: true }))
  await f.context("a").fire()
  expect(f.status("a")).toBe("failed")
  expect(f.reserved()).toEqual([])
  expect(mocks.activate).not.toHaveBeenCalled()
})

it("requeues a terminated process but does not retry its explicit build timeout", async () => {
  const f = fixture()
  f.add("a")
  await enqueueBuild(f.env, "a")
  f.sandbox.exec.mockResolvedValueOnce(fakeProcess("Session terminated", 143, false))
  await f.context("a").fire()
  expect(f.status("a")).toBe("queued")
  expect(f.reserved()).toEqual([])
  vi.advanceTimersByTime(30_000)
  await processBuildQueue(f.env)
  f.sandbox.exec.mockResolvedValueOnce(fakeProcess("Timed out", 143, true))
  await f.context("a").fire()
  expect(f.status("a")).toBe("failed")
  expect(f.reserved()).toEqual([])
})

it("recovers terminal jobs with retained reservations without building or reactivating", async () => {
  const f = fixture()
  f.add("a")
  await enqueueBuild(f.env, "a")
  f.db.exec("UPDATE deployments SET status='superseded' WHERE id='a'")
  await f.context("a").fire()
  expect(f.status("a")).toBe("superseded")
  expect(f.reserved()).toEqual([])
  expect(f.sandbox.exec).not.toHaveBeenCalled()
  expect(mocks.activate).not.toHaveBeenCalled()
})

it("recovers running jobs when builds are disabled but admits no new jobs", async () => {
  const f = fixture()
  f.add("a")
  await enqueueBuild(f.env, "a")
  f.add("b")
  f.env.BUILDS_ENABLED = "false"
  await processBuildQueue(f.env)
  expect(f.reserved()).toEqual(["a"])
  expect(f.wake).toHaveBeenCalledTimes(2)
  await dispatchBuilds(f.env)
  expect((await buildReservation(f.env, "b"))?.attempts).toBe(0)
})

it("distinguishes transient provider errors from source, quota and command failures", () => {
  expect(buildRetryDelay(new HttpError(503, "unavailable", "Unavailable"), 1)).toBe(30_000)
  expect(buildRetryDelay({ retryable: true }, 5)).toBe(300_000)
  expect(buildRetryDelay({ retryable: true }, 6)).toBeNull()
  expect(buildRetryDelay({ message: "max_instances exceeded" }, 2)).toBe(60_000)
  expect(buildRetryDelay({ message: "The maximum number of running containers has been reached" }, 2)).toBe(60_000)
  expect(buildRetryDelay({ name: "RPCTransportError" }, 3)).toBe(120_000)
  expect(buildRetryDelay({ overloaded: true }, 4)).toBe(240_000)
  expect(buildRetryDelay({ retryable: false, name: "RPCTransportError" }, 1)).toBeNull()
  expect(buildRetryDelay(new HttpError(429, "build_budget_exhausted", "Daily allowance"), 1)).toBeNull()
  expect(buildRetryDelay(new HttpError(400, "invalid_archive", "Bad source"), 1)).toBeNull()
  expect(buildRetryDelay(new Error("Build failed"), 1)).toBeNull()
})

it("prioritizes occupied slots and rotates activation recovery beyond the sweep limit", async () => {
  const f = fixture()
  f.env.BUILDS_ENABLED = "false"
  for (let i = 0; i < 25; i++) f.add(`waiting-${i}`)
  await processBuildQueue(f.env)
  f.db.exec("UPDATE deployments SET status='activating',updated_at='2000'; UPDATE build_queue SET finished=1")
  f.add("reserved-last")
  await processBuildQueue(f.env)
  f.db.exec("UPDATE build_queue SET reserved=1 WHERE deployment_id='reserved-last'")
  f.wake.mockClear()
  vi.advanceTimersByTime(1000)
  await processBuildQueue(f.env)
  expect(f.wake.mock.calls[0]?.[0]).toBe("reserved-last")
  await processBuildQueue(f.env)
  expect(new Set(f.wake.mock.calls.map(([id]) => id)).size).toBe(26)
})

it("cancels a deleted project's containers and alarm without resurrecting its build", async () => {
  const f = fixture()
  f.add("deleted-job")
  await enqueueBuild(f.env, "deleted-job")
  const state = f.context("deleted-job")
  const job = new BuildJob(state.ctx, f.env)
  await job.start("deleted-job")
  await expect(job.cancel("deleted-job")).rejects.toThrow("not being deleted")
  f.db.exec(
    "UPDATE projects SET lifecycle='deleting' WHERE id='deleted-job'; UPDATE environments SET enabled=0,current_release_id=NULL WHERE project_id='deleted-job'"
  )
  expect(await job.cancel("deleted-job")).toBe(true)
  expect(state.alarm()).toBeNull()
  expect(state.state.size).toBe(0)
  expect(f.sandbox.destroy).toHaveBeenCalled()
  expect(f.media.destroy).toHaveBeenCalled()
  await job.start("deleted-job")
  await job.alarm()
  expect(f.sandbox.exec).not.toHaveBeenCalled()
  expect(mocks.activate).not.toHaveBeenCalled()
})

it("does not acknowledge deletion while a build is still running", async () => {
  const f = fixture()
  f.add("running-job")
  await enqueueBuild(f.env, "running-job")
  const state = f.context("running-job")
  const job = new BuildJob(state.ctx, f.env)
  let markStarted!: () => void
  let finishCommand!: (value: ReturnType<typeof fakeProcess>) => void
  const started = new Promise<void>((resolve) => {
    markStarted = resolve
  })
  const command = new Promise<ReturnType<typeof fakeProcess>>((resolve) => {
    finishCommand = resolve
  })
  f.sandbox.exec.mockImplementationOnce(() => {
    markStarted()
    return command
  })
  const running = job.alarm()
  await started
  f.db.exec(
    "UPDATE projects SET lifecycle='deleting' WHERE id='running-job'; UPDATE deployments SET status='failed' WHERE id='running-job'"
  )
  expect(await job.cancel("running-job")).toBe(false)
  finishCommand(fakeProcess())
  await running
  expect(await job.cancel("running-job")).toBe(true)
  expect(state.state.size).toBe(0)
  expect(state.alarm()).toBeNull()
  expect(mocks.activate).not.toHaveBeenCalled()
  expect(f.put).not.toHaveBeenCalled()
})
