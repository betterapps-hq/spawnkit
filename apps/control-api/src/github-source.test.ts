import { gzipSync } from "node:zlib"
import { pack } from "tar-stream"
import { afterEach, describe, expect, it, vi } from "vitest"
import { installationToken } from "./github"
import { convertGitHubArchive, githubSource } from "./github-source"
import { decodeSource } from "./source"

vi.mock("./github", () => ({
  installationToken: vi.fn<typeof installationToken>().mockResolvedValue("installation-token")
}))
afterEach(() => vi.unstubAllGlobals())

async function archive(extra: { name: string; type?: "file" | "symlink"; content?: string }[] = []) {
  const tar = pack()
  const chunks: Buffer[] = []
  const finished = (async () => {
    for await (const chunk of tar) chunks.push(Buffer.from(chunk))
  })()
  for (const name of ["package.json", "pnpm-lock.yaml", "game.config.json"])
    tar.entry({ name: `repo-sha/${name}` }, "{}")
  for (const file of extra)
    tar.entry(
      {
        name: `repo-sha/${file.name}`,
        type: file.type ?? "file",
        ...(file.type === "symlink" ? { linkname: "../../secret" } : {})
      },
      file.content ?? ""
    )
  tar.finalize()
  await finished
  return gzipSync(Buffer.concat(chunks))
}

describe("GitHub source boundary", () => {
  it("rejects a second archive redirect and never forwards installation credentials to codeload", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "https://codeload.github.com/studio/game/tar.gz/sha" } })
      )
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://unexpected.test" } }))
    vi.stubGlobal("fetch", fetch)
    await expect(
      githubSource({} as Env, { installation_id: 7, repository_id: 9, repository: "studio/game" }, "a".repeat(40))
    ).rejects.toThrow("GitHub source download failed")
    expect(installationToken).toHaveBeenCalledWith({}, 7, 9)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      redirect: "manual",
      headers: { authorization: "Bearer installation-token" }
    })
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ redirect: "manual" })
    expect(fetch.mock.calls[1]?.[1]?.headers).toBeUndefined()
  })
  it("converts a generated repository archive and omits generator metadata and environment files", async () => {
    const result = await convertGitHubArchive(
      await archive([
        { name: ".env.example", content: "TOKEN=" },
        { name: ".npmrc", content: "engine-strict=true\n//registry.npmjs.org/:_authToken=local-only" },
        { name: ".spawn/state.json", content: '{"version":1,"files":{}}' },
        { name: ".spawn/project.json", content: '{"projectId":"private-local-link"}' },
        { name: "src/main.ts", content: "export {}" }
      ])
    )
    expect(decodeSource(result.bytes, result.sha256).map((file) => file.path)).toEqual([
      "game.config.json",
      "package.json",
      "pnpm-lock.yaml",
      "src/main.ts"
    ])
  })
  it("rejects links instead of following them", async () => {
    await expect(convertGitHubArchive(await archive([{ name: "link", type: "symlink" }]))).rejects.toThrow("links")
  })
  it("rejects traversal paths and committed credentials", async () => {
    await expect(convertGitHubArchive(await archive([{ name: "../secret" }]))).rejects.toThrow("Unsafe")
    await expect(
      convertGitHubArchive(await archive([{ name: "src/key.ts", content: "sk_live_12345678901234567890" }]))
    ).rejects.toThrow("credential")
  })
})
