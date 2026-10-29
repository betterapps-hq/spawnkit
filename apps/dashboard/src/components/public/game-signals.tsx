import { Eye, MessageSquare, Play, Star } from "lucide-react"
import type { GameActivityCounts } from "@/lib/game-activity"
import type { FeedbackTotals } from "@/lib/game-feedback"

export function GameSignals({
  feedback,
  activity: live,
  showPlays = false
}: {
  feedback?: Partial<FeedbackTotals>
  activity?: GameActivityCounts | undefined
  showPlays?: boolean
}) {
  const { rating = 0, reviews = 0, comments = 0 } = feedback ?? {}
  const views = live?.views ?? 0
  const format = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
  return (
    <div className="p-game-signals">
      <span
        aria-label={`Rating ${rating} out of 5 from ${reviews} reviews`}
        title={reviews ? `${reviews} reviews` : "Not rated yet"}
      >
        <Star size={13} fill={reviews ? "currentColor" : "none"} aria-hidden="true" />
        <b>{reviews ? rating.toFixed(1) : "0"}</b>
      </span>
      <span aria-label={`Views: ${views}`} title={`${views} views`}>
        <Eye size={13} aria-hidden="true" />
        {format.format(views)}
        <small>views</small>
      </span>
      {showPlays && (
        <span aria-label={`Plays: ${live?.plays ?? 0}`} title={`${live?.plays ?? 0} plays`}>
          <Play size={13} aria-hidden="true" />
          {format.format(live?.plays ?? 0)}
          <small>plays</small>
        </span>
      )}
      <span aria-label={`Comments: ${comments}`} title={comments ? `${comments} comments` : "No comments yet"}>
        <MessageSquare size={13} aria-hidden="true" />
        {format.format(comments)}
        <small>comments</small>
      </span>
    </div>
  )
}
