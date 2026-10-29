import { record, requireValue } from "./http"
import { validateSourcePath } from "./source"

export interface ArtifactFile {
  path: string
  content: string
}
export function parseArtifacts(bytes: Uint8Array): ArtifactFile[] {
  const parsed = record(JSON.parse(new TextDecoder().decode(bytes)))
  requireValue(Array.isArray(parsed.files) && parsed.files.length <= 2000, "Invalid artifact manifest.")
  const paths = new Set<string>()
  let total = 0
  return parsed.files.map((entry) => {
    const file = record(entry)
    requireValue(typeof file.path === "string" && typeof file.content === "string", "Invalid artifact.")
    validateSourcePath(file.path)
    requireValue(!paths.has(file.path.toLowerCase()), "Duplicate artifact path.")
    paths.add(file.path.toLowerCase())
    const content = Buffer.from(file.content, "base64")
    requireValue(content.toString("base64") === file.content, "Invalid artifact encoding.")
    total += content.byteLength
    requireValue(total <= 20 * 1024 * 1024, "Artifact is too large.")
    return { path: file.path, content: file.content }
  })
}
