import { useState } from "react"
import { exampleGames as games } from "@/lib/example-catalog"
import { CatalogCard, CatalogGrid } from "./catalog-card"
import { CatalogToolbar } from "./catalog-toolbar"
import { SelectField } from "./select-field"
import { Button } from "./ui/button"
export function ExampleGames() {
  const [dimension, setDimension] = useState("all")
  const [search, setSearch] = useState("")
  const [genre, setGenre] = useState("all")
  const filtered = games.filter(
    (game) =>
      (dimension === "all" || game.dimension.toLowerCase() === dimension) &&
      (genre === "all" || game.genre === genre) &&
      `${game.name} ${game.genre} ${game.description} ${game.engine}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  )
  return (
    <section aria-label="Example games">
      <CatalogToolbar
        label="example games"
        search={search}
        onSearch={setSearch}
        dimension={dimension}
        onDimension={setDimension}
      >
        <div className="w-44 shrink-0">
          <SelectField
            label="Game genre"
            value={genre}
            onChange={setGenre}
            options={[
              { value: "all", label: "All genres" },
              ...[...new Set(games.map((game) => game.genre))].sort().map((value) => ({ value, label: value }))
            ]}
          />
        </div>
      </CatalogToolbar>
      <CatalogGrid examples>
        {filtered.map((game) => (
          <CatalogCard
            key={game.id}
            name={game.name}
            description={game.description}
            image={`/examples/${game.id}.webp`}
            engine={game.engine}
            dimension={game.dimension}
            genre={game.genre}
          />
        ))}
      </CatalogGrid>
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">No games match your filters.</p>
          <Button
            variant="link"
            onClick={() => {
              setSearch("")
              setDimension("all")
              setGenre("all")
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </section>
  )
}
