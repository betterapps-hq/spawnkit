// Fictional records for Storybook only. No network requests or persisted decisions.
export type SafetyRole = "Admin" | "Moderator" | "Observer"
type CaseState = "New" | "In review" | "Escalated" | "Resolved"
export type SafetyCase = {
  id: string
  game: string
  cover: string
  kind: "Game" | "Comment"
  reason: string
  priority: "High" | "Normal"
  state: CaseState
  assignee: string | null
  age: string
  reports: { id: string; time: string; detail: string }[]
  author: string
  content: string
  current?: string
  outcome?: string
}
export const caseSeeds: SafetyCase[] = [
  {
    id: "RPT-1042",
    game: "Orchard Snake",
    cover: "/examples/snake.webp",
    kind: "Comment",
    reason: "Spam or advertising",
    priority: "Normal",
    state: "New",
    assignee: null,
    age: "4m",
    author: "pixelpilot",
    content: "Free coins on my profile! Sign up at bonus.example to claim your reward before it expires.",
    reports: [
      { id: "01", time: "10:24 AM", detail: "This is advertising a rewards site. It has nothing to do with the game." },
      { id: "02", time: "10:21 AM", detail: "The same comment appeared on another game." },
      { id: "03", time: "10:18 AM", detail: "It asks people to sign up somewhere else for coins." }
    ]
  },
  {
    id: "RPT-1041",
    game: "Starfall Squadron",
    cover: "/examples/space-shooter.webp",
    kind: "Game",
    reason: "Unsafe links or downloads",
    priority: "High",
    state: "Escalated",
    assignee: null,
    age: "18m",
    author: "Orbit Works",
    content:
      "A player reports that the rewards screen directs them to an unrelated download. This claim has not been verified.",
    reports: [
      { id: "04", time: "10:10 AM", detail: "After finishing a wave, a reward asked me to download an installer." },
      { id: "05", time: "10:06 AM", detail: "The reward link does not look like part of this game." }
    ]
  },
  {
    id: "RPT-1039",
    game: "Prism Break",
    cover: "/examples/breakout.webp",
    kind: "Comment",
    reason: "Harassment or hate",
    priority: "Normal",
    state: "In review",
    assignee: "Alex Morgan",
    age: "42m",
    author: "neonfox",
    content: "Stop posting here. Nobody wants your feedback.",
    current: "I disagree with the difficulty feedback. The second level felt balanced to me.",
    reports: [
      { id: "06", time: "9:46 AM", detail: "This reply is targeting another player rather than discussing the game." }
    ]
  },
  {
    id: "RPT-1038",
    game: "Orchard Snake",
    cover: "/examples/snake.webp",
    kind: "Game",
    reason: "Misleading listing",
    priority: "Normal",
    state: "In review",
    assignee: "You",
    age: "1h",
    author: "Meadow Studio",
    content: "The description mentions daily challenges. A player could not find this mode in the current release.",
    reports: [
      { id: "07", time: "9:28 AM", detail: "Where are the daily challenges? The description says they are available." }
    ]
  },
  {
    id: "RPT-1036",
    game: "Prism Break",
    cover: "/examples/breakout.webp",
    kind: "Comment",
    reason: "Spam or advertising",
    priority: "Normal",
    state: "Resolved",
    assignee: "You",
    age: "2h",
    author: "brickfan",
    content: "Try the purple power-up on level three. It makes a huge difference!",
    outcome: "No violation found",
    reports: [{ id: "08", time: "8:20 AM", detail: "I thought this was an advertisement for a power-up." }]
  }
]
export type CaseEvent = { id: string; caseId: string; actor: string; action: string; note: string; time: string }
export const eventSeeds: CaseEvent[] = [
  {
    id: "event-1",
    caseId: "RPT-1041",
    actor: "Jamie Chen",
    action: "Escalated to an admin",
    note: "Potential download link. Needs an admin to assess whether access should be restricted.",
    time: "10:14 AM"
  },
  {
    id: "event-2",
    caseId: "RPT-1039",
    actor: "Alex Morgan",
    action: "Started review",
    note: "Checking the original comment and the surrounding conversation.",
    time: "10:02 AM"
  },
  {
    id: "event-3",
    caseId: "RPT-1036",
    actor: "You",
    action: "No violation found",
    note: "The comment describes an in-game mechanic and contains no advertising.",
    time: "9:10 AM"
  }
]
export type TeamMember = {
  id: string
  name: string
  email: string
  role: SafetyRole
  state: "Active" | "Invited" | "Expired" | "Removed"
  activity: string
  cases: number
  you?: boolean
}
export const teamSeeds: TeamMember[] = [
  {
    id: "you",
    name: "Andrew Craswell",
    email: "andrew@example.com",
    role: "Admin",
    state: "Active",
    activity: "Active now",
    cases: 1,
    you: true
  },
  {
    id: "alex",
    name: "Alex Morgan",
    email: "alex@example.com",
    role: "Admin",
    state: "Active",
    activity: "12 minutes ago",
    cases: 2
  },
  {
    id: "jamie",
    name: "Jamie Chen",
    email: "jamie@example.com",
    role: "Moderator",
    state: "Active",
    activity: "28 minutes ago",
    cases: 3
  },
  {
    id: "sam",
    name: "Sam Rivera",
    email: "sam@example.com",
    role: "Moderator",
    state: "Invited",
    activity: "Expires in 6 days",
    cases: 0
  },
  {
    id: "riley",
    name: "Riley Park",
    email: "riley@example.com",
    role: "Observer",
    state: "Expired",
    activity: "Expired yesterday",
    cases: 0
  }
]
export const roleDescriptions: Record<SafetyRole, string> = {
  Admin: "Resolve reports, restrict games, and manage the moderation team.",
  Moderator: "Review reports, hide content, and escalate cases to an admin.",
  Observer: "Read reports and history. Cannot make changes."
}
