import { EventEmitter } from "node:events"
import { afterEach, expect, it, vi } from "vitest"
import { openBrowser } from "./browser"

const launch = vi.hoisted(() => ({
  calls: vi.fn<(...args: unknown[]) => void>(),
  fail: false,
  input: vi.fn<(value: string) => void>()
}))
vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => {
    launch.calls(...args.slice(0, 3))
    const done = args[3] as (error: Error | null) => void
    queueMicrotask(() => done(launch.fail ? new Error("No browser") : null))
    return { stdin: Object.assign(new EventEmitter(), { end: launch.input }) }
  }
}))
afterEach(() => {
  vi.restoreAllMocks()
  launch.calls.mockClear()
  launch.input.mockClear()
  launch.fail = false
})
it.each(["win32", "darwin", "linux"])("opens the browser safely on %s", async (platform) => {
  vi.spyOn(process, "platform", "get").mockReturnValue(platform as NodeJS.Platform)
  const url = "https://example.com/cli/login?state=a&code_challenge=b"
  await openBrowser(url)
  const [command, args, options] = launch.calls.mock.calls[0]!
  expect(command).toBe(platform === "win32" ? "powershell.exe" : platform === "darwin" ? "open" : "xdg-open")
  expect(options).toEqual({ windowsHide: true, timeout: 10_000 })
  expect(args).toEqual(
    platform === "win32"
      ? ["-NoProfile", "-NonInteractive", "-Command", "Start-Process -FilePath ([Console]::In.ReadToEnd())"]
      : [url]
  )
  expect(launch.input.mock.calls).toEqual(platform === "win32" ? [[url]] : [])
})
it("reports an unavailable browser without exposing process details", async () => {
  launch.fail = true
  await expect(openBrowser("https://example.com")).rejects.toThrow("Open the link above")
})
