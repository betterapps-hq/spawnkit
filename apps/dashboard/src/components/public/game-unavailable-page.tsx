import { PublicShell } from "./shell"

export function GameUnavailablePage() {
  return (
    <PublicShell active="/">
      <div className="p-container p-info-page">
        <h1>Game temporarily unavailable</h1>
        <p>We could not load this game's details. Please try again shortly.</p>
        <a href="/" className="p-text-link">
          Browse games
        </a>
      </div>
    </PublicShell>
  )
}
