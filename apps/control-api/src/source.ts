import { createHash } from "node:crypto"
import { gunzipSync } from "node:zlib"
import { HttpError, record, requireValue } from "./http"

export const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const blockedDirectories = new Set([
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  ".spawn",
  ".ssh",
  ".aws",
  ".wrangler",
  ".cloudflare",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "logs"
])

export function validateSourcePath(path: string) {
  const parts = path.split("/")
  requireValue(
    path.length > 0 &&
      path.length <= 512 &&
      !/[\\:]/.test(path) &&
      !Array.from(path).some((character) => character.charCodeAt(0) < 32),
    "Unsafe source path."
  )
  requireValue(
    parts.every((part) => part !== "" && part !== "." && part !== ".." && !/[. ]$/.test(part)),
    "Unsafe source path."
  )
  requireValue(
    parts.every(
      (part) =>
        !blockedDirectories.has(part.toLowerCase()) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
    ),
    "Excluded source path."
  )
  const name = parts.at(-1)!.toLowerCase()
  requireValue(
    !name.startsWith(".env") &&
      !/\.(pem|key|p12|pfx|log)$/.test(name) &&
      !/^(credentials|id_rsa|id_ed25519|\.npmrc|\.netrc)/.test(name),
    "Sensitive files cannot be uploaded."
  )
}

export function decodeSource(bytes: Uint8Array, digest: string) {
  requireValue(
    bytes.length <= MAX_SOURCE_BYTES && createHash("sha256").update(bytes).digest("hex") === digest,
    "Source digest or size mismatch."
  )
  let document: Record<string, unknown>
  try {
    document = record(JSON.parse(gunzipSync(bytes, { maxOutputLength: 30 * 1024 * 1024 }).toString("utf8")))
  } catch {
    throw new HttpError(400, "invalid_archive", "Invalid or oversized source archive.")
  }
  requireValue(
    document.version === 1 && Array.isArray(document.files) && document.files.length <= 2000,
    "Invalid source archive."
  )
  const paths = new Set<string>()
  let total = 0
  const files = document.files.map((entry: unknown) => {
    const file = record(entry)
    requireValue(typeof file.path === "string" && typeof file.content === "string", "Invalid source file.")
    validateSourcePath(file.path)
    const key = file.path.toLowerCase()
    requireValue(!paths.has(key), "Duplicate source path.")
    paths.add(key)
    const content = Buffer.from(file.content, "base64")
    requireValue(content.toString("base64") === file.content, "Invalid source encoding.")
    total += content.length
    requireValue(total <= MAX_SOURCE_BYTES, "Expanded source is too large.")
    requireValue(
      !/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk_live_|sk_test_|ghp_|github_pat_)[A-Za-z0-9_]{16,}/.test(
        content.toString("utf8")
      ),
      "Source contains a credential. Remove it before uploading."
    )
    return { path: file.path, content }
  })
  for (const path of ["game.config.json", "package.json", "pnpm-lock.yaml"])
    requireValue(paths.has(path), `Source must include ${path}.`)
  // Reject a file used as a directory, including case-folded aliases.
  for (const path of paths) {
    const parts = path.split("/")
    while (parts.length > 1) {
      parts.pop()
      requireValue(!paths.has(parts.join("/")), "Conflicting source paths.")
    }
  }
  return files
}
