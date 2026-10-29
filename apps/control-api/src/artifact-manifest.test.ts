import { expect, it, vi } from "vitest"
import { artifactManifestLimit, readArtifactManifest } from "./artifact-manifest"

it.each([artifactManifestLimit + 1, -1, NaN, Infinity, 1.5])(
  "rejects invalid advertised size %s without reading",
  async (size) => {
    const cancel = vi.fn<() => void>()
    const pull = vi.fn<(controller: ReadableStreamDefaultController<Uint8Array>) => void>()
    const content = new ReadableStream<Uint8Array>({ pull, cancel }, { highWaterMark: 0 })
    await expect(readArtifactManifest({ size, content })).rejects.toMatchObject({ status: 413 })
    expect(pull).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledOnce()
  }
)

it("cancels a growing or falsely sized stream as soon as it crosses the limit", async () => {
  const cancel = vi.fn<() => void>()
  let chunks = 0
  const content = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        chunks++
        controller.enqueue(new Uint8Array(1024 * 1024))
      },
      cancel
    },
    { highWaterMark: 0 }
  )
  await expect(readArtifactManifest({ size: 1, content })).rejects.toMatchObject({ status: 413 })
  expect(chunks).toBe(31)
  expect(cancel).toHaveBeenCalledOnce()
  expect(content.locked).toBe(false)
})

it("accepts the exact boundary and preserves bytes", async () => {
  const bytes = new Uint8Array(artifactManifestLimit)
  bytes[bytes.length - 1] = 123
  const content = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes)
      c.close()
    }
  })
  const result = await readArtifactManifest({ size: bytes.length, content })
  expect(result.length).toBe(artifactManifestLimit)
  expect(result.at(-1)).toBe(123)
})
