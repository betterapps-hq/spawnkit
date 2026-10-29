import * as prompts from "@clack/prompts"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { runCli } from "./cli"
import { runTerminal } from "./terminal"

vi.mock("@clack/prompts", () => ({
  intro: vi.fn<(...args: unknown[]) => unknown>(),
  outro: vi.fn<(...args: unknown[]) => unknown>(),
  note: vi.fn<(...args: unknown[]) => unknown>(),
  cancel: vi.fn<(...args: unknown[]) => unknown>(),
  log: {
    info: vi.fn<(...args: unknown[]) => unknown>(),
    message: vi.fn<(...args: unknown[]) => unknown>(),
    error: vi.fn<(...args: unknown[]) => unknown>(),
    step: vi.fn<(...args: unknown[]) => unknown>()
  },
  password: vi.fn<(...args: unknown[]) => unknown>(),
  text: vi.fn<(...args: unknown[]) => unknown>(),
  select: vi.fn<(...args: unknown[]) => unknown>(),
  multiselect: vi.fn<(...args: unknown[]) => unknown>(),
  confirm: vi.fn<(...args: unknown[]) => unknown>(),
  isCancel: (value: unknown) => typeof value === "symbol"
}))
vi.mock("./cli", () => ({ runCli: vi.fn<(...args: unknown[]) => unknown>() }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(runCli).mockResolvedValue()
})
afterEach(() => {
  process.exitCode = 0
})

it("starts the guided setup for a bare spawn in an interactive terminal", async () => {
  await runTerminal([], { interactive: true, tty: true })
  expect(runCli).toHaveBeenCalledWith(["init"], expect.any(String), expect.any(Function), {
    project: {
      isTTY: true,
      prompter: expect.objectContaining({ select: expect.any(Function) }),
      stderr: expect.any(Function)
    }
  })
  expect(prompts.outro).toHaveBeenCalledWith("Ready for your next step.")
})
it("never prompts in a terminal that isn't interactive", async () => {
  await runTerminal(["init", "pixi", "demo"], { interactive: false, tty: true })
  expect(vi.mocked(runCli).mock.calls[0]![3]).toMatchObject({ project: { isTTY: false } })
})
it("never prompts or decorates JSON automation output", async () => {
  await runTerminal(["init", "pixi", "demo", "--json"], { interactive: true, tty: true })
  expect(prompts.intro).not.toHaveBeenCalled()
  expect(runCli).toHaveBeenCalledWith(["init", "pixi", "demo", "--json"], expect.any(String), expect.any(Function))
})
it.each([
  { code: 1, outro: "Choose an answer above, then run the command again." },
  { code: 130, outro: "Cancelled. Nothing was changed." },
  { code: 3, outro: "Review the message above." }
])("ends with what to do next after exit code $code", async ({ code, outro }) => {
  vi.mocked(runCli).mockImplementation(async () => {
    process.exitCode = code
  })
  await runTerminal(["add", "sentry"], { interactive: true, tty: true })
  expect(prompts.outro).toHaveBeenCalledWith(outro)
})
it("does not display success when a command fails", async () => {
  vi.mocked(runCli).mockRejectedValueOnce(new Error("Destination exists"))
  await expect(runTerminal(["init", "pixi", "demo"], { interactive: false, tty: true })).rejects.toThrow(
    "Destination exists"
  )
  expect(prompts.outro).not.toHaveBeenCalled()
})
it("shows help as a command reference", async () => {
  vi.mocked(runCli).mockImplementation(async (_args, _cwd, write) => {
    write("SPAWNKIT  /  Build your next world\n\nTemplates: pixi\n")
  })
  await runTerminal(["--help"], { interactive: true, tty: true })
  expect(prompts.note).toHaveBeenCalledWith("Templates: pixi", "Command reference")
})
it("routes deploy status to the platform", async () => {
  await runTerminal(["status", "dep_123"], { interactive: false, tty: true })
  expect(vi.mocked(runCli).mock.calls[0]![3]).toHaveProperty("platform")
})
