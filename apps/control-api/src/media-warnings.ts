import { stripVTControlCharacters } from "node:util"

export function mediaWarnings(value: unknown): { kind: "cover" | "trailer"; message: string }[] {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value.slice(0, 2).flatMap((warning: unknown) => {
    if (!warning || typeof warning !== "object" || !("kind" in warning) || !("message" in warning)) return []
    if ((warning.kind !== "cover" && warning.kind !== "trailer") || typeof warning.message !== "string") return []
    const message = stripVTControlCharacters(warning.message)
      // oxlint-disable-next-line no-control-regex -- Remove untrusted control characters before displaying text.
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .trim()
      .slice(0, 512)
    return message ? [{ kind: warning.kind, message }] : []
  })
}
