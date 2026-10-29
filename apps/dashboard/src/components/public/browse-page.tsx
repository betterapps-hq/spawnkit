import { browseHref } from "@/lib/browse"
import type { BrowseGames } from "@/lib/publishing"
import { GameCover } from "./game-cover"
import { PublicShell } from "./shell"
import "./kit-page.css"

export function BrowsePage({ catalog, genre }: { catalog: BrowseGames; genre?: string }) {
  const path = genre ? `/categories/${genre.toLowerCase()}` : "/browse"
  const pages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize))
  return (
    <PublicShell active="/">
      <div className="p-container kit-page">
        <nav aria-label="Breadcrumb">
          <a href="/">Discover games</a>
          {genre && (
            <>
              {" "}
              / <a href="/browse">All games</a>
            </>
          )}
        </nav>
        <h1>
          {genre ? `${genre} browser games` : "Browse all browser games"}
          {catalog.page > 1 ? ` — Page ${catalog.page}` : ""}
        </h1>
        <p>
          {genre
            ? `Explore ${genre.toLowerCase()} games you can play directly in your browser. Choose a game to see its description and start playing.`
            : "Explore the complete catalog of free browser games. Open a game to read about it and play without a download."}
        </p>
        <p>
          {catalog.total} {catalog.total === 1 ? "game" : "games"} · Page {catalog.page} of {pages}
        </p>
        {catalog.categories.length > 0 && (
          <nav className="kit-actions" aria-label="Game categories">
            {catalog.categories.map((category) => (
              <a key={category.slug} href={`/categories/${category.slug}`}>
                {category.genre} ({category.total})
              </a>
            ))}
          </nav>
        )}
        <div className="p-games-grid">
          {catalog.games.map((game) => (
            <article key={game.projectId} className="p-game-card">
              <GameCover game={game} className="published-art p-game-art">
                <h2>{game.title}</h2>
              </GameCover>
              <p>{game.description}</p>
            </article>
          ))}
        </div>
        {catalog.total === 0 && <p>New games will appear here when they are ready to play.</p>}
        <nav className="kit-actions" aria-label="Catalog pages">
          {catalog.page > 1 && (
            <a rel="prev" href={browseHref(path, catalog.page - 1)}>
              Previous page
            </a>
          )}
          {catalog.page < pages && (
            <a rel="next" href={browseHref(path, catalog.page + 1)}>
              Next page
            </a>
          )}
        </nav>
        <p>
          Want to make your own? <a href="/templates">Choose a game starter kit</a>.
        </p>
      </div>
    </PublicShell>
  )
}
