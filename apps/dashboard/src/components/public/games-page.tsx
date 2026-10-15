import { ArrowRight, ArrowUpRight, Dices, Play, Search, Trophy, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { monthlyPodium } from "@/lib/community-preview"
import { discoverGames, publicGames, type GamesSearch, type PublicGame } from "@/lib/game-discovery"
import { DiscoveryFilters } from "./discovery-filters"
import { DiscoveryRail, GenreCollections } from "./discovery-navigation"
import { GameSignals } from "./game-signals"
import { CreatorBanner, PublicShell } from "./shell"
import "./discovery.css"

export function GameCard({ game, arcade = false }: { game: PublicGame; arcade?: boolean }) {
  if (arcade)
    return (
      <a
        className="p-game-card d-game-card"
        href={`/games/${game.id}`}
        aria-label={`${game.playable ? "Play" : "Explore"} ${game.name}`}
      >
        <div className="p-game-art">
          <img src={`/examples/${game.id}.webp`} alt="" loading="lazy" width="960" height="540" />
          <div className="d-game-title">
            <span>{game.genre}</span>
            <h3>{game.name}</h3>
          </div>
          <span className="d-card-action" aria-hidden="true">
            {game.playable ? <Play size={15} fill="currentColor" /> : <ArrowUpRight size={17} />}
          </span>
        </div>
        <GameSignals gameId={game.id} playable={game.playable} />
      </a>
    )
  return (
    <a
      className="p-game-card"
      href={`/games/${game.id}`}
      aria-label={`${game.playable ? "Play" : "Explore"} ${game.name}`}
    >
      <div className="p-game-art">
        <img src={`/examples/${game.id}.webp`} alt="" loading="lazy" width="960" height="540" />
        <span className="p-card-play" aria-hidden="true">
          {game.playable ? <Play fill="currentColor" size={22} /> : <ArrowRight size={24} />}
        </span>
      </div>
      <div className="p-game-info">
        <div>
          <h3>{game.name}</h3>
          <p className="p-game-genre">
            <span>{game.genre}</span>
            <span>{game.dimension}</span>
          </p>
        </div>
        <ArrowRight size={17} />
      </div>
      <GameSignals gameId={game.id} playable={game.playable} />
    </a>
  )
}
export function GamesPage({ search, onSearch }: { search: GamesSearch; onSearch: (search: GamesSearch) => void }) {
  const games = discoverGames(search)
  const browse = (next: GamesSearch) => {
    onSearch(next)
    document.getElementById("games")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start"
    })
  }
  const surprise = () => {
    const playable = publicGames.filter((game) => game.playable)
    const game = playable[Math.floor(Math.random() * playable.length)]!
    window.location.assign(`/games/${game.id}`)
  }
  return (
    <PublicShell active="/">
      <div className="p-container p-discovery d-hub">
        <DiscoveryRail search={search} browse={browse} />
        <div className="d-main">
          <section className="p-discovery-heading">
            <div>
              <h1>Free browser games</h1>
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
              <Button className="d-surprise" variant="outline" onClick={surprise} aria-label="Play a random game">
                <Dices size={18} />
                <span>Surprise me</span>
              </Button>
            </div>
          </section>
          <section className="p-monthly" aria-labelledby="monthly-title">
            <div className="p-monthly-heading">
              <h2 id="monthly-title">
                <Trophy size={18} /> This month’s most played
              </h2>
              <Button variant="ghost" className="d-ranking-link" onClick={() => browse({ sort: "popular" })}>
                All popular games <ArrowRight size={14} />
              </Button>
            </div>
            <div className="p-podium">
              {monthlyPodium.map((id, index) => {
                const game = publicGames.find((entry) => entry.id === id)!
                const medal = ["Gold", "Silver", "Bronze"][index]!
                const [titleLead, ...titleRest] = game.name.split(" ")
                return (
                  <a
                    href={`/games/${id}`}
                    key={id}
                    className={`p-podium-game podium-${index}`}
                    aria-label={`Play ${game.name}, ${medal} place`}
                  >
                    <img
                      src={`/examples/${id}.webp`}
                      alt=""
                      width="960"
                      height="540"
                      fetchPriority={index === 0 ? "high" : "auto"}
                    />
                    <div className="p-podium-shade" />
                    <span className="d-rank-number" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <span className="p-medal" aria-label={`${medal} place`}>
                      <Trophy size={17} />
                      <b>{index + 1}</b>
                      <span>{medal}</span>
                    </span>
                    <div className="p-podium-copy">
                      <span className="p-podium-genre">{game.genre}</span>
                      <h3>
                        {index === 0 ? (
                          <>
                            {titleLead} <span>{titleRest.join(" ")}</span>
                          </>
                        ) : (
                          game.name
                        )}
                      </h3>
                      {index === 0 && <p className="d-winner-description">Dodge enemy fire. Chase your high score.</p>}
                      <GameSignals gameId={id} playable />
                      <span className="p-podium-play">
                        <Play size={13} fill="currentColor" />
                        {index === 0 && "Play free"}
                      </span>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
          <GenreCollections browse={browse} />
          <section id="games" className="p-games-section">
            <div className="p-section-heading">
              <h2>
                <Zap size={20} fill="currentColor" /> Browse games
              </h2>
            </div>
            <DiscoveryFilters search={search} onSearch={onSearch} count={games.length} />
            <div className="p-games-grid">
              {games.map((game) => (
                <GameCard key={game.id} game={game} arcade />
              ))}
            </div>
            {games.length === 0 && (
              <div className="p-empty">
                <Search size={32} />
                <h3>No games found</h3>
                <p>Try a different title, genre, or engine.</p>
                <Button className="p-button" onClick={() => onSearch({})}>
                  Reset filters <ArrowRight size={17} />
                </Button>
              </div>
            )}
          </section>
          <CreatorBanner />
        </div>
      </div>
    </PublicShell>
  )
}
