import type { ProcessLogEvent, SandboxProcess } from "@cloudflare/sandbox"
import { expect, it, vi } from "vitest"
import { streamBuildOutput } from "./build-output"
import { mediaWarnings } from "./media-warnings"

const line = (data: Uint8Array, cursor = "1", type: "stdout" | "stderr" = "stdout"): ProcessLogEvent => ({
  type,
  data,
  cursor,
  timestamp: "now"
})
const end = (code = 0): ProcessLogEvent => ({
  type: "terminal",
  state: "exited",
  cursor: "9",
  timestamp: "now",
  exit: { code, timedOut: false }
})
function events(items: ProcessLogEvent[]) {
  return new ReadableStream<ProcessLogEvent>({
    start(controller) {
      for (const item of items) controller.enqueue(item)
      controller.close()
    }
  })
}

it("persists output before completion and preserves UTF-8, partial lines and stdout/stderr order", async () => {
  let feed!: ReadableStreamDefaultController<ProcessLogEvent>
  const saved: string[] = []
  const logs = vi.fn<SandboxProcess["logs"]>(
    async () =>
      new ReadableStream({
        start(controller) {
          feed = controller
        }
      })
  )
  let finished = false
  const work = streamBuildOutput({ logs }, async (lines) => {
    saved.push(...lines)
  }).then((result) => {
    finished = true
    return result
  })
  await vi.waitFor(() => expect(feed).toBeDefined())
  const text = new TextEncoder().encode("\u001b[32mBuild → ready\u001b[0m\n")
  feed.enqueue(line(text.subarray(0, 13)))
  feed.enqueue(line(text.subarray(13), "2"))
  feed.enqueue(line(new TextEncoder().encode("warning\n"), "3", "stderr"))
  await vi.waitFor(() => expect(saved).toEqual(["Build → ready", "warning"]))
  expect(finished).toBe(false)
  feed.enqueue(line(new TextEncoder().encode("last partial"), "4"))
  feed.enqueue(end(1))
  feed.close()
  expect(await work).toEqual({ code: 1, timedOut: false })
  expect(saved.at(-1)).toBe("last partial")
})

it("resumes clean disconnections from the last cursor and bounds persisted output", async () => {
  const logs = vi
    .fn<SandboxProcess["logs"]>()
    .mockResolvedValueOnce(events([line(new TextEncoder().encode("first\n"))]))
    .mockResolvedValueOnce(events([line(new TextEncoder().encode("x\n".repeat(600)), "2"), end()]))
  const saved: string[] = []
  await streamBuildOutput({ logs }, async (lines) => {
    expect(lines.length).toBeLessThanOrEqual(50)
    saved.push(...lines)
  })
  expect(logs.mock.calls[1]?.[0]).toMatchObject({ since: "1", follow: true })
  expect(saved).toHaveLength(501)
  expect(saved.at(-1)).toContain("limit reached")
})

it("reports truncated streams and fails when a process has no terminal result", async () => {
  const saved: string[] = []
  const logs = vi
    .fn<SandboxProcess["logs"]>()
    .mockImplementation(async () => events([{ type: "truncated", timestamp: "now" }]))
  await expect(
    streamBuildOutput({ logs }, async (lines) => {
      saved.push(...lines)
    })
  ).rejects.toThrow("before the process completed")
  expect(saved[0]).toContain("no longer available")
  expect(logs).toHaveBeenCalledTimes(3)
})

it("bounds media warnings and excludes unrelated or malformed metadata", () => {
  expect(
    mediaWarnings(
      JSON.stringify([
        { kind: "cover", message: "\u001b[31mToo large\u001b[0m" },
        { kind: "trailer", message: "x".repeat(600) },
        { kind: "cover", message: "extra" }
      ])
    )
  ).toEqual([
    { kind: "cover", message: "Too large" },
    { kind: "trailer", message: "x".repeat(512) }
  ])
  expect(
    mediaWarnings([
      { kind: "approval", message: "private" },
      { kind: "cover", message: 3 }
    ])
  ).toEqual([])
  expect(mediaWarnings("not json")).toEqual([])
})
