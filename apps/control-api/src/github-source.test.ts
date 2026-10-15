import { gzipSync } from "node:zlib"
import { pack } from "tar-stream"
import { describe, expect, it } from "vitest"
import { convertGitHubArchive } from "./github-source"
import { decodeSource } from "./source"

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
  it("converts a pinned repository archive and omits environment files", async () => {
    const result = await convertGitHubArchive(
      await archive([
        { name: ".env.example", content: "TOKEN=" },
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
