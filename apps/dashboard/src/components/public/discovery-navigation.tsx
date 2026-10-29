import { ArrowRight, Compass, Flame, Sparkles, Star, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type GamesSearch } from "@/lib/game-discovery"

const collections = [
  { name: "Discover", icon: Compass, sort: undefined },
  { name: "Popular", icon: Flame, sort: "popular" },
  { name: "Top rated", icon: Star, sort: "rating" },
  { name: "New arrivals", icon: Sparkles, sort: "newest" }
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
