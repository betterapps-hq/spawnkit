export const communityRoles = ["Admin", "Moderator", "Observer"] as const
export type CommunityRole = (typeof communityRoles)[number]
export interface CommunityAccess {
  admin: boolean
  role: CommunityRole | null
  userId: string
}
export interface TeamMember {
  userId: string
  name: string
  email: string
  role: CommunityRole
  revision: number
  createdAt: string
  cases: number
}
export interface TeamInvitation {
  id: string
  email: string
  role: CommunityRole
  state: "pending" | "accepted" | "cancelled"
  revision: number
  createdAt: string
  expiresAt: string
  emailState: "pending" | "sent" | "failed"
}
export interface TeamEvent {
  id: string
  actorName: string
  targetName: string
  action: string
  reason: string
  beforeState: string
  afterState: string
  createdAt: string
}
export interface TeamData {
  members: TeamMember[]
  invitations: TeamInvitation[]
  role: CommunityRole
  userId: string
}
export const reportReasons = {
  Game: ["Unsafe content or links", "Misleading listing", "Spam or advertising", "Something else"],
  Comment: ["Spam or advertising", "Harassment or hate", "Personal information", "Something else"]
} as const
export type ReportKind = keyof typeof reportReasons
export const reportActions = [
  "claim",
  "takeover",
  "handoff",
  "note",
  "resolve",
  "hide-game",
  "hide-comment",
  "restrict-game",
  "escalate",
  "reopen"
] as const
export type ReportAction = (typeof reportActions)[number]
export interface ReportCase {
  id: string
  projectId: string
  commentId: string | null
  title: string
  kind: ReportKind
  state: "open" | "escalated" | "resolved"
  assigneeId: string | null
  assigneeName: string | null
  revision: number
  createdAt: string
  updatedAt: string
  reports: number
  reason: string
}
export interface ReportEvidence {
  title: string
  description?: string
  author?: string
  body?: string
  revision: number
  releaseId?: string
  updatedAt?: string
}
export interface ReportItem {
  id: string
  reason: string
  details: string
  snapshot: ReportEvidence
  createdAt: string
}
export interface ReportEvent {
  id: string
  actorName: string
  action: ReportAction
  reason: string
  note: string
  createdAt: string
}
export interface ReportDetail extends ReportCase {
  evidence: ReportItem[]
  events: ReportEvent[]
  evidenceCursor: string | null
  historyCursor: string | null
  current: ReportEvidence | null
  contentVersion: string
  url: string | null
}
export interface ReportCommand {
  requestId: string
  revision: number
  action: ReportAction
  reason: string
  note: string
  contentVersion?: string
}
export interface GameListingSettings {
  details?: Record<string, string | boolean>
  projectId: string
  title: string
  description: string
  genre: string | null
  dimension: string | null
  revision: number
  overridden: boolean
  coverUrl: string | null
  trailerUrl: string | null
  releaseId: string | null
  warnings: { kind: "cover" | "trailer"; message: string }[]
}
