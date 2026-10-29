export interface FeedbackTotals {
  rating: number
  reviews: number
  comments: number
}
interface GameComment {
  id: string
  author: string
  body: string
  createdAt: string
  updatedAt: string
  rating: number
}
export interface PublicFeedback {
  totals: FeedbackTotals
  comments: GameComment[]
  nextCursor: string | null
}
export interface PersonalFeedback {
  rating: number
  comment: GameComment | null
  admin: boolean
}
export async function feedbackRequest<T>(projectId: string, path: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(`/api/platform/v1/games/${encodeURIComponent(projectId)}/${path}`, {
    method,
    headers: data === undefined ? {} : { "content-type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) })
  })
  if (response.status === 401 && path === "feedback/me") return null as T
  const result = (await response.json()) as { error?: { message?: string } }
  if (!response.ok) throw new Error(result.error?.message ?? "Feedback could not be saved. Please try again.")
  return result as T
}
