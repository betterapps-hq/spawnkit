import { expect, it } from "vitest"
import worker from "./index"
it("streams video byte ranges, suffixes and seeking without poisoning the full-object cache", async () => {
  const get = async (_key: string, options?: { range: { offset: number; length: number } }) => ({
    body: options
      ? "abcdefghij".slice(options.range.offset, options.range.offset + options.range.length)
      : "abcdefghij",
    size: 10,
    httpEtag: '"video"'
  })
  const env = {
    DATABASE: {
      prepare: () => ({
        bind: () => ({ first: async () => ({ project_id: "p", current_release_id: "v1", immutable: 1 }) })
      })
    },
    ARTIFACTS: { get, head: async () => ({ size: 10, httpEtag: '"video"' }) }
  } as unknown as Env
  const url = "https://game.spawnkit.games/media/clip.mp4"
  for (const [range, content, header] of [
    ["bytes=2-5", "cdef", "bytes 2-5/10"],
    ["bytes=-3", "hij", "bytes 7-9/10"],
    ["bytes=8-", "ij", "bytes 8-9/10"]
  ] as const) {
    const response = await worker.fetch(new Request(url, { headers: { range } }), env)
    expect(response.status).toBe(206)
    expect(await response.text()).toBe(content)
    expect(response.headers.get("content-range")).toBe(header)
    expect(response.headers.get("content-type")).toBe("video/mp4")
    expect(response.headers.get("cache-control")).toContain("no-transform")
  }
  for (const range of ["bytes=20-30", "bytes=8-2", "bytes=-0", "bytes=-", "bytes=0-2,4-6"]) {
    const response = await worker.fetch(new Request(url, { headers: { range } }), env)
    expect(response.status).toBe(416)
    expect(response.headers.get("content-range")).toBe("bytes */10")
  }
  const full = await worker.fetch(new Request(url, { headers: { range: "bytes=0-2", "if-range": '"old"' } }), env)
  expect(full.status).toBe(200)
  expect(await full.text()).toBe("abcdefghij")
  const conditional = await worker.fetch(
    new Request(url, { headers: { range: "bytes=0-2", "if-none-match": '"video"' } }),
    env
  )
  expect(conditional.status).toBe(304)
})
