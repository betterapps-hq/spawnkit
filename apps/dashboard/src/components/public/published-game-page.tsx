import { findStarterKit } from "@spawn/templates/kits"
import { listingDetails } from "@spawn/templates/listing"
import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { recordGameActivity, type GameActivityCounts } from "@/lib/game-activity"
import type { FeedbackTotals } from "@/lib/game-feedback"
import type { PublishedGame } from "@/lib/publishing"
import { GameCommunity } from "./game-community"
import { GameSignals } from "./game-signals"
import { HostedPlayer } from "./hosted-player"
import { PlayerReport } from "./player-report"
import { PublicShell } from "./shell"

export function PublishedGamePage({ game, related = [] }: { game: PublishedGame; related?: PublishedGame[] }) {
  const details = listingDetails(game.details)
  const kit = details.kitId ? findStarterKit(details.kitId) : undefined
  const [activity, setActivity] = useState<GameActivityCounts>({ views: game.views ?? 0, plays: game.plays ?? 0 })
  const [feedback, setFeedback] = useState<FeedbackTotals>({
    rating: game.rating ?? 0,
    reviews: game.reviews ?? 0,
    comments: game.comments ?? 0
  })
  function update(next: GameActivityCounts | null) {
    if (next)
      setActivity((previous) => ({
        views: Math.max(previous.views, next.views),
        plays: Math.max(previous.plays, next.plays)
      }))
  }
  useEffect(() => {
    let sent = false
    let disposed = false
    const visit = () => {
      if (document.visibilityState !== "visible" || sent) return
      sent = true
      void recordGameActivity(game.projectId, "view").then((next) => {
        if (!disposed) update(next)
      })
    }
    visit()
    document.addEventListener("visibilitychange", visit)
    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", visit)
    }
  }, [game.projectId])
  return (
    <PublicShell active="/">
      <div className="p-container publishing-page">
        <div className="publishing-heading">
          <div>
            <h1>{game.title}</h1>
            <GameSignals feedback={feedback} activity={activity} showPlays />
          </div>
          <div className="publishing-heading-actions">
            <a href="/" className="all-games-link">
              <ArrowLeft size={16} aria-hidden="true" /> All games
            </a>
            <PlayerReport projectId={game.projectId} title={game.title} />
          </div>
        </div>
        <HostedPlayer game={game} onPlay={() => void recordGameActivity(game.projectId, "play").then(update)} />
        <p>{game.description}</p>
        {Object.keys(details).length > 0 && (
          <section aria-label="About this game">
            <dl>
              {[
                ["Objective", details.objective],
                ["Controls", details.controls],
                ["Device support", details.devices],
                ["Created by", details.creator]
              ].map(([name, value]) =>
                value ? (
                  <div key={name}>
                    <dt>
                      <strong>{name}</strong>
                    </dt>
                    <dd>{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
            {details.sourceUrl && (
              <p>
                <a href={details.sourceUrl} rel="ugc nofollow noopener noreferrer" target="_blank">
                  View game source
                </a>{" "}
                · {details.sourceLicense}
              </p>
            )}
            {kit && (
              <p>
                Built with the <a href={`/kits/${kit.id}`}>{kit.name}</a>.
              </p>
            )}
          </section>
        )}
        <div className="p-game-tags">
          {[game.genre, game.dimension].filter(Boolean).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <GameCommunity projectId={game.projectId} initialTotals={feedback} onTotals={setFeedback} />
        {related.length > 0 && (
          <section>
            <h2>More {game.genre?.toLowerCase()} games</h2>
            <ul>
              {related.map((item) => (
                <li key={item.projectId}>
                  <a href={`/play/${item.projectId}`}>{item.title}</a> — {item.description}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p>
          Make a browser game of your own with <a href="/templates">a free starter kit</a>, or{" "}
          <a href="/browse">browse more games</a>.
        </p>
      </div>
    </PublicShell>
  )
}
