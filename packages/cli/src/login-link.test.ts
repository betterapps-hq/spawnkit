import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { login } from "./auth"
import { runCli } from "./cli"
import type { LinkPrompts } from "./link"

vi.mock("./auth", async (original) => ({
  ...(await original<typeof import("./auth")>()),
  login: vi.fn<typeof login>().mockResolvedValue({ status: "signed-in", site: "https://spawn.example" })
}))
let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "spawn-login-link-"))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})
const prompts = (): LinkPrompts => ({
  action: vi.fn<LinkPrompts["action"]>().mockResolvedValue("skip"),
  name: vi.fn<LinkPrompts["name"]>(),
  project: vi.fn<LinkPrompts["project"]>(),
  confirm: vi.fn<LinkPrompts["confirm"]>()
})
it("offers linking after successful login inside a game", async () => {
  await writeFile(join(root, "game.config.json"), '{"name":"game"}')
  const questions = prompts()
  let output = ""
  await runCli(
    ["login", "--site", "https://spawn.example", "--no-browser"],
    root,
    (text) => {
      output += text
    },
    { linkPrompts: questions }
  )
  expect(questions.action).toHaveBeenCalledOnce()
  expect(output).toContain("Signed in to SpawnKit.")
  expect(output).toContain("linking skipped")
})
it("does not prompt outside a game or in JSON mode", async () => {
  const questions = prompts()
  let output = ""
  await runCli(
    ["login", "--site", "https://spawn.example", "--no-browser"],
    root,
    (text) => {
      output += text
    },
    { linkPrompts: questions }
  )
  expect(output).toContain("enter its folder")
  await writeFile(join(root, "game.config.json"), '{"name":"game"}')
  await runCli(["login", "--site", "https://spawn.example", "--json"], root, () => {}, { linkPrompts: questions })
  expect(questions.action).not.toHaveBeenCalled()
})
it("preserves successful sign-in when linking fails", async () => {
  await writeFile(join(root, "game.config.json"), '{"name":"game"}')
  const questions = prompts()
  vi.mocked(questions.action).mockRejectedValue(new Error("Picker failed"))
  let output = ""
  await runCli(
    ["login", "--site", "https://spawn.example", "--no-browser"],
    root,
    (text) => {
      output += text
    },
    { linkPrompts: questions }
  )
  expect(output).toContain("You are signed in, but project linking did not finish")
})

it("links the explicit game folder when login runs elsewhere", async () => {
  await writeFile(join(root, "game.config.json"), '{"name":"game"}')
  const questions = prompts()
  await runCli(["login", "--site", "https://spawn.example", "--directory", root, "--no-browser"], tmpdir(), () => {}, {
    linkPrompts: questions
  })
  expect(questions.action).toHaveBeenCalledOnce()
})
