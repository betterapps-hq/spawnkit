import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { runCli } from "./cli"
import type { LinkPrompts } from "./link"
import { guidedLink } from "./link"
import type { PlatformApi } from "./platform-api"
import { createPlatformApi } from "./platform-api"
import { projectSelection } from "./project"

let root: string
let output: string
const write = (text: string) => {
  output += text
}
const prompts = () => ({
  action: vi.fn<LinkPrompts["action"]>().mockResolvedValue("new"),
  name: vi.fn<LinkPrompts["name"]>().mockResolvedValue("Moon Garden"),
  project: vi.fn<LinkPrompts["project"]>().mockResolvedValue("existing"),
  confirm: vi.fn<LinkPrompts["confirm"]>().mockResolvedValue(true)
})
const api = () => ({
  ...createPlatformApi({ site: "https://spawn.example", accessToken: "fixture" }),
  projects: vi
    .fn<PlatformApi["projects"]>()
    .mockResolvedValue({ projects: [{ id: "existing", name: "Existing game" }] }),
  createProject: vi.fn<PlatformApi["createProject"]>().mockImplementation(async (body) => body),
  project: vi.fn<PlatformApi["project"]>().mockImplementation(async (id) => ({
    id,
    name: "Moon Garden",
    environments: {
      sandbox: { enabled: false, currentReleaseId: null },
      production: { enabled: true, currentReleaseId: null }
    }
  }))
})
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "spawn-link-"))
  output = ""
  await writeFile(join(root, "game.config.json"), JSON.stringify({ name: "local-game" }))
  await mkdir(join(root, "src"))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})
it("creates with the editable local name and links from a nested folder", async () => {
  const service = api(),
    questions = prompts()
  await runCli(["link"], join(root, "src"), write, { platform: { api: service }, linkPrompts: questions })
  expect(questions.name).toHaveBeenCalledWith("local-game")
  expect(service.createProject).toHaveBeenCalledWith({
    id: expect.any(String),
    name: "Moon Garden",
    configuration: { sandbox: false }
  })
  expect((await projectSelection("show", undefined, root)).projectId).toBe(service.createProject.mock.calls[0]![0].id)
  expect(output).toContain("Next: spawn deploy --dry-run")
})
it("lists and verifies an existing project without creating one", async () => {
  const service = api(),
    questions = prompts()
  questions.action.mockResolvedValue("existing")
  await guidedLink(root, questions, write, service)
  expect(service.project).toHaveBeenCalledWith("existing")
  expect(service.createProject).not.toHaveBeenCalled()
  expect((await projectSelection("show", undefined, root)).projectId).toBe("existing")
})
it("skip does not read credentials or call the API", async () => {
  const questions = prompts()
  questions.action.mockResolvedValue("skip")
  await guidedLink(root, questions, write)
  expect((await projectSelection("show", undefined, root)).projectId).toBeNull()
  expect(output).toContain("skipped")
})
it("declining creation makes no hosted or local changes", async () => {
  const service = api(),
    questions = prompts()
  questions.confirm.mockResolvedValue(false)
  await guidedLink(root, questions, write, service)
  expect(service.createProject).not.toHaveBeenCalled()
  expect((await projectSelection("show", undefined, root)).projectId).toBeNull()
})
it("keeps an uncertain creation recoverable by ID", async () => {
  const service = api()
  service.createProject.mockRejectedValue(new Error("timeout"))
  await expect(guidedLink(root, prompts(), write, service)).rejects.toThrow("If it exists, run spawn link --project")
  expect((await projectSelection("show", undefined, root)).projectId).toBeNull()
})
it("handles empty accounts and keeps JSON noninteractive", async () => {
  const service = api(),
    questions = prompts()
  questions.action.mockResolvedValue("existing")
  service.projects.mockResolvedValue({ projects: [] })
  await guidedLink(root, questions, write, service)
  expect(output).toContain("No hosted projects yet")
  await expect(runCli(["link", "--json"], root, write, { linkPrompts: questions })).rejects.toThrow("--project")
})
it("uses the authenticated website project endpoints", async () => {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ projects: [] }))
  const service = createPlatformApi({ site: "https://spawn.example", accessToken: "fixture" }, transport)
  await service.projects()
  expect(transport).toHaveBeenLastCalledWith(
    "https://spawn.example/api/platform/v1/projects",
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer fixture" }) })
  )
  transport.mockResolvedValue(Response.json({ id: "new", name: "Game" }))
  await service.createProject({ id: "new", name: "Game", configuration: { sandbox: false } })
  expect(transport).toHaveBeenLastCalledWith(
    "https://spawn.example/api/platform/v1/projects",
    expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Idempotency-Key": "new" }) })
  )
})
