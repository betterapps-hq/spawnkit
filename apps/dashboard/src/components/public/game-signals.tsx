import { Eye, Star, Users } from "lucide-react"
import { communityPreview } from "@/lib/community-preview"

export function GameSignals({ gameId, playable }: { gameId: string; playable: boolean }) {
  const { rating, reviews, activity } = communityPreview(gameId)
  const count = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(activity)
  return (
    <div className="p-game-signals">
      <span aria-label={`Rating ${rating} out of 5 from ${reviews} reviews`}>
        <Star size={13} fill="currentColor" />
        <b>{rating.toFixed(1)}</b>
        <small>({reviews})</small>
      </span>
      <span aria-label={`${playable ? "players" : "views"}: ${activity}`}>
        {playable ? <Users size={13} /> : <Eye size={13} />}
        {count}
        <small>{playable ? "players" : "views"}</small>
      </span>
    </div>
  )
}
