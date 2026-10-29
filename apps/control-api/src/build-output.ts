import { stripVTControlCharacters } from "node:util"
import type { ProcessExit, SandboxProcess } from "@cloudflare/sandbox"

/** Persist output as it arrives, with bounded storage and resumable SDK cursors. */
export async function streamBuildOutput(
  process: Pick<SandboxProcess, "logs">,
  save: (lines: string[]) => Promise<void>
) {
  const signal = AbortSignal.timeout(620_000)
  const decoders = { stdout: new TextDecoder(), stderr: new TextDecoder() }
  const partial = { stdout: "", stderr: "" }
  let cursor: string | undefined
  let bytes = 0
  let lines = 0
  let limited = false
  let disconnected = 0
  const persist = async (messages: string[]) => {
    const accepted: string[] = []
    for (const message of messages) {
      const clean = stripVTControlCharacters(message)
        // oxlint-disable-next-line no-control-regex -- Remove untrusted control characters before displaying text.
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
        .slice(0, 8192)
      if (!clean) continue
      const size = Buffer.byteLength(clean)
      if (lines < 500 && bytes + size <= 256 * 1024) {
        accepted.push(clean)
        lines++
        bytes += size
      } else if (!limited) {
        accepted.push("Build output limit reached; additional command output is omitted.")
        limited = true
      }
    }
    for (let index = 0; index < accepted.length; index += 50) await save(accepted.slice(index, index + 50))
  }
  while (true) {
    signal.throwIfAborted()
    const stream = await process.logs({ replay: true, follow: true, ...(cursor ? { since: cursor } : {}), signal })
    const reader = stream.getReader()
    let outcome: ProcessExit | undefined
    try {
      while (true) {
        const next = await reader.read()
        if (next.done) break
        const event = next.value
        if (event.type === "stdout" || event.type === "stderr") {
          if (!limited) {
            const text = partial[event.type] + decoders[event.type].decode(event.data, { stream: true })
            const chunks = text.split(/\r\n|\r|\n/)
            partial[event.type] = chunks.pop()!.slice(0, 8192)
            await persist(chunks)
          }
        } else if (event.type === "truncated") {
          await persist(["Some earlier build output is no longer available."])
        } else if (event.type === "terminal") {
          await persist([partial.stdout + decoders.stdout.decode(), partial.stderr + decoders.stderr.decode()])
          if (event.state === "error") throw new Error(`Build process error: ${event.error.code}`)
          outcome = event.exit
        }
        cursor = event.cursor ?? cursor
        if (outcome) return outcome
      }
    } finally {
      await reader.cancel().catch(() => {})
      reader.releaseLock()
    }
    if (++disconnected > 2) throw new Error("Build output connection ended before the process completed.")
  }
}
