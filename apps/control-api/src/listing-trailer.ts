import { createHash } from "node:crypto"
import { MAX_TRAILER_BYTES, safeTrailerBytes } from "../trailer-policy.mjs"

export async function listingTrailer(bucket: R2Bucket, prefix: string, value: unknown) {
  if (typeof value !== "string" || !/^spawnkit-trailer-[a-f0-9]{20}\.mp4$/.test(value)) return null
  const object = await bucket.get(`${prefix}${value}`)
  if (!object) return null
  if (!object.size || object.size > MAX_TRAILER_BYTES) {
    await object.body.cancel()
    return null
  }
  const bytes = new Uint8Array(await object.arrayBuffer())
  if (bytes.byteLength !== object.size || !safeTrailerBytes(bytes)) return null
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 20)
  return value === `spawnkit-trailer-${hash}.mp4` ? value : null
}
