import { RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { createPhysicsWorld } from "./physics-world"
import "./scenes.css"

type PhysicsWorld = Awaited<ReturnType<typeof createPhysicsWorld>>
export function PhysicsDemo() {
  const host = useRef<HTMLElement>(null)
  const world = useRef<PhysicsWorld | null>(null)
  const [status, setStatus] = useState("loading")
  useEffect(() => {
    const element = host.current
    if (!element) return
    let disposed = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        void import("./physics-world")
          .then(({ createPhysicsWorld }) =>
            createPhysicsWorld(element, () => {
              if (!disposed) setStatus("settled")
            })
          )
          .then((instance) => {
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
      },
      { rootMargin: "100px" }
    )
    observer.observe(element)
    return () => {
      disposed = true
      observer.disconnect()
      world.current?.dispose()
      world.current = null
    }
  }, [])
  return (
    <div className="physics-demo" data-state={status}>
      <figure
        className="physics-host"
        ref={host}
        aria-label="Interactive Rapier 3D physics scene with three objects and a solid platform"
      />
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
          Drop objects
        </Button>
        <span aria-live="polite">
          {status === "loading"
            ? "Loading physics…"
            : status === "unavailable"
              ? "Physics unavailable"
              : status === "falling"
                ? "Gravity + collisions"
                : "Rapier 3D"}
        </span>
      </div>
    </div>
  )
}
