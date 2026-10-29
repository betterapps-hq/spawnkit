import { ArrowRight, Dices, Play, Search, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { discoverGames, gameCatalog, gameHref, type GamesSearch, type DiscoveryGame } from "@/lib/game-discovery"
import type { PublishedGame } from "@/lib/publishing"
import { DiscoveryFilters } from "./discovery-filters"
import { DiscoveryRail } from "./discovery-navigation"
import { GameCover } from "./game-cover"
import { GameSignals } from "./game-signals"
import { MonthlyGames } from "./monthly-games"
import "./publishing.css"
import { CreatorBanner, PublicShell } from "./shell"
import "./discovery.css"

function GameCard({ game }: { game: DiscoveryGame }) {
  return (
    <article className="p-game-card d-game-card" aria-label={game.name}>
      <GameCover game={game.published} className="published-art p-game-art">
        <div className="d-game-title">
          <h3>{game.name}</h3>
        </div>
        <span className="d-card-action" aria-hidden="true">
          <Play size={15} fill="currentColor" />
        </span>
      </GameCover>
      <div className="p-game-tags">
        {[game.genre, game.dimension].filter(Boolean).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <GameSignals
        feedback={game.published}
        activity={{ views: game.published.views ?? 0, plays: game.published.plays ?? 0 }}
      />
    </article>
  )
}
export function GamesPage({
  search,
  onSearch,
  published = [],
  unavailable = false
}: {
  search: GamesSearch
  onSearch: (search: GamesSearch) => void
  published?: PublishedGame[]
  unavailable?: boolean
}) {
  const games = discoverGames(search, published)
  const browse = (next: GamesSearch) => {
    onSearch(next)
    document.getElementById("games")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start"
    })
  }
  const surprise = () => {
    const playable = gameCatalog(published).filter((game) => game.playable)
    const game = playable[Math.floor(Math.random() * playable.length)]!
    if (game) window.location.assign(gameHref(game))
  }
  return (
    <PublicShell active="/">
      <div className="p-container p-discovery d-hub">
        <DiscoveryRail search={search} browse={browse} />
        <div className="d-main">
          <section className="p-discovery-heading">
            <div>
              <h1>Free browser games</h1>
              <p>Discover games to play in your browser, with no download required.</p>
            </div>
            <div className="d-top-actions">
              <search className="p-quick-search" aria-label="Quick game search">
                <form className="p-hero-search" action="/#games">
                  <Search size={17} />
                  <Input
                    key={search.q ?? ""}
                    name="q"
                    aria-label="Find a game"
                    placeholder="What do you want to play?"
                    defaultValue={search.q ?? ""}
                    maxLength={120}
                  />
                  <Button aria-label="Search the catalogue" type="submit">
                    <ArrowRight size={18} />
                  </Button>
                </form>
              </search>
              <Button
                className="d-surprise"
                variant="outline"
                onClick={surprise}
                disabled={!published.length}
                aria-label="Play a random game"
              >
                <Dices size={18} />
                <span>Surprise me</span>
              </Button>
            </div>
          </section>
          <MonthlyGames published={published} />
          <section id="games" className="p-games-section">
            <div className="p-section-heading">
              <h2>
                <Zap size={20} fill="currentColor" /> Browse games
              </h2>
            </div>
            <a className="p-text-link" href="/browse">
              Browse the complete catalog <ArrowRight size={16} />
            </a>
            <DiscoveryFilters search={search} onSearch={onSearch} count={games.length} />
            <div className="p-games-grid">
              {games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
            {games.length === 0 && (
              <div className="p-empty">
                <Search size={32} />
                <h3>{unavailable ? "Games are temporarily unavailable" : "No games found"}</h3>
                <p>
                  {unavailable
                    ? "Please try again shortly. You can still explore starter kits and learn how to make your own game."
                    : "Try a different title or clear your filters."}
                </p>
                {unavailable ? (
                  <a href="/templates" className="p-text-link">
                    Explore starter kits <ArrowRight size={17} />
                  </a>
                ) : (
                  <Button className="p-button" onClick={() => onSearch({})}>
                    Reset filters <ArrowRight size={17} />
                  </Button>
                )}
              </div>
            )}
          </section>
          <CreatorBanner />
        </div>
      </div>
    </PublicShell>
  )
}
