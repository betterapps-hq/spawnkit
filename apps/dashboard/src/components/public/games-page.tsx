import {
  ArrowDownAZ,
  ArrowRight,
  Box,
  Compass,
  Flame,
  Gamepad2,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Swords,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { discoverGames, publicGames, type GamesSearch, type PublicGame } from "@/lib/game-discovery"
import { CreatorBanner, PublicShell } from "./shell"

export function GameCard({ game }: { game: PublicGame }) {
  return (
    <a
      className="p-game-card"
      href={`/games/${game.id}`}
      aria-label={`${game.playable ? "Play" : "Explore"} ${game.name}`}
    >
      <div className="p-game-art">
        <img src={`/examples/${game.id}.webp`} alt="" loading="lazy" width="960" height="540" />
        <span className={`p-game-status ${game.playable ? "is-playable" : ""}`}>
          {game.playable ? (
            <>
              <span />
              Playable demo
            </>
          ) : (
            "Game concept"
          )}
        </span>
        <span className="p-card-play" aria-hidden="true">
          {game.playable ? <Play fill="currentColor" size={22} /> : <ArrowRight size={24} />}
        </span>
      </div>
      <div className="p-game-info">
        <div>
          <h3>{game.name}</h3>
          <p>
            {game.genre}
            <span>·</span>
            {game.dimension}
          </p>
        </div>
        <ArrowRight size={17} />
      </div>
    </a>
  )
}
export function GamesPage({ search, onSearch }: { search: GamesSearch; onSearch: (search: GamesSearch) => void }) {
  const games = discoverGames(search)
  const patch = (next: Partial<GamesSearch>) => onSearch({ ...search, ...next })
  const active = Boolean(search.q || search.genre || search.dimension || search.availability)
  const categories = [
    { label: "All games", value: undefined, icon: Compass },
    { label: "Arcade", value: "Arcade", icon: Gamepad2 },
    { label: "Racing", value: "Racing", icon: Flame },
    { label: "Adventure", value: "Adventure", icon: Sparkles },
    { label: "Action", value: "Action", icon: Swords },
    { label: "Strategy", value: "Strategy", icon: Box }
  ]
  return (
    <PublicShell active="/">
      <div className="p-container p-discovery">
        <section className="p-discovery-heading">
          <div>
            <h1>Free browser games</h1>
            <p>Play instantly. Find your next project.</p>
          </div>
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
        </section>
        <section className="p-featured" aria-label="Featured games">
          <a href="/games/space-shooter" className="p-hero-game">
            <img
              src="/examples/space-shooter.webp"
              alt="Starships above a neon planet — concept artwork for Starfall Squadron"
              width="960"
              height="540"
              fetchPriority="high"
            />
            <div className="p-hero-shade" />
            <span className="p-spotlight">
              <Play size={13} /> Playable demo
            </span>
            <div className="p-hero-copy">
              <h2>Starfall Squadron</h2>
              <p>Dodge incoming ships and defend your score.</p>
              <span className="p-button p-button-white">
                Play free <ArrowRight size={17} />
              </span>
            </div>
            <span className="p-hero-index">
              Arcade <span> / Space shooter</span>
            </span>
          </a>
          <div className="p-side-features">
            <a href="/games/snake" className="p-feature-small">
              <img
                src="/examples/snake.webp"
                alt="A little green snake collecting apples in a sunlit garden"
                width="960"
                height="540"
              />
              <div className="p-hero-shade" />
              <span className="p-floating-tag">
                <span className="p-live-dot" /> Playable demo
              </span>
              <div>
                <h2>Orchard Trail</h2>
              </div>
              <span className="p-round-arrow">
                <Play size={18} fill="currentColor" />
              </span>
            </a>
            <a href="/templates" className="p-maker-card" aria-label="Build a starter kit">
              <div>
                <h2>
                  Make a game
                  <br />
                  <span>with your AI editor.</span>
                </h2>
                <span className="p-text-link">
                  Build a starter kit <ArrowRight size={17} />
                </span>
              </div>
              <div className="p-mini-cubes" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </a>
          </div>
        </section>
        <section id="games" className="p-games-section">
          <div className="p-section-heading">
            <h2>Browse games</h2>
          </div>
          <div className="p-category-tabs" aria-label="Popular game genres">
            {categories.map(({ label, value, icon: Icon }) => (
              <Button
                key={label}
                className={search.genre === value ? "is-active" : ""}
                aria-pressed={search.genre === value}
                onClick={() => patch({ genre: value })}
              >
                <Icon size={17} />
                {label}
              </Button>
            ))}
          </div>
          <div className="p-discovery-controls">
            <label className="p-search">
              <Search size={19} />
              <Input
                aria-label="Search games"
                placeholder="Search by title, genre, or engine"
                value={search.q ?? ""}
                onChange={(event) => patch({ q: event.target.value || undefined })}
              />
              {search.q && (
                <Button aria-label="Clear search" onClick={() => patch({ q: undefined })}>
                  <X size={16} />
                </Button>
              )}
            </label>
            <div className="p-select-wrap">
              <SlidersHorizontal size={15} />
              <NativeSelect
                aria-label="Game availability"
                value={search.availability ?? "all"}
                onChange={(event) =>
                  patch({ availability: event.target.value === "all" ? undefined : event.target.value })
                }
              >
                <NativeSelectOption value="all">All games</NativeSelectOption>
                <NativeSelectOption value="playable">Playable demos</NativeSelectOption>
                <NativeSelectOption value="concept">Game concepts</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="p-select-wrap">
              <Box size={15} />
              <NativeSelect
                aria-label="Game dimension"
                value={search.dimension ?? "all"}
                onChange={(event) =>
                  patch({ dimension: event.target.value === "all" ? undefined : event.target.value })
                }
              >
                <NativeSelectOption value="all">2D & 3D</NativeSelectOption>
                <NativeSelectOption>2D</NativeSelectOption>
                <NativeSelectOption>3D</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="p-select-wrap">
              <ArrowDownAZ size={15} />
              <NativeSelect
                aria-label="Sort games"
                value={search.sort ?? "featured"}
                onChange={(event) =>
                  patch({ sort: event.target.value === "featured" ? undefined : event.target.value })
                }
              >
                <NativeSelectOption value="featured">Recommended</NativeSelectOption>
                <NativeSelectOption value="newest">Recently added</NativeSelectOption>
                <NativeSelectOption value="az">Name: A–Z</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
          <div className="p-results-line">
            <output>
              {games.length} {games.length === 1 ? "game" : "games"}
              {active ? " found" : ""}
            </output>
            {active && (
              <Button onClick={() => onSearch({})}>
                Clear filters <X size={13} />
              </Button>
            )}
          </div>
          <div className="p-games-grid">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
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
          <p className="p-collection-note">
            {publicGames.filter((game) => game.playable).length} playable demos. Other entries are game concepts. Cover
            artwork is illustrative.
          </p>
        </section>
        <CreatorBanner />
      </div>
    </PublicShell>
  )
}
