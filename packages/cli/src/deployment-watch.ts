import { setTimeout as delay } from "node:timers/promises"
import { stripVTControlCharacters } from "node:util"
import type { Deployment, PlatformApi } from "./platform-api"

export const terminalDeployment = (status: string) =>
  ["succeeded", "failed", "cancelled", "superseded"].includes(status)

export async function watchDeployment(
  api: Pick<PlatformApi, "status" | "logs">,
  projectId: string,
  initial: Deployment,
  write: (text: string) => void,
  options: {
    cursor?: string | undefined
    signal?: AbortSignal | undefined
    sleep?: ((ms: number, signal: AbortSignal) => Promise<void>) | undefined
  } = {}
) {
  const controller = new AbortController()
  const interrupt = () => controller.abort()
  const signal = options.signal ?? controller.signal
  const sleep = options.sleep ?? ((ms, signal) => delay(ms, undefined, { signal }))
  let deployment = initial
  let cursor = Number(options.cursor ?? 0)
  if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("Invalid log cursor.")
  if (!options.signal) process.once("SIGINT", interrupt)
  let failures = 0
  const started = Date.now()
  const logs = async () => {
    // Bounded catch-up: the build itself retains at most 500 command-output lines.
    for (let page = 0; page < 10; page++) {
      const result = await api.logs(projectId, initial.id, cursor ? String(cursor) : undefined, signal)
      if (
        !Array.isArray(result.entries) ||
        result.entries.some(
          (entry) => !Number.isSafeInteger(entry.sequence) || entry.sequence < 1 || typeof entry.message !== "string"
        )
      )
        throw new Error("Invalid log response.")
      const fresh = result.entries.filter((entry) => entry.sequence > cursor).sort((a, b) => a.sequence - b.sequence)
      for (const entry of fresh) {
        if (entry.sequence <= cursor) continue
        write(stripVTControlCharacters(entry.message) + "\n")
        cursor = entry.sequence
      }
      if (result.entries.length < 100 || !fresh.length) return
    }
  }
  try {
    write(`Deployment: ${initial.id} · ${initial.status}\n`)
    while (true) {
      signal.throwIfAborted()
      if (Date.now() - started > 30 * 60_000)
        throw new Error("Stopped waiting after 30 minutes; the deployment may still be running.")
      try {
        await logs()
        const next = await api.status(projectId, initial.id, signal)
        if (
          next.id !== initial.id ||
          next.environment !== initial.environment ||
          !["queued", "building", "activating", "succeeded", "failed", "cancelled", "superseded"].includes(next.status)
        )
          throw new Error("Invalid deployment status response.")
        if (next.status !== deployment.status) write(`Status: ${next.status}\n`)
        deployment = next
        if (terminalDeployment(deployment.status)) {
          // Status can become terminal between the log read and status read.
          await logs()
          return { deployment, interrupted: false }
        }
        failures = 0
      } catch (error) {
        if (signal.aborted) throw error
        if (++failures > 3) throw error
        write("Connection interrupted. Reconnecting to deployment logs…\n")
      }
      await sleep(3_000, signal)
    }
  } catch (error) {
    if (signal.aborted) return { deployment, interrupted: true }
    throw new Error(
      `${error instanceof Error ? error.message : "Could not follow deployment."}\nDeployment was already submitted. Resume: spawn logs ${initial.id} --project ${projectId} --follow\nCheck status: spawn status ${initial.id} --project ${projectId}`
    )
  } finally {
    if (!options.signal) process.removeListener("SIGINT", interrupt)
  }
}
