export type ManagedGame = {
  id: string
  title: string
  creator: string
  initials: string
  cover: string
  url?: string
  genre: string
  dimension: string
  status: "Published" | "Hidden" | "Restricted"
  reports: number
  reason: string
  views: string
  updated: string
  assigned: string | null
}
export type ManagedComment = {
  id: string
  gameId: string
  author: string
  initials: string
  text: string
  time: string
  reports: number
  reason: string
  hidden: boolean
}
// Fictional moderation records, imported only by the Storybook preview.
export const manageGames: ManagedGame[] = [
  {
    id: "orchard",
    url: "https://spawn-snake.spawnkit.games",
    title: "Orchard Snake",
    creator: "Meadow Studio",
    initials: "MS",
    cover: "/examples/snake.webp",
    genre: "Arcade",
    dimension: "2D",
    status: "Published",
    reports: 3,
    reason: "Misleading description",
    views: "12.8k",
    updated: "12 minutes ago",
    assigned: "You"
  },
  {
    id: "prism",
    url: "https://prism-break.spawnkit.games",
    title: "Prism Break",
    creator: "Pixel Theory",
    initials: "PT",
    cover: "/examples/breakout.webp",
    genre: "Arcade",
    dimension: "2D",
    status: "Published",
    reports: 0,
    reason: "",
    views: "8.4k",
    updated: "38 minutes ago",
    assigned: null
  },
  {
    id: "starfall",
    url: "https://starfall-squadron.spawnkit.games",
    title: "Starfall Squadron",
    creator: "Orbit Works",
    initials: "OW",
    cover: "/examples/space-shooter.webp",
    genre: "Shooter",
    dimension: "2D",
    status: "Published",
    reports: 2,
    reason: "Inappropriate content",
    views: "6.2k",
    updated: "1 hour ago",
    assigned: "Alex"
  },
  {
    id: "garden",
    title: "Garden Quest",
    creator: "Fern & Co.",
    initials: "FC",
    cover: "/examples/snake.webp",
    genre: "Puzzle",
    dimension: "2D",
    status: "Hidden",
    reports: 0,
    reason: "",
    views: "2.1k",
    updated: "2 hours ago",
    assigned: "You"
  },
  {
    id: "neon",
    title: "Neon Circuit",
    creator: "Night Shift",
    initials: "NS",
    cover: "/examples/breakout.webp",
    genre: "Arcade",
    dimension: "2D",
    status: "Restricted",
    reports: 1,
    reason: "Unsafe external links",
    views: "946",
    updated: "3 hours ago",
    assigned: "You"
  },
  {
    id: "orbit",
    title: "Orbit Runner",
    creator: "Little Satellite",
    initials: "LS",
    cover: "/examples/space-shooter.webp",
    genre: "Action",
    dimension: "2D",
    status: "Published",
    reports: 0,
    reason: "",
    views: "721",
    updated: "4 hours ago",
    assigned: null
  }
]
export const manageComments: ManagedComment[] = [
  {
    id: "c1",
    gameId: "orchard",
    author: "pixelpilot",
    initials: "PP",
    text: "Free coins on my profile! Sign up now to claim your bonus.",
    time: "8 minutes ago",
    reports: 3,
    reason: "Spam or advertising",
    hidden: false
  },
  {
    id: "c2",
    gameId: "starfall",
    author: "orbitfan",
    initials: "OF",
    text: "The boss fights are excellent. Would love another difficulty level!",
    time: "24 minutes ago",
    reports: 0,
    reason: "",
    hidden: false
  },
  {
    id: "c3",
    gameId: "orchard",
    author: "juniper",
    initials: "JU",
    text: "The orchard looks lovely. Just hit a personal best of 280!",
    time: "42 minutes ago",
    reports: 0,
    reason: "",
    hidden: false
  },
  {
    id: "c4",
    gameId: "prism",
    author: "neonfox",
    initials: "NF",
    text: "Stop posting here. Nobody wants your feedback.",
    time: "1 hour ago",
    reports: 2,
    reason: "Harassment",
    hidden: false
  },
  {
    id: "c5",
    gameId: "garden",
    author: "moonbeam",
    initials: "MB",
    text: "Visit my profile for a special reward code.",
    time: "2 hours ago",
    reports: 1,
    reason: "Spam or advertising",
    hidden: true
  }
]
export type ModerationEvent = {
  id: string
  actor: string
  action: string
  target: string
  reason: string
  time: string
}
export const manageEvents: ModerationEvent[] = [
  {
    id: "a1",
    actor: "Alex Morgan",
    action: "Hid a comment",
    target: "Garden Quest",
    reason: "Spam or advertising: Repeated promotional links.",
    time: "25 minutes ago"
  },
  {
    id: "a2",
    actor: "Jamie Chen",
    action: "Restricted game access",
    target: "Neon Circuit",
    reason: "Unsafe external links: Access disabled while the creator addresses the report.",
    time: "1 hour ago"
  },
  {
    id: "a3",
    actor: "Alex Morgan",
    action: "Hid from discovery",
    target: "Garden Quest",
    reason: "Misleading listing: Cover image does not match the game.",
    time: "2 hours ago"
  }
]
