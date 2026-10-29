import { gunzipSync } from "node:zlib"
import { afterEach, expect, it, vi } from "vitest"
import { communityFixture } from "./community-fixture"
import { updateListingMedia } from "./project-listing-media"
vi.mock("./deployments", () => ({
  deploymentRoute: vi.fn<() => Promise<Response>>(async () => Response.json({ id: "queued-update" }))
}))
const opened: ReturnType<typeof communityFixture>[] = []
afterEach(() => {
  for (const f of opened.splice(0)) f.db.close()
  vi.clearAllMocks()
})
function fixture() {
  const f = communityFixture()
  opened.push(f)
  const files = new Map<string, Uint8Array>([["releases/p/r/index.html", Buffer.from("<h1>Existing game</h1>")]])
  f.env.ARTIFACTS = {
    list: async () => ({
      objects: [...files]
        .filter(([key]) => key.startsWith("releases/"))
        .map(([key, value]) => ({ key, size: value.length })),
      truncated: false
    }),
    get: async (key: string) => (files.has(key) ? { arrayBuffer: async () => files.get(key)! } : null),
    put: async (key: string, value: Uint8Array) => {
      files.set(key, value)
    }
  } as unknown as R2Bucket
  return { ...f, files }
}
const body = () => ({
  key: "edit",
  revision: 0,
  releaseId: "r",
  listing: {
    schemaVersion: 1,
    title: "Game",
    description: "Updated description.",
    genre: "Arcade",
    dimension: "2D",
    coverPath: "cover.webp"
  },
  cover: { extension: "png", content: Buffer.from("image").toString("base64") }
})
const request = (value = body()) =>
  new Request("https://api.test/projects/p/listing/media", { method: "POST", body: JSON.stringify(value) })
it("only lets the project owner replace media", async () => {
  const f = fixture()
  await expect(updateListingMedia(request(), f.env, "stranger", "p")).rejects.toMatchObject({ status: 404 })
  expect(f.files.size).toBe(1)
})
it("rejects stale releases and oversized or unsupported media before writing", async () => {
  const f = fixture()
  await expect(
    updateListingMedia(request({ ...body(), releaseId: "other" }), f.env, "creator", "p")
  ).rejects.toMatchObject({ status: 409 })
  await expect(
    updateListingMedia(request({ ...body(), cover: { extension: "html", content: "YQ==" } }), f.env, "creator", "p")
  ).rejects.toThrow("Unsupported")
  await expect(
    updateListingMedia(
      request({ ...body(), cover: { extension: "png", content: Buffer.alloc(1024 * 1024 + 1).toString("base64") } }),
      f.env,
      "creator",
      "p"
    )
  ).rejects.toThrow("size limit")
  expect(f.files.size).toBe(1)
})
it("queues a validated copy of the owned game and leaves the live release unchanged", async () => {
  const f = fixture()
  const response = await updateListingMedia(request(), f.env, "creator", "p")
  expect(await response.json()).toEqual({ id: "queued-update" })
  const source = [...f.files].find(([key]) => key.startsWith("sources/p/"))![1]
  const packed = JSON.parse(gunzipSync(source).toString())
  expect(packed.files.some((file: { path: string }) => file.path === "game/index.html")).toBe(true)
  expect(packed.files.some((file: { path: string }) => file.path === "listing-update.json")).toBe(true)
  expect(f.db.prepare("SELECT current_release_id FROM environments WHERE project_id='p'").get()).toMatchObject({
    current_release_id: "r"
  })
})

it("removes a preview through the same release pipeline while retaining the cover", async () => {
  const f = fixture()
  f.files.set(
    "releases/p/r/spawnkit.config.json",
    Buffer.from(JSON.stringify({ coverPath: "cover.webp", trailerPath: "preview.mp4" }))
  )
  const { cover: _cover, ...values } = body()
  await updateListingMedia(
    new Request("https://api.test/projects/p/listing/media", {
      method: "POST",
      body: JSON.stringify({ ...values, removeTrailer: true })
    }),
    f.env,
    "creator",
    "p"
  )
  const source = [...f.files].find(([key]) => key.startsWith("sources/p/"))![1]
  const packed = JSON.parse(gunzipSync(source).toString())
  const config = packed.files.find((file: { path: string }) => file.path === "game/spawnkit.config.json")
  expect(JSON.parse(Buffer.from(config.content, "base64").toString())).toMatchObject({
    coverPath: "cover.webp",
    trailerPath: null
  })
})
