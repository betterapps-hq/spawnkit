import { createHash } from "node:crypto"
import { mkdtemp, mkdir, readFile, rm, writeFile, link } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { gunzipSync } from "node:zlib"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { runCli } from "./cli"
import { createPlatformApi } from "./platform-api"
import type { PlatformApi, Project } from "./platform-api"
import { projectSelection } from "./project"
import { createSourceArchive, findGameRoot, sourceLimits, validateSourcePath } from "./source"

let root: string
it("links only after checking account access and resolves nested game directories", async () => {
  const api = fixture()
  await runCli(["link", "--project", "game_1", "--json"], join(root, "src"), write, { platform: { api } })
  expect(api.project).toHaveBeenCalledWith("game_1")
  expect(JSON.parse(output)).toMatchObject({ projectId: "game_1", directory: root, verified: true })
  expect((await projectSelection("show", undefined, join(root, "src"))).projectId).toBe("game_1")
  await runCli(["unlink"], join(root, "src"), write)
  expect((await projectSelection("show", undefined, root)).projectId).toBeNull()
  api.project.mockRejectedValue(new Error("Account access denied"))
  await expect(runCli(["link", "--project", "game_1"], root, write, { platform: { api } })).rejects.toThrow("denied")
  expect((await projectSelection("show", undefined, root)).projectId).toBeNull()
})
it("rejects invalid environment options before authentication or API requests", async () => {
  const api = fixture()
  await expect(
    runCli(["rollback", "release_1", "--project", "game_1"], root, write, { platform: { api } })
  ).rejects.toThrow("explicit --env")
  await expect(runCli(["deploy", "--env", "typo"], root, write, { platform: { api } })).rejects.toThrow("Choose --env")
  await expect(
    runCli(["promote", "release_1", "--env", "sandbox"], root, write, { platform: { api } })
  ).rejects.toThrow("production only")
  expect(api.project).not.toHaveBeenCalled()
})
it.each(["failed", "cancelled", "superseded"])(
  "reports %s deployments to automation without discarding structured status",
  async (status) => {
    const api = fixture()
    api.status.mockResolvedValue({ id: "deployment_1", status, environment: "sandbox" })
    const previous = process.exitCode
    try {
      await runCli(["status", "deployment_1", "--project", "game_1", "--json"], root, write, { platform: { api } })
      expect(process.exitCode).toBe(1)
      expect(JSON.parse(output).status).toBe(status)
    } finally {
      process.exitCode = previous
    }
  }
)
let output: string
const write = (text: string) => {
  output += text
}
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "spawn-platform-"))
  output = ""
  await writeFile(join(root, "game.config.json"), JSON.stringify({ build: { output: "public-output" } }))
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "test-game", scripts: { build: "do-not-run-locally" } })
  )
  await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n")
  await mkdir(join(root, "src"))
  await writeFile(join(root, "src/main.ts"), "export const game = true\n")
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function fixture(sandbox = true) {
  const project: Project = {
    id: "game_1",
    name: "Moon Garden",
    environments: {
      sandbox: { enabled: sandbox, currentReleaseId: "release_s" },
      production: { enabled: true, currentReleaseId: "release_p" }
    }
  }
  const deployment = { id: "deployment_1", status: "queued", environment: "sandbox" as const }
  const api = {
    projects: vi.fn<PlatformApi["projects"]>().mockResolvedValue({ projects: [project] }),
    createProject: vi.fn<PlatformApi["createProject"]>(),
    project: vi.fn<PlatformApi["project"]>().mockResolvedValue(project),
    createUpload: vi.fn<PlatformApi["createUpload"]>().mockResolvedValue({ id: "upload_1" }),
    upload: vi
      .fn<PlatformApi["upload"]>()
      .mockImplementation(async (_project, id, bytes, sha256) => ({ id, sha256, sizeBytes: bytes.length })),
    deploy: vi.fn<PlatformApi["deploy"]>().mockResolvedValue(deployment),
    releases: vi.fn<PlatformApi["releases"]>().mockResolvedValue({ releases: [], nextCursor: "page-2" }),
    status: vi.fn<PlatformApi["status"]>().mockResolvedValue(deployment),
    logs: vi
      .fn<PlatformApi["logs"]>()
      .mockResolvedValue({ entries: [{ sequence: 1, message: "Installing dependencies" }] }),
    promote: vi.fn<PlatformApi["promote"]>().mockResolvedValue({ ...deployment, environment: "production" }),
    rollback: vi.fn<PlatformApi["rollback"]>().mockResolvedValue({ ...deployment, environment: "production" })
  }
  return api
}

it("packages deterministic source, excludes secrets and outputs, and respects additive ignores", async () => {
  for (const folder of ["node_modules", "dist", ".git", ".spawn", "public-output", "private-notes"]) {
    await mkdir(join(root, folder))
    await writeFile(join(root, folder, "hidden.txt"), "not-uploaded")
  }
  await writeFile(join(root, ".env"), "SECRET=not-uploaded")
  await writeFile(join(root, "src/.env.production"), "SECRET=not-uploaded")
  await writeFile(join(root, "private.key"), "not-uploaded")
  await writeFile(join(root, ".spawnignore"), "private-notes/\n")
  const archive = await createSourceArchive(root)
  const decoded = JSON.parse(gunzipSync(archive.bytes).toString()) as { files: { path: string; content: string }[] }
  expect(decoded.files.map((file) => file.path)).toEqual([
    ".spawnignore",
    "game.config.json",
    "package.json",
    "pnpm-lock.yaml",
    "src/main.ts"
  ])
  expect(decoded.files.some((file) => Buffer.from(file.content, "base64").toString().includes("not-uploaded"))).toBe(
    false
  )
  expect(archive.sha256).toBe(createHash("sha256").update(archive.bytes).digest("hex"))
  expect((await createSourceArchive(root)).sha256).toBe(archive.sha256)
  expect(await findGameRoot(join(root, "src"))).toBe(root)
})
it.each(["../x", "/absolute", "a/../b", "a\\b", "a:stream", "CON", "nul.txt", "foo.", "foo//bar", "foo\nbar"])(
  "rejects unsafe archive path %j",
  (path) => {
    expect(() => validateSourcePath(path)).toThrow("Unsafe")
  }
)
it("rejects linked source, missing lockfiles, oversized files and credential signatures", async () => {
  await link(join(root, "src/main.ts"), join(root, "copy.ts"))
  await expect(createSourceArchive(root)).rejects.toThrow("linked")
  await rm(join(root, "copy.ts"))
  await writeFile(join(root, "src/main.ts"), "-----BEGIN PRIVATE KEY-----")
  await expect(createSourceArchive(root)).rejects.toThrow("Possible credential")
  await writeFile(join(root, "src/main.ts"), Buffer.alloc(sourceLimits.bytes + 1))
  await expect(createSourceArchive(root)).rejects.toThrow("limit")
  await writeFile(join(root, "src/main.ts"), "safe")
  await rm(join(root, "pnpm-lock.yaml"))
  await expect(createSourceArchive(root)).rejects.toThrow("pnpm-lock.yaml")
})
it.each([true, false])("previews default destination (Sandbox enabled: %s) without mutations", async (sandbox) => {
  const api = fixture(sandbox)
  await runCli(["deploy", "--project", "game_1", "--dry-run", "--json"], root, write, { platform: { api } })
  expect(JSON.parse(output).environment).toBe(sandbox ? "sandbox" : "production")
  expect(api.createUpload).not.toHaveBeenCalled()
  expect(api.deploy).not.toHaveBeenCalled()
})
it("uploads verified source before requesting a hosted build with predecessor and retry identity", async () => {
  const api = fixture()
  await runCli(
    ["deploy", "--project", "game_1", "--yes", "--json", "--request-id", "retry-1", "--env", "staging"],
    root,
    write,
    { platform: { api } }
  )
  expect(api.deploy).toHaveBeenCalledWith(
    "game_1",
    { uploadId: "upload_1", environment: "sandbox", expectedReleaseId: "release_s" },
    "retry-1"
  )
  expect(api.upload.mock.invocationCallOrder[0]).toBeLessThan(api.deploy.mock.invocationCallOrder[0]!)
  expect(JSON.parse(output)).toMatchObject({ status: "queued", requestId: "retry-1", projectId: "game_1" })
  expect(await readFile(join(root, "package.json"), "utf8")).toContain("do-not-run-locally")
})
it("stops on mismatched digest, cancellation or missing noninteractive approval", async () => {
  const api = fixture()
  await expect(runCli(["deploy", "--project", "game_1", "--json"], root, write, { platform: { api } })).rejects.toThrow(
    "--yes"
  )
  const confirm = vi.fn<(summary: string) => Promise<boolean>>().mockResolvedValue(false)
  await runCli(["deploy", "--project", "game_1"], root, write, { platform: { api, confirm } })
  expect(confirm.mock.calls[0]![0]).toContain("Target: Sandbox")
  expect(api.createUpload).not.toHaveBeenCalled()
  api.upload.mockResolvedValue({ id: "upload_1", sha256: "wrong", sizeBytes: 1 })
  await expect(runCli(["deploy", "--project", "game_1", "--yes"], root, write, { platform: { api } })).rejects.toThrow(
    "verification failed"
  )
  expect(api.deploy).not.toHaveBeenCalled()
})
it("promotes and rolls back retained releases without packaging source or rebuilding", async () => {
  const api = fixture()
  await rm(join(root, "pnpm-lock.yaml"))
  await runCli(["promote", "release_s", "--project", "game_1", "--yes", "--request-id", "promotion-1"], root, write, {
    platform: { api }
  })
  expect(api.promote).toHaveBeenCalledWith(
    "game_1",
    { releaseId: "release_s", environment: "production", expectedReleaseId: "release_p" },
    "promotion-1"
  )
  await expect(
    runCli(["rollback", "retained_1", "--project", "game_1", "--yes"], root, write, { platform: { api } })
  ).rejects.toThrow("explicit --env")
  await runCli(
    ["rollback", "retained_1", "--project", "game_1", "--env", "production", "--yes", "--request-id", "rollback-1"],
    root,
    write,
    { platform: { api } }
  )
  expect(api.rollback).toHaveBeenCalledWith(
    "game_1",
    { releaseId: "retained_1", environment: "production", expectedReleaseId: "release_p" },
    "rollback-1"
  )
  expect(api.createUpload).not.toHaveBeenCalled()
  expect(api.deploy).not.toHaveBeenCalled()
})
it("reads release pages, status and logs with a machine-readable result", async () => {
  const api = fixture()
  await runCli(["releases", "--project", "game_1", "--cursor", "page-1", "--json"], root, write, { platform: { api } })
  expect(api.releases).toHaveBeenCalledWith("game_1", "page-1")
  expect(JSON.parse(output).nextCursor).toBe("page-2")
  output = ""
  await runCli(["status", "deployment_1", "--project", "game_1", "--json"], root, write, { platform: { api } })
  expect(JSON.parse(output).status).toBe("queued")
  output = ""
  await runCli(["logs", "deployment_1", "--project", "game_1", "--json"], root, write, { platform: { api } })
  expect(JSON.parse(output).entries[0].message).toBe("Installing dependencies")
})
it("binds bearer auth to the login origin, rejects redirects and does not echo server errors or credentials", async () => {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "game_1" }))
  const api = createPlatformApi({ site: "https://spawn.example", accessToken: "fixture-token" }, transport)
  await api.project("game_1")
  expect(transport).toHaveBeenCalledWith(
    "https://spawn.example/api/platform/v1/projects/game_1",
    expect.objectContaining({
      redirect: "error",
      headers: expect.objectContaining({ Authorization: "Bearer fixture-token" })
    })
  )
  transport.mockResolvedValue(Response.json({ error: { message: "DO_NOT_ECHO" } }, { status: 403 }))
  await expect(api.project("game_1")).rejects.toThrow("Your account cannot")
  transport.mockRejectedValue(new Error("fixture-token"))
  await expect(api.project("game_1")).rejects.toThrow("Could not reach SpawnKit")
  expect(() => api.status("game_1", "../escape")).toThrow("Invalid")
})

it("implements the HTTP upload and activation contract with stable retry identities", async () => {
  const calls: { url: string; init: RequestInit }[] = []
  const project = await fixture().project("game_1")
  const transport = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
    calls.push({ url: String(url), init: init! })
    const path = new URL(String(url)).pathname
    if (path.endsWith("/projects/game_1")) return Response.json(project)
    if (path.endsWith("/uploads")) return Response.json({ id: "upload_1" })
    if (init?.method === "PUT") {
      const bytes = init.body as Uint8Array
      return Response.json({
        id: "upload_1",
        sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex")
      })
    }
    return Response.json({ id: "deployment_1", status: "queued", environment: "sandbox" })
  })
  const api = createPlatformApi({ site: "https://spawn.example", accessToken: "fixture-token" }, transport)
  await runCli(["deploy", "--project", "game_1", "--yes", "--json", "--request-id", "contract-1"], root, write, {
    platform: { api }
  })
  expect(calls.map((call) => [new URL(call.url).pathname, call.init.method])).toEqual([
    ["/api/platform/v1/projects/game_1", "GET"],
    ["/api/platform/v1/projects/game_1/uploads", "POST"],
    ["/api/platform/v1/projects/game_1/uploads/upload_1", "PUT"],
    ["/api/platform/v1/projects/game_1/deployments", "POST"]
  ])
  expect(calls[1]!.init.headers).toMatchObject({ "Idempotency-Key": "contract-1-upload" })
  expect(calls[2]!.init.headers).toMatchObject({
    "Content-Type": "application/gzip",
    "X-Content-SHA256": expect.stringMatching(/^[a-f0-9]{64}$/)
  })
  expect(JSON.parse(gunzipSync(calls[2]!.init.body as Uint8Array).toString()).version).toBe(1)
  expect(calls[3]!.init.headers).toMatchObject({ "Idempotency-Key": "contract-1" })
  expect(JSON.parse(calls[3]!.init.body as string)).toEqual({
    uploadId: "upload_1",
    environment: "sandbox",
    expectedReleaseId: "release_s"
  })
  await runCli(["deploy", "--project", "game_1", "--yes", "--json", "--request-id", "contract-1"], root, write, {
    platform: { api }
  })
  expect(calls[5]!.init.headers).toMatchObject({ "Idempotency-Key": "contract-1-upload" })
  expect(calls[5]!.init.body).toBe(calls[1]!.init.body)
  expect(calls[7]!.init.headers).toMatchObject({ "Idempotency-Key": "contract-1" })
  expect(calls[7]!.init.body).toBe(calls[3]!.init.body)
})

it("bounds long upload keys without losing retry stability or distinguishing request IDs", async () => {
  const transport = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ id: "upload_1" }))
  const api = createPlatformApi({ site: "https://spawn.example", accessToken: "fixture-token" }, transport)
  const body = { format: "spawn-source-v1" as const, sha256: "a".repeat(64), sizeBytes: 100 }
  for (const key of ["a".repeat(121), "a".repeat(128), "a".repeat(128), "a".repeat(127) + "b"])
    await api.createUpload("game_1", body, key)
  const keys = transport.mock.calls.map(([, init]) => new Headers(init!.headers).get("Idempotency-Key")!)
  expect(keys.every((key) => /^[A-Za-z0-9_-]{1,128}$/.test(key))).toBe(true)
  expect(keys[0]).toBe("a".repeat(121) + "-upload")
  expect(keys[1]).toBe(keys[2])
  expect(keys[1]).not.toBe(keys[3])
})

it("prints release continuation only when another page exists", async () => {
  const api = fixture()
  await runCli(["releases", "--project", "game_1"], root, write, { platform: { api } })
  expect(output).toContain("Next page: --cursor page-2")
  api.releases.mockResolvedValue({ releases: [] })
  output = ""
  await runCli(["releases", "--project", "game_1", "--cursor", "100"], root, write, { platform: { api } })
  expect(api.releases).toHaveBeenLastCalledWith("game_1", "100")
  expect(output).not.toContain("Next page")
  output = ""
  await runCli(["releases", "--project", "game_1", "--cursor", "100", "--json"], root, write, { platform: { api } })
  expect(JSON.parse(output)).not.toHaveProperty("nextCursor")
})

it("preserves successful deployment URLs in status and activation output", async () => {
  const api = fixture()
  const result = {
    id: "deployment_1",
    status: "succeeded",
    environment: "production" as const,
    releaseId: "release_s",
    url: "https://game.example",
    deploymentUrl: "https://d-1234.game.example"
  }
  api.status.mockResolvedValue(result)
  api.promote.mockResolvedValue(result)
  for (const args of [
    ["status", "deployment_1"],
    ["promote", "release_s", "--yes"]
  ]) {
    output = ""
    await runCli([...args, "--project", "game_1"], root, write, { platform: { api } })
    expect(output).toContain("URL: https://game.example")
    expect(output).toContain("Deployment URL: https://d-1234.game.example")
    output = ""
    await runCli([...args, "--project", "game_1", "--json"], root, write, { platform: { api } })
    expect(JSON.parse(output)).toMatchObject(result)
  }
})

it("uses project-scoped release, status, log, promotion and rollback endpoints", async () => {
  const transport = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({}))
  const api = createPlatformApi({ site: "https://spawn.example", accessToken: "fixture-token" }, transport)
  await api.releases("game_1", "a&b")
  await api.status("game_1", "deployment_1")
  await api.logs("game_1", "deployment_1", "after-3")
  await api.promote(
    "game_1",
    { releaseId: "release_s", environment: "production", expectedReleaseId: "release_p" },
    "promote-1"
  )
  await api.rollback("game_1", { releaseId: "retained", environment: "sandbox", expectedReleaseId: null }, "rollback-1")
  expect(transport.mock.calls.map(([url]) => new URL(String(url)).pathname + new URL(String(url)).search)).toEqual([
    "/api/platform/v1/projects/game_1/releases?cursor=a%26b",
    "/api/platform/v1/projects/game_1/deployments/deployment_1",
    "/api/platform/v1/projects/game_1/deployments/deployment_1/logs?cursor=after-3",
    "/api/platform/v1/projects/game_1/promotions",
    "/api/platform/v1/projects/game_1/rollbacks"
  ])
  expect(transport.mock.calls[3]![1]).toMatchObject({
    method: "POST",
    headers: { "Idempotency-Key": "promote-1" },
    body: JSON.stringify({ releaseId: "release_s", environment: "production", expectedReleaseId: "release_p" })
  })
  expect(transport.mock.calls[4]![1]).toMatchObject({
    method: "POST",
    headers: { "Idempotency-Key": "rollback-1" },
    body: JSON.stringify({ releaseId: "retained", environment: "sandbox", expectedReleaseId: null })
  })
})

it.each([
  [401, "Login expired"],
  [409, "environment changed"],
  [404, "not found"],
  [503, "rejected"]
] as const)("reports HTTP %s without exposing backend details", async (status, expected) => {
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ error: "private-backend-detail" }, { status }))
  const api = createPlatformApi({ site: "https://spawn.example", accessToken: "fixture-token" }, transport)
  await expect(api.project("game_1")).rejects.toThrow(expected)
})

it("distinguishes an exhausted log cursor from a build with no logs yet", async () => {
  const api = fixture()
  api.logs.mockResolvedValue({ entries: [] })
  await runCli(["logs", "deployment_1", "--project", "game_1", "--cursor", "100"], root, write, { platform: { api } })
  expect(output).toContain("No additional logs.")
  expect(output).not.toContain("No logs yet.")
  expect(output).not.toContain("Continue:")
  output = ""
  await runCli(["logs", "deployment_1", "--project", "game_1"], root, write, { platform: { api } })
  expect(output).toContain("No logs yet.")
})
