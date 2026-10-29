export type AdminNotification = {
  id: string
  kind: "escalation" | "assignment" | "activity" | "digest" | "deployment" | "comment"
  title: string
  game: string
  cover: string
  caseId: string
  description: string
  actor: string
  time: string
  group: "Today" | "Yesterday"
  unread: boolean
  archived: boolean
  reason: string
  state: string
  assignee: string
  reportCount: number
  story: string
}

export const notificationSeeds: AdminNotification[] = [
  {
    id: "n1",
    kind: "escalation",
    title: "Escalated for your review",
    game: "Starfall Squadron",
    cover: "/examples/space-shooter.webp",
    caseId: "RPT-1041",
    description: "Jamie Chen escalated a report about an external download link.",
    actor: "Jamie Chen",
    time: "4 min ago",
    group: "Today",
    unread: true,
    archived: false,
    reason: "Unsafe links or downloads",
    state: "Escalated",
    assignee: "Unassigned",
    reportCount: 2,
    story: "escalated"
  },
  {
    id: "n2",
    kind: "assignment",
    title: "A report is assigned to you",
    game: "Orchard Snake",
    cover: "/examples/snake.webp",
    caseId: "RPT-1038",
    description: "Alex Morgan assigned you a report about the game description.",
    actor: "Alex Morgan",
    time: "22 min ago",
    group: "Today",
    unread: true,
    archived: false,
    reason: "Misleading listing",
    state: "In review",
    assignee: "You",
    reportCount: 1,
    story: "assigned-to-you"
  },
  {
    id: "n3",
    kind: "activity",
    title: "New evidence on a report",
    game: "Prism Break",
    cover: "/examples/breakout.webp",
    caseId: "RPT-1039",
    description: "The reported comment was edited after the report was filed.",
    actor: "System",
    time: "48 min ago",
    group: "Today",
    unread: true,
    archived: false,
    reason: "Harassment or hate",
    state: "In review",
    assignee: "Alex Morgan",
    reportCount: 1,
    story: "edited-comment"
  },
  {
    id: "n4",
    kind: "digest",
    title: "3 reports need an assignee",
    game: "Community reports",
    cover: "",
    caseId: "",
    description: "Your daily summary of unassigned reports.",
    actor: "System",
    time: "9:00 AM",
    group: "Today",
    unread: false,
    archived: false,
    reason: "",
    state: "",
    assignee: "",
    reportCount: 3,
    story: "inbox"
  },
  {
    id: "n5",
    kind: "activity",
    title: "A report was resolved",
    game: "Prism Break",
    cover: "/examples/breakout.webp",
    caseId: "RPT-1036",
    description: "Alex Morgan reviewed the comment and found no violation.",
    actor: "Alex Morgan",
    time: "4:32 PM",
    group: "Yesterday",
    unread: false,
    archived: false,
    reason: "Spam or advertising",
    state: "Resolved",
    assignee: "Alex Morgan",
    reportCount: 1,
    story: "inbox"
  },
  {
    id: "n6",
    kind: "assignment",
    title: "A report was reassigned",
    game: "Orchard Snake",
    cover: "/examples/snake.webp",
    caseId: "RPT-1042",
    description: "Jamie Chen took over the comment report.",
    actor: "Jamie Chen",
    time: "11:15 AM",
    group: "Yesterday",
    unread: false,
    archived: true,
    reason: "Spam or advertising",
    state: "In review",
    assignee: "Jamie Chen",
    reportCount: 3,
    story: "investigation"
  }
]

export const notificationWorkflows = [
  { id: "deployment", title: "Deployments", description: "Build results and preview environments.", email: "off" },
  { id: "comment", title: "Comments", description: "New comments on your games.", email: "off" },
  { id: "assignment", title: "Assigned to you", description: "Reports you need to review.", email: "immediate" },
  { id: "escalation", title: "Escalations", description: "Reports that need an admin decision.", email: "immediate" },
  { id: "activity", title: "Report updates", description: "New evidence and decisions on your reports.", email: "off" },
  { id: "digest", title: "Unassigned reports", description: "A daily summary of the open queue.", email: "daily" }
] as const

export const creatorNotificationSeeds: AdminNotification[] = [
  {
    id: "c1",
    kind: "deployment",
    title: "Your game is live",
    game: "Orchard Snake",
    cover: "/examples/snake.webp",
    caseId: "",
    description: "Version 8 deployed successfully to production.",
    actor: "SpawnKit",
    time: "4 min ago",
    group: "Today",
    unread: true,
    archived: false,
    reason: "",
    state: "",
    assignee: "",
    reportCount: 0,
    story: ""
  },
  {
    id: "c2",
    kind: "comment",
    title: "A new comment on your game",
    game: "Prism Break",
    cover: "/examples/breakout.webp",
    caseId: "",
    description: "pixelpilot: The multiball rounds are so satisfying. Just beat my high score!",
    actor: "pixelpilot",
    time: "22 min ago",
    group: "Today",
    unread: true,
    archived: false,
    reason: "",
    state: "",
    assignee: "",
    reportCount: 0,
    story: ""
  },
  {
    id: "c3",
    kind: "deployment",
    title: "Preview environment is ready",
    game: "Starfall Squadron",
    cover: "/examples/space-shooter.webp",
    caseId: "",
    description: "The preview for your boss-battle update is ready to play.",
    actor: "SpawnKit",
    time: "48 min ago",
    group: "Today",
    unread: false,
    archived: false,
    reason: "",
    state: "",
    assignee: "",
    reportCount: 0,
    story: ""
  },
  {
    id: "c4",
    kind: "deployment",
    title: "Your game is live",
    game: "Prism Break",
    cover: "/examples/breakout.webp",
    caseId: "",
    description: "Version 3 deployed successfully to production.",
    actor: "SpawnKit",
    time: "4:32 PM",
    group: "Yesterday",
    unread: false,
    archived: false,
    reason: "",
    state: "",
    assignee: "",
    reportCount: 0,
    story: ""
  }
]
