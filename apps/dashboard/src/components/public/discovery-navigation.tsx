import { ArrowRight, Compass, Flame, Gamepad2, Sparkles, Star, Swords, Timer, Trophy, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { discoverGames, type GamesSearch } from "@/lib/game-discovery"

const collections = [
  { name: "Discover", icon: Compass, sort: undefined },
  { name: "Popular", icon: Flame, sort: "popular" },
  { name: "Top rated", icon: Star, sort: "rating" },
  { name: "New arrivals", icon: Sparkles, sort: "newest" }
]
const genres = [
  { name: "Arcade", icon: Gamepad2, color: "amber" },
  { name: "Action", icon: Swords, color: "rose" },
  { name: "Adventure", icon: Compass, color: "mint" },
  { name: "Racing", icon: Timer, color: "blue" },
  { name: "Strategy", icon: Trophy, color: "purple" }
]
const illustratedGenres = [
  { name: "Arcade", color: "amber", images: ["snake", "breakout"] },
  { name: "Adventure", color: "mint", images: ["platformer-3d", "dungeon-crawler"] },
  { name: "Racing", color: "blue", images: ["racing"] },
  { name: "Strategy", color: "purple", images: ["tower-defense", "iron-frontier"] }
]

export function DiscoveryRail({ search, browse }: { search: GamesSearch; browse: (next: GamesSearch) => void }) {
  return (
    <aside className="d-rail">
      <nav aria-label="Discover collections" className="d-rail-collections">
        {collections.map(({ name, icon: Icon, sort }) => (
          <Button
            key={name}
            variant="ghost"
            aria-label={name}
            title={name}
            aria-pressed={!search.genre && search.sort === sort}
            onClick={() => browse(sort ? { sort } : {})}
          >
            <Icon size={18} />
            <span>{name}</span>
          </Button>
        ))}
      </nav>
      <nav aria-label="Browse genres" className="d-rail-genres">
        <h2>Categories</h2>
        {genres.map(({ name, icon: Icon, color }) => (
          <Button
            key={name}
            variant="ghost"
            aria-label={`Browse ${name}`}
            title={name}
            aria-pressed={search.genre === name}
            onClick={() => browse({ genre: name })}
          >
            <span className={`d-genre-icon tone-${color}`}>
              <Icon size={17} />
            </span>
            {name}
          </Button>
        ))}
      </nav>
      <a className="d-rail-creator" href="/create">
        <span className="d-creator-token" aria-hidden="true">
          <Zap size={23} fill="currentColor" />
        </span>
        <strong>
          Your game.
          <br />
          On SpawnKit.
        </strong>
        <span>
          Start creating <ArrowRight size={14} />
        </span>
      </a>
    </aside>
  )
}

export function GenreCollections({ browse }: { browse: (next: GamesSearch) => void }) {
  return (
    <nav className="d-genre-collections" aria-label="Explore game categories">
      {illustratedGenres.map(({ name, color, images }) => {
        const count = discoverGames({ genre: name }).length
        return (
          <Button
            key={name}
            variant="ghost"
            className={`d-genre-collection tone-${color}`}
            aria-label={`Explore ${name} games`}
            onClick={() => browse({ genre: name })}
          >
            <span className="d-genre-copy">
              <strong>{name}</strong>
              <span>
                {count} {count === 1 ? "game" : "games"} <ArrowRight size={13} />
              </span>
            </span>
            <span className="d-genre-art" aria-hidden="true">
              {images.map((id) => (
                <img key={id} src={`/examples/${id}.webp`} alt="" width="100" height="100" loading="lazy" />
              ))}
            </span>
          </Button>
        )
      })}
    </nav>
  )
}
