import { ArrowLeft, ArrowRight, Gamepad2, Globe2, MessageSquare, Play } from "lucide-react"
import { useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { publicGames, type PublicGame } from "@/lib/game-discovery"
import { CopyButton } from "../copy-button"
import { Arcade } from "./arcade"
import { GameCommunity } from "./game-community"
import { GameCard } from "./games-page"
import { PublicShell } from "./shell"

const subscribe = () => () => {}

export function GamePage({ game }: { game: PublicGame }) {
  const [playing, setPlaying] = useState(false)
  const url = useSyncExternalStore(
    subscribe,
    () => window.location.href,
    () => ""
  )
  return (
    <PublicShell active="/">
      <div className="p-container p-game-page">
        <a href="/#games" className="p-text-link">
          <ArrowLeft size={16} /> Back to discovery
        </a>
        <div className="p-game-title">
          <div>
            <span className="p-eyebrow">
              {game.genre.toUpperCase()} · {game.playable ? "FREE BROWSER DEMO" : "GAME CONCEPT"}
            </span>
            <h1>{game.name}</h1>
          </div>
          <div className="p-game-actions">
            <a href="#community" className="p-text-link">
              <MessageSquare size={16} />
              Ratings & comments
            </a>
            <CopyButton
              className="p-button p-button-outline"
              value={url}
              label="Copy game link"
              success="Game link copied"
              disabled={!url}
            />
          </div>
        </div>
        <div className="p-game-detail-layout">
          <div>
            {playing ? (
              <Arcade game={game.id} />
            ) : (
              <div className="p-game-cover">
                <img src={`/examples/${game.id}.webp`} alt={`${game.name} concept artwork`} width="960" height="540" />
                <div className="p-cover-overlay">
                  {game.playable ? (
                    <Button className="p-button" onClick={() => setPlaying(true)}>
                      <Play size={18} fill="currentColor" /> Play demo
                    </Button>
                  ) : (
                    <Button asChild>
                      <a href={`/templates?engine=${game.engine}`} className="p-button">
                        Build with{" "}
                        {game.engine === "three"
                          ? "Three.js"
                          : game.engine === "babylon"
                            ? "Babylon.js"
                            : game.engine === "phaser"
                              ? "Phaser"
                              : "PixiJS"}
                        <ArrowRight size={18} />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="p-game-description">
              <h2>{game.playable ? "About this game" : "About this concept"}</h2>
              <p>{game.description}</p>
              <p className="p-collection-note">
                {game.playable
                  ? "Free browser demo. Cover artwork is illustrative. The starter kit includes a separate minimal scene for building your own game."
                  : "This is an illustrated game concept, not a playable release. The linked starter kit is a minimal engine project; it does not include this game or its artwork."}
              </p>
              {game.playable && (
                <div className="p-instructions">
                  <b>How to play</b>
                  <p>
                    {game.id === "snake"
                      ? "Use the arrow keys, WASD, or on-screen buttons to collect fruit. Don’t hit a wall or your own trail."
                      : game.id === "breakout"
                        ? "Move with your mouse, touch, or left/right arrows. Keep the ball in play and clear all the bricks."
                        : "Move with your mouse, touch, or left/right arrows. Your ship fires automatically. Hit incoming ships and avoid collisions."}{" "}
                    Press Space to pause while the game is focused.
                  </p>
                </div>
              )}
            </div>
          </div>
          <aside className="p-game-build-card">
            <span className="p-kit-icon">
              <Gamepad2 size={27} />
            </span>

            <h2>Build with this engine</h2>
            <p>Download a free starter project. Add your own mechanics, physics, and tests in your AI editor.</p>
            <Button asChild>
              <a href={`/templates?engine=${game.engine}`} className="p-button">
                Get the starter kit <ArrowRight size={17} />
              </a>
            </Button>
            <div>
              <Globe2 size={15} /> Free web starter kit
            </div>
          </aside>
        </div>
        <GameCommunity key={game.id} gameId={game.id} playable={game.playable} />
        <section className="p-section">
          <div className="p-section-heading">
            <h2>More games to play</h2>
            <a href="/#games" className="p-text-link">
              All games <ArrowRight size={17} />
            </a>
          </div>
          <div className="p-related-games">
            {publicGames
              .filter((entry) => entry.playable && entry.id !== game.id)
              .map((entry) => (
                <GameCard key={entry.id} game={entry} />
              ))}
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
