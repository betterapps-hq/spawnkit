// Design fixtures, never a live analytics or public review feed.
const metrics: Record<string, [number, number, number, number, number]> = {
  "space-shooter": [4.9, 186, 15420, 472, 18],
  snake: [4.8, 124, 12380, 318, 12],
  breakout: [4.7, 96, 8640, 241, 21],
  platformer: [4.6, 42, 2180, 105, 8],
  "platformer-3d": [4.9, 58, 3960, 158, 5],
  "iron-frontier": [4.5, 28, 1840, 75, 9],
  "kingdoms-at-war": [4.6, 31, 1670, 84, 7],
  "first-person-shooter": [4.7, 45, 2610, 126, 10],
  "tower-defense": [4.8, 67, 3120, 180, 9],
  racing: [4.8, 72, 4280, 205, 13],
  "dungeon-crawler": [4.7, 39, 2340, 113, 11],
  "space-flight": [4.6, 34, 2150, 96, 8],
  "arena-combat": [4.5, 26, 1760, 81, 10],
  "endless-runner": [4.6, 33, 1980, 92, 7]
}
export function communityPreview(gameId: string) {
  const [rating, reviews, activity, upvotes, downvotes] = metrics[gameId] ?? [0, 0, 0, 0, 0]
  return { rating, reviews, activity, upvotes, downvotes }
}
export const monthlyPodium = ["space-shooter", "snake", "breakout"]
export function previewReviews(playable: boolean) {
  return playable
    ? [
        {
          name: "pixelpilot",
          rating: 5,
          text: "Easy to pick up, and the short rounds make it great for a quick break."
        },
        {
          name: "levelup",
          rating: 4,
          text: "The controls are clear. A little more variety between rounds would give me a reason to keep coming back."
        }
      ]
    : [
        {
          name: "pixelpilot",
          rating: 5,
          text: "The setting has a lot of potential. I’d love to try a playable version."
        },
        { name: "levelup", rating: 4, text: "I like the direction. A short demo showing the core mechanic would help." }
      ]
}
