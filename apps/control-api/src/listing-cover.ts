import { createHash } from "node:crypto"
import { MAX_COVER_BYTES, safeCoverBytes } from "../cover-policy.mjs"

/** Recheck actual stored bytes, independently of creator metadata and the build output. */
export async function listingCover(bucket: R2Bucket, prefix: string, value: unknown) {
  if (typeof value !== "string" || !/^spawnkit-cover-[a-f0-9]{20}\.webp$/.test(value)) return null
  const object = await bucket.get(`${prefix}${value}`)
  if (!object) return null
  if (!object.size || object.size > MAX_COVER_BYTES) {
    await object.body.cancel()
    return null
  }
  const bytes = new Uint8Array(await object.arrayBuffer())
  if (bytes.byteLength !== object.size || !safeCoverBytes(bytes)) return null
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 20)
  return value === `spawnkit-cover-${hash}.webp` ? value : null
}
