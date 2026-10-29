export type ModerationState = "normal" | "hidden" | "restricted"
export type ManagedGameStatus = "Published" | "Unlisted" | "Hidden" | "Restricted" | "Unavailable"
export interface ManagedGame {
  id: string
  title: string
  creatorId: string
  description: string
  genre: string | null
  dimension: string | null
  coverUrl: string | null
  url: string | null
  status: ManagedGameStatus
  state: ModerationState
  revision: number
  views: number
  comments: number
  updatedAt: string
}
export interface ManagedComment {
  id: string
  projectId: string
  gameTitle: string
  author: string
  body: string
  hidden: number
  revision: number
  createdAt: string
  updatedAt: string
}
export const moderationActions = {
  "hide-game": "Hide from discovery",
  "restrict-game": "Restrict game access",
  "restore-game": "Restore game",
  "hide-comment": "Hide comment",
  "restore-comment": "Restore comment"
} as const
export type ModerationAction = keyof typeof moderationActions
export const moderationEventActions = {
  ...moderationActions,
  "game.approved": "Approve submission",
  "game.rejected": "Reject submission",
  "game.unpublished": "Unpublish submission",
  "game.superseded": "Replace approved release"
} as const
export const moderationReasons = [
  "Misleading listing",
  "Unsafe content",
  "Spam or advertising",
  "Harassment",
  "Issue resolved",
  "No violation found",
  "Other policy concern"
] as const
export interface ModerationDecision {
  requestId: string
  action: ModerationAction
  projectId: string
  commentId?: string
  revision: number
  reason: string
  note: string
}
export interface ModerationEvent {
  id: string
  actorId: string
  actorName: string
  projectId: string
  gameTitle: string
  commentId: string | null
  action: keyof typeof moderationEventActions
  reason: string
  note: string
  beforeState: string
  afterState: string
  createdAt: string
}
export interface ModerationPage<T> {
  items: T[]
  nextCursor: string | null
}
export interface ModerationSummary {
  games: number
  published: number
  hidden: number
  restricted: number
  comments: number
  hiddenComments: number
}
