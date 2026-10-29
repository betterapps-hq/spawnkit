import { createHash } from "node:crypto"
import sharp from "sharp"
import { beforeEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  sandbox: vi.fn<(...args: unknown[]) => unknown>(),
  output: vi.fn<typeof import("./build-output").streamBuildOutput>()
}))
vi.mock("@cloudflare/sandbox", () => ({ getSandbox: mocks.sandbox }))
vi.mock("./build-output", () => ({ streamBuildOutput: mocks.output }))
import { mediaInputs, processListingMedia } from "./build-media"
const file = (path: string, value: string | Buffer) => ({ path, content: Buffer.from(value).toString("base64") })
beforeEach(() => {
  vi.resetAllMocks()
  mocks.output.mockResolvedValue({ code: 0, timedOut: false })
})
it("rejects duplicate configurations", () => {
  const config = file("spawnkit.config.json", "{}")
  expect(() => mediaInputs([config, config])).toThrow("Multiple game configurations")
})
it("copies only bounded selected media and the manifest into the trusted job", () => {
  const result = mediaInputs([
    file("index.html", "game"),
    file("package.json", "malicious scripts"),
    file("worker.js", "malicious code"),
    file("spawnkit.config.json", JSON.stringify({ coverPath: "media/a.png", trailerPath: "media/b.mp4" })),
    file("media/a.png", Buffer.alloc(1024 * 1024 + 1)),
    file("media/b.mp4", Buffer.alloc(2 * 1024 * 1024 + 1))
  ])
  expect(result.files.map((f) => f.path)).toEqual(["spawnkit.config.json"])
  expect(result.listing).toMatchObject({ coverPath: null, trailerPath: null })
  expect(result.warnings.map((w) => w.kind)).toEqual(["cover", "trailer"])
})
it("rejects forged derivatives and preserves trusted metadata when merging isolated results", async () => {
  const png = await sharp({ create: { width: 12, height: 12, channels: 3, background: "red" } })
    .png({ compressionLevel: 0 })
    .toBuffer()
  const optimizedPng = await sharp(png).png({ compressionLevel: 9 }).toBuffer()
  const webp = await sharp(png).webp().toBuffer()
  const path = `spawnkit-cover-${createHash("sha256").update(webp).digest("hex").slice(0, 20)}.webp`
  const input = [
    file("index.html", "game"),
    file("evil.js", "creator code"),
    file(
      "spawnkit.config.json",
      JSON.stringify({ title: "Original title", coverPath: "cover.png", trailerPath: null })
    ),
    file("cover.png", png),
    file("art/tile.png", png),
    file("spawnkit-cover-forged.webp", "forged")
  ]
  const result = {
    files: [
      file(
        "spawnkit.config.json",
        JSON.stringify({ title: "Ignored result title", coverPath: path, trailerPath: null })
      ),
      file(path, webp),
      file("art/tile.png", optimizedPng)
    ],
    mediaWarnings: []
  }
  const sandbox = {
    destroy: vi.fn<() => Promise<void>>(async () => {}),
    setOutboundHandler: vi.fn<(handler: string) => Promise<void>>(async () => {}),
    writeFile: vi.fn<(path: string, data: string) => Promise<void>>(async () => {}),
    exec: vi.fn<(...args: unknown[]) => Promise<object>>(async () => ({})),
    readFile: vi.fn<() => Promise<{ size: number; content: ReadableStream<Uint8Array> }>>(async () => {
      const bytes = Buffer.from(JSON.stringify(result))
      return {
        size: bytes.length,
        content: new ReadableStream({
          start(c) {
            c.enqueue(bytes)
            c.close()
          }
        })
      }
    })
  }
  mocks.sandbox.mockReturnValue(sandbox)
  const processed = await processListingMedia({ SANDBOX: {} } as Env, "job", input, async () => {})
  expect(mocks.sandbox).toHaveBeenCalledWith({}, "media-job")
  expect(sandbox.setOutboundHandler).toHaveBeenCalledWith("blocked")
  const mediaInput = JSON.parse(String(sandbox.writeFile.mock.calls[0]?.[1])) as { files: { path: string }[] }
  expect(mediaInput.files.map((f) => f.path)).toEqual(["spawnkit.config.json", "cover.png", "art/tile.png"])
  expect(processed.files.find((f) => f.path === "art/tile.png")?.content).toBe(optimizedPng.toString("base64"))
  expect(sandbox.exec).toHaveBeenCalledWith(["node", "/opt/spawn/media-runner.mjs"], { timeout: 100_000 })
  expect(sandbox.destroy).toHaveBeenCalledTimes(2)
  expect(processed.files.map((f) => f.path)).not.toContain("spawnkit-cover-forged.webp")
  expect(
    JSON.parse(
      Buffer.from(processed.files.find((f) => f.path === "spawnkit.config.json")!.content, "base64").toString()
    )
  ).toEqual({ title: "Original title", coverPath: path, trailerPath: null })
  result.files[1] = file(path, "forged output")
  await expect(processListingMedia({ SANDBOX: {} } as Env, "job", input, async () => {})).rejects.toThrow(
    "Invalid processed media"
  )
  result.files[1] = file(path, webp)
  result.files[2] = file("art/tile.png", "forged PNG replacement")
  await expect(processListingMedia({ SANDBOX: {} } as Env, "job", input, async () => {})).rejects.toThrow(
    "Invalid optimized game image"
  )
})
it("bounds automatic game-image candidates without copying scripts or oversized images", () => {
  const files = Array.from({ length: 10 }, (_, index) => file(`art/${index}.png`, "candidate"))
  const result = mediaInputs([...files, file("large.png", Buffer.alloc(4 * 1024 * 1024 + 1)), file("run.js", "script")])
  expect(result.gameImagePaths).toHaveLength(8)
  expect(result.files.some((f) => f.path === "large.png" || f.path === "run.js")).toBe(false)
})
