import { createHash } from "node:crypto"
import { gzipSync } from "node:zlib"
import { describe, expect, it } from "vitest"
import { HttpError } from "./http"
import { decodeSource, validateSourcePath } from "./source"

function archive(extra: { path: string; content: string }[] = []) {
  const files = ["game.config.json", "package.json", "pnpm-lock.yaml"].map((path) => ({
    path,
    content: Buffer.from("{}").toString("base64")
  }))
  const bytes = gzipSync(JSON.stringify({ version: 1, files: [...files, ...extra] }))
  return { bytes, digest: createHash("sha256").update(bytes).digest("hex") }
}
describe("source upload boundary", () => {
  it("accepts a complete source archive", () => {
    const { bytes, digest } = archive()
    expect(decodeSource(bytes, digest)).toHaveLength(3)
  })
  it.each([
    "../secret",
    "/root",
    "C:/root",
    "src\\file",
    "foo/../bar",
    "foo//bar",
    "CON.txt",
    ".env",
    ".env.example",
    ".git/config",
    "node_modules/pkg/index.js",
    "key.pem",
    "x:stream",
    "dir./file"
  ])("rejects unsafe path %s", (path) => {
    expect(() => validateSourcePath(path)).toThrow(HttpError)
  })
  it("rejects corrupted source", () => {
    const { bytes } = archive()
    expect(() => decodeSource(bytes, "0".repeat(64))).toThrow("digest")
  })
  it("rejects duplicate and directory-colliding files", () => {
    for (const extra of [
      [{ path: "Package.json", content: "" }],
      [
        { path: "src", content: "" },
        { path: "src/index.ts", content: "" }
      ]
    ]) {
      const { bytes, digest } = archive(extra)
      expect(() => decodeSource(bytes, digest)).toThrow(HttpError)
    }
  })
  it("rejects private keys in ordinary source files", () => {
    const { bytes, digest } = archive([
      { path: "src/config.ts", content: Buffer.from("-----BEGIN PRIVATE KEY-----").toString("base64") }
    ])
    expect(() => decodeSource(bytes, digest)).toThrow("credential")
  })
})
