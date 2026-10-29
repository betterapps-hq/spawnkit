import { Eye, Play, Trophy } from "lucide-react"
import { monthlyGames } from "@/lib/game-discovery"
import type { PublishedGame } from "@/lib/publishing"
import { GameCoverLink } from "./game-cover"

export function MonthlyGames({ published }: { published: PublishedGame[] }) {
  const games = monthlyGames(published)
  if (!games.length) return null
  return (
    <section className="p-monthly" aria-labelledby="monthly-heading">
      <div className="p-monthly-heading">
        <h2 id="monthly-heading">
          <Trophy size={18} aria-hidden="true" /> Top games this month
        </h2>
      </div>
      <div className="p-podium">
        {games.map((game, index) => (
          <GameCoverLink
            key={game.id}
            game={game.published}
            priority={index === 0}
            className={`p-podium-game podium-${index}`}
            label={`Play ${game.name}, rank ${index + 1}`}
          >
            <div className="p-podium-shade" />
            <span className="d-rank-number" aria-hidden="true">
              0{index + 1}
            </span>
            <span className="p-medal">
              <Trophy size={17} aria-hidden="true" />
              <b>{index + 1}</b>
              <span>{["Gold", "Silver", "Bronze"][index]}</span>
            </span>
            <div className="p-podium-copy">
              <span className="p-podium-genre">{[game.genre, game.dimension].filter(Boolean).join(" · ")}</span>
              <h3>{game.name}</h3>
              {index === 0 && <p className="d-winner-description">{game.description}</p>}
              <span className="d-monthly-views">
                <Eye size={13} aria-hidden="true" />
                {(game.published.monthlyViews ?? 0).toLocaleString("en-US")}{" "}
                {game.published.monthlyViews === 1 ? "view" : "views"} this month
              </span>
              <span className="p-podium-play">
                <Play size={13} fill="currentColor" aria-hidden="true" />
                {index === 0 && "Play free"}
              </span>
            </div>
          </GameCoverLink>
        ))}
      </div>
      {games.every((game) => !game.published.monthlyViews) && (
        <p className="d-monthly-note">A fresh leaderboard. Rankings update as games are played.</p>
      )}
    </section>
  )
}
