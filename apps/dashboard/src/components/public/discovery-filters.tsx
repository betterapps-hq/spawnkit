import { gameGenres } from "@spawn/templates/listing"
import { ArrowDownWideNarrow, Search, SlidersHorizontal, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SelectItem } from "@/components/ui/select"
import type { GamesSearch } from "@/lib/game-discovery"
import { FieldSelect } from "./field-select"

export function DiscoveryFilters({
  search,
  onSearch,
  count
}: {
  search: GamesSearch
  onSearch: (search: GamesSearch) => void
  count: number
}) {
  const patch = (next: Partial<GamesSearch>) => onSearch({ ...search, ...next })
  const selections = [
    { key: "genre", label: search.genre },
    { key: "dimension", label: search.dimension },
    { key: "rating", label: `${search.rating}+ stars` },
    { key: "reviews", label: `${search.reviews}+ reviews` }
  ].filter(({ key }) => search[key as keyof GamesSearch])
  const active = Boolean(search.q || search.genre || selections.length)
  return (
    <div className="p-discovery-filter-panel">
      <div className="p-discovery-toolbar">
        <label className="p-search">
          <Search size={18} />
          <Input
            aria-label="Search games"
            placeholder="Find your next game"
            value={search.q ?? ""}
            onChange={(event) => patch({ q: event.target.value || undefined })}
          />
          {search.q && (
            <Button aria-label="Clear search" onClick={() => patch({ q: undefined })}>
              <X size={15} />
            </Button>
          )}
        </label>
        <div className="p-select-wrap p-sort-control">
          <ArrowDownWideNarrow size={16} />
          <FieldSelect
            aria-label="Sort games"
            value={search.sort ?? "popular"}
            onValueChange={(value) => patch({ sort: value === "popular" ? undefined : value })}
          >
            <SelectItem value="popular">Most popular</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
            <SelectItem value="reviews">Most reviewed</SelectItem>
            <SelectItem value="newest">Recently added</SelectItem>
            <SelectItem value="az">Name: A–Z</SelectItem>
          </FieldSelect>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="p-filter-trigger" aria-label="Filter games">
              <SlidersHorizontal size={16} /> Filters
              {selections.length > 0 && <span>{selections.length}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={10}
            collisionPadding={16}
            className="p-filter-popover"
            aria-label="Game filters"
          >
            <header>
              <h3>Filter games</h3>
              <Button
                variant="ghost"
                onClick={() =>
                  patch({
                    genre: undefined,
                    rating: undefined,
                    reviews: undefined,
                    dimension: undefined,
                    availability: undefined
                  })
                }
              >
                Reset
              </Button>
            </header>
            <fieldset>
              <legend>
                <Star size={14} /> Minimum rating
              </legend>
              <RadioGroup
                className="p-filter-segments"
                aria-label="Minimum rating"
                value={search.rating ?? "any"}
                onValueChange={(value) => patch({ rating: value === "any" ? undefined : value })}
              >
                {["any", "4", "4.5", "4.8"].map((value) => (
                  <label key={value}>
                    <RadioGroupItem value={value} aria-label={value === "any" ? "Any rating" : `${value}+ stars`} />
                    <span>{value === "any" ? "Any" : `${value}+`}</span>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
            <div className="p-filter-options">
              <label htmlFor="filter-genre">
                <span>Genre</span>
                <FieldSelect
                  id="filter-genre"
                  aria-label="Genre"
                  value={search.genre ?? "any"}
                  onValueChange={(value) => patch({ genre: value === "any" ? undefined : value })}
                >
                  <SelectItem value="any">All genres</SelectItem>
                  {gameGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </FieldSelect>
              </label>
              <label htmlFor="filter-dimension">
                <span>Dimension</span>
                <FieldSelect
                  id="filter-dimension"
                  aria-label="Dimension"
                  value={search.dimension ?? "any"}
                  onValueChange={(value) => patch({ dimension: value === "any" ? undefined : value })}
                >
                  <SelectItem value="any">2D & 3D</SelectItem>
                  <SelectItem value="2D">2D</SelectItem>
                  <SelectItem value="3D">3D</SelectItem>
                </FieldSelect>
              </label>
              <label htmlFor="filter-reviews">
                <span>Reviews</span>
                <FieldSelect
                  id="filter-reviews"
                  aria-label="Minimum reviews"
                  value={search.reviews ?? "any"}
                  onValueChange={(value) => patch({ reviews: value === "any" ? undefined : value })}
                >
                  <SelectItem value="any">Any number</SelectItem>
                  <SelectItem value="25">25+ reviews</SelectItem>
                  <SelectItem value="50">50+ reviews</SelectItem>
                  <SelectItem value="100">100+ reviews</SelectItem>
                </FieldSelect>
              </label>
            </div>
            <p className="p-filter-match-count">
              {count} {count === 1 ? "game" : "games"} match
            </p>
          </PopoverContent>
        </Popover>
      </div>
      <div className="p-filter-results">
        <output>
          {count} {count === 1 ? "game" : "games"}
          {active ? " found" : ""}
        </output>
        <div className="p-filter-chips">
          {selections.map(({ key, label }) => (
            <Button
              key={key}
              variant="ghost"
              aria-label={`Remove ${label} filter`}
              onClick={() => patch({ [key]: undefined })}
            >
              {label}
              <X size={12} />
            </Button>
          ))}
        </div>
        {active && (
          <Button variant="ghost" className="p-filter-clear" onClick={() => onSearch({ sort: search.sort })}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
