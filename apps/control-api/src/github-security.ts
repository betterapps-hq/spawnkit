import { createHmac, timingSafeEqual } from "node:crypto"
import { requireValue } from "./http"

export function validWebhookSignature(body: Uint8Array, signature: string | null, secret: string) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false
  const received = Buffer.from(signature.slice(7), "hex")
  const expected = createHmac("sha256", secret).update(body).digest()
  return timingSafeEqual(received, expected)
}

export function githubRepository(value: unknown) {
  requireValue(typeof value === "string", "Choose a GitHub repository.")
  const match = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(value)
  requireValue(
    match && match[1] !== "." && match[2] !== "." && match[1] !== ".." && match[2] !== "..",
    "Enter a GitHub repository URL."
  )
  return `${match[1]}/${match[2]}`
}
