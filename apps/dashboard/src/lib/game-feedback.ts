export type GameFeedback = { rating: number; comment: string; updatedAt: string }
export const emptyFeedback: GameFeedback = { rating: 0, comment: "", updatedAt: "" }
export function parseGameFeedback(raw: string | null): GameFeedback | null {
  if (raw === null) return emptyFeedback
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== "object") return null
    const record = value as Record<string, unknown>
    if (
      !Number.isInteger(record.rating) ||
      (record.rating as number) < 0 ||
      (record.rating as number) > 5 ||
      typeof record.comment !== "string" ||
      record.comment.length > 2000 ||
      typeof record.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(record.updatedAt))
    )
      return null
    return { rating: record.rating as number, comment: record.comment, updatedAt: record.updatedAt }
  } catch {
    return null
  }
}
