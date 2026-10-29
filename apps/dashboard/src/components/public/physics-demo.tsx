import { CircleDot, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { createPhysicsWorld } from "./physics-world"
import { useDeferredEnhancement } from "./use-deferred-enhancement"
import "./scenes.css"

type PhysicsWorld = Awaited<ReturnType<typeof createPhysicsWorld>>
export function PhysicsDemo() {
  const host = useRef<HTMLElement>(null)
  const enhanced = useDeferredEnhancement(host)
  const world = useRef<PhysicsWorld | null>(null)
  const [status, setStatus] = useState("loading")
  useEffect(() => {
    const element = host.current
    if (!element || !enhanced) return
    let disposed = false
    void import("./physics-world")
      .then(({ createPhysicsWorld }) => {
        if (disposed) return null
        return createPhysicsWorld(element, () => {
          if (!disposed) setStatus("settled")
        })
      })
      .then((instance) => {
        if (!instance) return
        if (disposed) {
          instance.dispose()
          return
        }
        world.current = instance
        setStatus("ready")
      })
      .catch(() => {
        if (!disposed) setStatus("unavailable")
      })
    return () => {
      disposed = true
      world.current?.dispose()
      world.current = null
    }
  }, [enhanced])
  return (
    <div className="physics-demo" data-state={status}>
      <div className="c-course-label">
        <CircleDot size={15} />
        Rapier 3D marble course
      </div>
      <figure
        className="physics-host"
        ref={host}
        aria-label="Interactive Rapier 3D marble course with a ramp, guard rails, and collision posts"
      >
        {(status === "loading" || status === "unavailable") && (
          <svg className="mk-physics-fallback c-course-fallback" viewBox="0 0 600 320" aria-hidden="true">
            <path d="M50 205L230 110L555 210L380 305Z" fill="#383244" stroke="#8e7aaa" strokeWidth="5" />
            <path d="M120 125L210 80L410 160L320 207Z" fill="#b7a0db" stroke="#745f98" strokeWidth="5" />
            <path d="M120 125V220M210 80V170M320 207V275" stroke="#6c5b86" strokeWidth="12" />
            <ellipse cx="455" cy="232" rx="35" ry="18" stroke="#d7b877" strokeWidth="3" fill="none" />
            <circle cx="198" cy="113" r="17" fill="#a98be9" />
            <circle cx="248" cy="134" r="17" fill="#77d1bb" />
            <circle cx="299" cy="154" r="17" fill="#edbe76" />
          </svg>
        )}
      </figure>
      <div className="physics-toolbar">
        <Button
          variant="outline"
          disabled={status === "loading" || status === "unavailable"}
          onClick={() => {
            setStatus("falling")
            world.current?.drop()
          }}
        >
          <RotateCcw size={13} />
          Release marbles
        </Button>
        <span aria-live="polite">
          {status === "loading"
            ? "Loading physics…"
            : status === "unavailable"
              ? "Static physics preview"
              : status === "falling"
                ? "Gravity + collisions"
                : "Rapier 3D"}
        </span>
      </div>
    </div>
  )
}
