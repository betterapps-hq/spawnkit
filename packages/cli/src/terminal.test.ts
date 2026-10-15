import * as prompts from "@clack/prompts"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { runCli } from "./cli"
import { runTerminal } from "./terminal"

vi.mock("@clack/prompts", () => ({
  intro: vi.fn<(...args: unknown[]) => unknown>(),
  outro: vi.fn<(...args: unknown[]) => unknown>(),
  note: vi.fn<(...args: unknown[]) => unknown>(),
  cancel: vi.fn<(...args: unknown[]) => unknown>(),
  log: { info: vi.fn<(...args: unknown[]) => unknown>() },
  password: vi.fn<(...args: unknown[]) => unknown>(),
  text: vi.fn<(...args: unknown[]) => unknown>(),
  select: vi.fn<(...args: unknown[]) => unknown>(),
  multiselect: vi.fn<(...args: unknown[]) => unknown>(),
  confirm: vi.fn<(...args: unknown[]) => unknown>(),
  isCancel: (value: unknown) => typeof value === "symbol",
  spinner: () => ({
    start: vi.fn<(...args: unknown[]) => unknown>(),
    stop: vi.fn<(...args: unknown[]) => unknown>(),
    error: vi.fn<(...args: unknown[]) => unknown>()
  })
}))
vi.mock("./cli", () => ({ runCli: vi.fn<(...args: unknown[]) => unknown>() }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prompts.confirm).mockResolvedValue(false)
  vi.mocked(runCli).mockImplementation(async (_args, _cwd, write) => {
    write(
      JSON.stringify({
        status: "created",
        name: "test-game",
        destination: "/test-game",
        modules: ["pixi"],
        files: ["main.ts"],
        nextSteps: ["pnpm install"]
      })
    )
  })
})
afterEach(() => {
  process.exitCode = 0
})
it("guides through compatible renderer, physics, UI, and telemetry choices", async () => {
  vi.mocked(prompts.text).mockResolvedValue("test-game")
  vi.mocked(prompts.select)
    .mockResolvedValueOnce("pixi")
    .mockResolvedValueOnce("rapier2d")
    .mockResolvedValueOnce("pixi")
    .mockResolvedValueOnce("bitecs")
    .mockResolvedValueOnce("platform")
  vi.mocked(prompts.multiselect).mockResolvedValue(["vitest"])
  vi.mocked(prompts.confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(true)
  await runTerminal(["init"], { interactive: true, tty: true })
  expect(runCli).toHaveBeenCalledWith(
    ["init", "test-game", "--add", "pixi,rapier2d,pixi-ui,platform-telemetry,bitecs,vitest,storybook"],
    expect.any(String),
    expect.any(Function),
    expect.objectContaining({ composition: expect.any(Object) })
  )
  expect(prompts.outro).toHaveBeenCalledWith("Ready for your next step.")
})
it("cancels before generation without reporting success", async () => {
  vi.mocked(prompts.text).mockResolvedValue(Symbol("cancel") as never)
  await runTerminal(["init"], { interactive: true, tty: true })
  expect(runCli).not.toHaveBeenCalled()
  expect(prompts.cancel).toHaveBeenCalledWith("Setup cancelled. No files were written.")
  expect(process.exitCode).toBe(130)
})
it("never prompts or decorates JSON automation output", async () => {
  vi.mocked(runCli).mockResolvedValue()
  await runTerminal(["init", "demo", "--json"], { interactive: true, tty: true })
  expect(prompts.intro).not.toHaveBeenCalled()
  expect(prompts.text).not.toHaveBeenCalled()
  expect(runCli).toHaveBeenCalledWith(["init", "demo", "--json"], expect.any(String), expect.any(Function))
})
it("does not display success when generation fails", async () => {
  vi.mocked(runCli).mockRejectedValueOnce(new Error("Destination exists"))
  await expect(runTerminal(["init", "demo"], { interactive: false, tty: true })).rejects.toThrow("Destination exists")
  expect(prompts.outro).not.toHaveBeenCalled()
})

it("declines the reviewed plan without generating files", async () => {
  vi.mocked(prompts.text).mockResolvedValue("test-game")
  vi.mocked(prompts.select)
    .mockResolvedValueOnce("pixi")
    .mockResolvedValueOnce("none")
    .mockResolvedValueOnce("html")
    .mockResolvedValueOnce("none")
    .mockResolvedValueOnce("none")
  vi.mocked(prompts.multiselect).mockResolvedValue([])
  await runTerminal(["init"], { interactive: true, tty: true })
  expect(runCli).toHaveBeenCalledTimes(1)
  const setup = vi.mocked(runCli).mock.calls[0]![3]!
  expect(await setup.composition!.confirm("Review plan")).toBe(false)
  expect(prompts.note).toHaveBeenCalledWith("Review plan", "Review changes")
})

it("asks for a masked Sentry DSN and keeps it out of displayed plans", async () => {
  const dsn = "https://publickey@sentry.example/123"
  vi.mocked(prompts.text).mockResolvedValue("test-game")
  vi.mocked(prompts.select)
    .mockResolvedValueOnce("pixi")
    .mockResolvedValueOnce("none")
    .mockResolvedValueOnce("html")
    .mockResolvedValueOnce("none")
    .mockResolvedValueOnce("sentry")
  vi.mocked(prompts.multiselect).mockResolvedValue([])
  vi.mocked(prompts.password).mockResolvedValue(dsn)
  vi.mocked(prompts.confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  await runTerminal(["init"], { interactive: true, tty: true })
  expect(prompts.password).toHaveBeenCalledOnce()
  expect(runCli).toHaveBeenLastCalledWith(expect.any(Array), expect.any(String), expect.any(Function), {
    sentryDsn: dsn,
    composition: expect.any(Object)
  })
  expect(JSON.stringify(vi.mocked(prompts.note).mock.calls)).not.toContain(dsn)
})
it("cancels at the DSN prompt before generating anything", async () => {
  vi.mocked(prompts.text).mockResolvedValue("test-game")
  vi.mocked(prompts.select)
    .mockResolvedValueOnce("pixi")
    .mockResolvedValueOnce("none")
    .mockResolvedValueOnce("html")
    .mockResolvedValueOnce("none")
    .mockResolvedValueOnce("sentry")
  vi.mocked(prompts.multiselect).mockResolvedValue([])
  vi.mocked(prompts.password).mockResolvedValue(Symbol("cancel") as never)
  await runTerminal(["init"], { interactive: true, tty: true })
  expect(runCli).not.toHaveBeenCalled()
  expect(prompts.cancel).toHaveBeenCalled()
})
