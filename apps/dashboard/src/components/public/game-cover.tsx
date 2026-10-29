import { useEffect, useRef, useState, type ReactNode } from "react"
import type { PublishedGame } from "@/lib/publishing"

export function GameCover({
  game,
  className = "published-art",
  children
}: {
  game: PublishedGame
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={className}>
      <GameCoverLink game={game}>{children}</GameCoverLink>
    </div>
  )
}

/** Shared by catalog and ranking cards; request video only after hover intent. */
export function GameCoverLink({
  game,
  className,
  label = `Play ${game.title}`,
  priority = false,
  children
}: {
  game: PublishedGame
  className?: string
  label?: string
  priority?: boolean
  children?: ReactNode
}) {
  const [preview, setPreview] = useState(false)
  const [requested, setRequested] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const area = useRef<HTMLAnchorElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  function stop() {
    setPreview(false)
    setReady(false)
  }
  function release() {
    stop()
    setRequested(false)
  }
  useEffect(() => {
    if (!requested || preview) return
    // Keep the decoder and buffered frames for another hover, then reclaim them.
    const timer = setTimeout(release, 30_000)
    return () => clearTimeout(timer)
  }, [requested, preview])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) release()
    }
    const motion = matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)")
    const preference = () => {
      if (!motion.matches) release()
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) release()
    })
    if (area.current) observer.observe(area.current)
    document.addEventListener("visibilitychange", hidden)
    motion.addEventListener("change", preference)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", hidden)
      motion.removeEventListener("change", preference)
    }
  }, [])
  useEffect(() => {
    const element = video.current
    if (element && game.trailerUrl && !element.getAttribute("src")) element.src = game.trailerUrl
    return () => {
      if (!element) return
      element.pause()
      element.removeAttribute("src")
      element.load()
    }
  }, [requested, game.trailerUrl])
  useEffect(() => {
    const element = video.current
    if (!element) return
    if (!preview) {
      element.pause()
      return
    }
    let active = true
    void element.play().catch(() => {
      if (active) {
        setFailed(true)
        release()
      }
    })
    return () => {
      active = false
      element.pause()
    }
  }, [preview, game.trailerUrl])
  return (
    <a
      ref={area}
      className={className}
      href={`/play/${game.projectId}`}
      aria-label={label}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") stop()
      }}
      onPointerEnter={(event) => {
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
        if (
          event.pointerType !== "mouse" ||
          !game.trailerUrl ||
          failed ||
          connection?.saveData ||
          !matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches
        )
          return
        // Explicit intent should not wait for unrelated images or an idle callback.
        setRequested(true)
        setPreview(true)
      }}
    >
      {game.coverUrl && !imageFailed ? (
        <img
          src={game.coverUrl}
          alt=""
          width={960}
          height={540}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "low"}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="published-placeholder">{game.title.slice(0, 1).toUpperCase()}</span>
      )}
      {requested && game.trailerUrl && (
        <video
          key={game.trailerUrl}
          src={game.trailerUrl}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className={preview && ready ? "preview-ready" : ""}
          ref={video}
          onPlaying={() => {
            if (preview) setReady(true)
          }}
          onError={() => {
            setFailed(true)
            release()
          }}
        />
      )}
      {children}
    </a>
  )
}
