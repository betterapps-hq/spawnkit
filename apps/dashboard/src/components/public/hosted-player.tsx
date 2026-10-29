import { useEffect, useRef, useState } from "react"
import type { PublishedGame } from "@/lib/publishing"
import { Button } from "../ui/button"
import "./publishing.css"

export function HostedPlayer({ game, onPlay }: { game: PublishedGame; onPlay?: () => void }) {
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const played = useRef(false)
  const callback = useRef(onPlay)
  useEffect(() => {
    callback.current = onPlay
  }, [onPlay])
  const [error, setError] = useState("")
  useEffect(() => {
    const play = () => {
      if (played.current) return
      played.current = true
      callback.current?.()
    }
    // Games can report a start explicitly. Older games count their first focus/interaction.
    const message = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        event.origin === new URL(game.url).origin &&
        event.data?.type === "spawnkit:play"
      )
        play()
    }
    let frameId = 0
    const focus = () => {
      frameId = requestAnimationFrame(() => {
        if (document.activeElement === frame.current) play()
      })
    }
    window.addEventListener("message", message)
    window.addEventListener("blur", focus)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener("message", message)
      window.removeEventListener("blur", focus)
    }
  }, [game.url])
  async function fullscreen() {
    setError("")
    try {
      if (stage.current?.requestFullscreen) await stage.current.requestFullscreen()
      else setError("Fullscreen is unavailable in this browser. Use Open game instead.")
    } catch {
      setError("Fullscreen could not open. Use Open game instead.")
    }
  }
  return (
    <section className="hosted-player" aria-label={`${game.title} player`}>
      <div ref={stage} className="hosted-stage">
        <iframe
          ref={frame}
          title={game.title}
          src={game.url}
          sandbox="allow-scripts allow-same-origin"
          allow="fullscreen; gamepad"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="hosted-toolbar">
        <strong>{game.title}</strong>
        <div>
          <Button variant="outline" size="sm" onClick={() => void fullscreen()}>
            Fullscreen
          </Button>
          <a onClick={onPlay} href={game.url} target="_blank" rel="noopener noreferrer">
            Open game ↗
          </a>
        </div>
      </div>
      {error && <output className="hosted-error">{error}</output>}
    </section>
  )
}
