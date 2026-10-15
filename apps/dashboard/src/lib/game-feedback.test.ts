import { describe, expect, it } from "vitest"
import { emptyFeedback, parseGameFeedback } from "./game-feedback"

describe("local game feedback", () => {
  const valid = { rating: 4, comment: "The controls work well.", updatedAt: "2026-10-14T12:00:00.000Z" }
  it("restores an absent or valid draft without inventing public activity", () => {
    expect(parseGameFeedback(null)).toEqual(emptyFeedback)
    expect(parseGameFeedback(JSON.stringify(valid))).toEqual(valid)
  })
  it("rejects unreadable or invalid data so a saved draft is not silently replaced", () => {
    for (const raw of [
      "broken",
      "null",
      "[]",
      JSON.stringify({ ...valid, rating: 6 }),
      JSON.stringify({ ...valid, rating: 2.5 }),
      JSON.stringify({ ...valid, comment: "x".repeat(2001) }),
      JSON.stringify({ ...valid, updatedAt: "invalid" })
    ])
      expect(parseGameFeedback(raw)).toBeNull()
  })
})
