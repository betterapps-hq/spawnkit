import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowLeft, ArrowUpRight, LoaderCircle, Maximize, RotateCw, WifiOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { PublicShell } from "./shell"
import "./publishing.css"
import "./player-loading-preview.css"

type PlayerState = "loading" | "slow" | "failed" | "retrying" | "ready"
// A design preview only. The production iframe does not infer readiness from its load event.
function PlayerLoadingPreview({ state }: { state: PlayerState }) {
  const [current, setCurrent] = useState(state)
  const stage = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (current !== "retrying") return
    const timer = setTimeout(() => setCurrent("ready"), 2200)
    return () => clearTimeout(timer)
  }, [current])
  const failed = current === "failed"
  const copy = {
    loading: ["Getting your game ready", "A little adventure is on its way."],
    slow: ["Taking a little longer", "Still connecting. You can give it another try."],
    failed: ["Couldn't load this game", "Your connection may have dropped. Let's try again."],
    retrying: ["Trying again", "Reconnecting to Orchard Snake…"],
    ready: ["You're back in the game", "Playable game would appear here."]
  }[current]
  return (
    <PublicShell active="/">
      <div className="p-container publishing-page">
        <header className="player-preview-heading">
          <a href="/" className="all-games-link player-preview-back">
            <ArrowLeft size={16} aria-hidden="true" /> All games
          </a>
          <div className="player-preview-identity">
            <h1>Orchard Snake</h1>
            <div className="p-game-tags" aria-label="Game categories">
              <span>Arcade</span>
              <span>2D</span>
            </div>
          </div>
        </header>
        <section className="hosted-player" aria-label="Orchard Snake player preview">
          <div ref={stage} className={`hosted-stage player-preview-stage is-${current}`}>
            <img className="player-preview-backdrop" src="/examples/snake.webp" alt="" />
            <div className="player-preview-shade" />
            <div className="player-preview-content" role={failed ? "alert" : "status"} aria-live="polite">
              <div className="player-preview-icon">
                {failed ? (
                  <WifiOff size={27} />
                ) : current === "ready" ? (
                  <span aria-hidden="true">✓</span>
                ) : (
                  <LoaderCircle size={28} className="player-preview-spinner" />
                )}
              </div>
              <h2>{copy[0]}</h2>
              <p>{copy[1]}</p>
              {(failed || current === "slow") && (
                <div className="player-preview-actions">
                  <Button onClick={() => setCurrent("retrying")}>
                    <RotateCw size={16} /> Try again
                  </Button>
                  <Button variant="ghost" asChild>
                    <a href="https://spawn-snake.spawnkit.games/" target="_blank" rel="noopener noreferrer">
                      Open game <ArrowUpRight size={16} />
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <span className="player-preview-title">ORCHARD SNAKE</span>
          </div>
          <div className="hosted-toolbar">
            <strong>Orchard Snake</strong>
            <Button variant="outline" size="sm" onClick={() => void stage.current?.requestFullscreen()}>
              <Maximize size={15} /> Fullscreen
            </Button>
          </div>
        </section>
        <section className="player-preview-about" aria-labelledby="player-preview-about-title">
          <h2 id="player-preview-about-title">About this game</h2>
          <p>One more bite. Collect apples and grow your snake through a sunny orchard.</p>
        </section>
      </div>
    </PublicShell>
  )
}
const meta = {
  title: "Public site/Player loading",
  component: PlayerLoadingPreview,
  args: { state: "loading" },
  render: (args) => <PlayerLoadingPreview key={args.state} {...args} />,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Design for approval only. Retry simulates recovery; no game or account requests are made. Production needs a verified ready handshake and a timeout because iframe load events do not prove a game loaded successfully."
      }
    }
  }
} satisfies Meta<typeof PlayerLoadingPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Loading: Story = {}
export const TakingLonger: Story = { args: { state: "slow" } }
export const Failed: Story = { args: { state: "failed" } }
export const Retry: Story = { args: { state: "failed" } }
