import { useMediaQuery } from "@mantine/hooks"
import { Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useDeferredEnhancement } from "./use-deferred-enhancement"

export function useCloudPlayback(frames: number, interval = 1400, stillFrame = frames - 1) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", true)
  const ref = useRef<HTMLDivElement>(null)
  const enhanced = useDeferredEnhancement(ref)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [paused, setPaused] = useState(false)
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), {
      threshold: 0.15
    })
    observer.observe(element)
    const onVisibility = () => setPageVisible(!document.hidden)
    onVisibility()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])
  const running = enhanced && visible && pageVisible && !paused && !reducedMotion
  useEffect(() => {
    if (!running || frames <= 1) return
    const timer = window.setInterval(() => setFrame((value) => (value + 1) % frames), interval)
    return () => window.clearInterval(timer)
  }, [frames, interval, running])
  return {
    ref,
    running,
    paused,
    reducedMotion,
    frame: reducedMotion ? stillFrame : frame,
    toggle: () => setPaused((value) => !value),
    replay: () => {
      setFrame(0)
      setPaused(false)
    }
  }
}

export function PlaybackControls({
  playback,
  label,
  replay = true
}: {
  playback: Omit<ReturnType<typeof useCloudPlayback>, "ref">
  label: string
  replay?: boolean
}) {
  if (playback.reducedMotion) return null
  return (
    <div className="mk-playback-controls">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={playback.toggle}
        aria-label={`${playback.paused ? "Play" : "Pause"} ${label} animation`}
      >
        {playback.paused ? <Play size={14} /> : <Pause size={14} />}
      </Button>
      {replay && (
        <Button variant="ghost" size="icon-sm" onClick={playback.replay} aria-label={`Replay ${label} animation`}>
          <RotateCcw size={14} />
        </Button>
      )}
    </div>
  )
}
