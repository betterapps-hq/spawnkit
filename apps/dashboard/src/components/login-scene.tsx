import { useEffect, useRef, type CSSProperties } from "react"

const heights = [
  0, 0, 1, 1, 0, 0, 0, 0, 1, 2, 1, 1, 0, 0, 1, 2, 2, 1, 1, 1, 0, 1, 1, 1, 4, 2, 1, 1, 1, 1, 1, 2, 2, 2, 1, 0, 0, 1, 1,
  2, 1, 0, 0, 0, 0, 1, 1, 0, 0
]

// Separate, adjacent-tile loops reserve space for each character at every phase.
// Patrols and pickups share a clock; hops clear the taller tile before moving sideways.
const patrols = [
  { color: "hero", tiles: [24, 25, 32, 31], duration: 14, offset: 0 },
  { color: "rose", tiles: [9, 10, 3, 2], duration: 12, offset: 0 },
  { color: "mint", tiles: [21, 22, 29, 28], duration: 14, offset: 4 },
  { color: "gold", tiles: [26, 27, 34, 33], duration: 16, offset: 8 }
] as const

function tilePosition(tile: number) {
  return {
    x: `${(tile % 7) * 59 + 10}px`,
    y: `${Math.floor(tile / 7) * 59 + 10}px`,
    z: `${heights[tile]! * 18 + 1}px`
  }
}

export function LoginScene() {
  const sceneRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const targets = Array.from(
      scene.querySelectorAll<HTMLElement>(".login-character-face, .login-tile-floating, .login-spark")
    )
    let frame: number | null = null
    let pointer = { x: 0, y: 0 }

    function reset() {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      for (const property of ["--tilt-x", "--tilt-y", "--orbit-x", "--orbit-y"]) scene!.style.removeProperty(property)
      for (const target of targets)
        for (const property of ["--look-x", "--look-y", "--hover-lift", "--nudge-x", "--nudge-y"])
          target.style.removeProperty(property)
    }

    function update() {
      frame = null
      if (motion.matches) return
      // Read all positions before writing styles, and update at most once per frame.
      const bounds = scene!.getBoundingClientRect()
      const positions = targets.map((target) => {
        const box = target.getBoundingClientRect()
        const x = pointer.x - box.left - box.width / 2
        const y = pointer.y - box.top - box.height / 2
        const distance = Math.hypot(x, y)
        return { target, x, y, distance, influence: Math.max(0, 1 - distance / 240) }
      })
      const x = (pointer.x - bounds.left) / bounds.width - 0.5
      const y = (pointer.y - bounds.top) / bounds.height - 0.5
      scene!.style.setProperty("--tilt-x", `${x * 10}deg`)
      scene!.style.setProperty("--tilt-y", `${y * -8}deg`)
      scene!.style.setProperty("--orbit-x", `${x * -14}px`)
      scene!.style.setProperty("--orbit-y", `${y * -10}px`)
      for (const { target, x, y, distance, influence } of positions) {
        if (target.classList.contains("login-character-face")) {
          target.style.setProperty("--look-x", `${Math.max(-1, Math.min(1, x / 70)) * influence * 3}px`)
          target.style.setProperty("--look-y", `${Math.max(-1, Math.min(1, y / 70)) * influence * 2}px`)
        } else if (target.classList.contains("login-tile-floating")) {
          target.style.setProperty("--hover-lift", `${influence * 14}px`)
        } else {
          target.style.setProperty("--nudge-x", `${(-x / (distance || 1)) * influence * 22}px`)
          target.style.setProperty("--nudge-y", `${(-y / (distance || 1)) * influence * 22}px`)
        }
      }
    }

    function move(event: PointerEvent) {
      if (event.pointerType === "touch" || motion.matches) return
      pointer = { x: event.clientX, y: event.clientY }
      if (frame === null) frame = requestAnimationFrame(update)
    }

    scene.addEventListener("pointermove", move)
    scene.addEventListener("pointerleave", reset)
    scene.addEventListener("pointercancel", reset)
    motion.addEventListener("change", reset)
    window.addEventListener("blur", reset)
    return () => {
      reset()
      scene.removeEventListener("pointermove", move)
      scene.removeEventListener("pointerleave", reset)
      scene.removeEventListener("pointercancel", reset)
      motion.removeEventListener("change", reset)
      window.removeEventListener("blur", reset)
    }
  }, [])

  return (
    <aside ref={sceneRef} className="login-scene relative hidden overflow-hidden lg:grid" aria-hidden="true">
      <div className="login-aurora" />
      <div className="login-grid" />
      <div className="login-orbit login-orbit-outer" />
      <div className="login-orbit login-orbit-inner" />
      <div className="login-world">
        {heights.map((height, index) => (
          <div
            key={index}
            className={`login-tile ${index === 24 ? "login-tile-spawn" : ""} ${[16, 17, 23].includes(index) ? "login-tile-water" : ""} ${height ? "" : "login-tile-floating"}`}
            style={
              {
                "--height": `${height * 18}px`,
                "--float-delay": `${index * -0.7}s`,
                "--float-duration": `${5 + (index % 4)}s`
              } as CSSProperties
            }
          >
            {[8, 12, 35, 40].includes(index) && (
              <span className="login-tree">
                <span />
              </span>
            )}
          </div>
        ))}
        {patrols.map(({ color, tiles, duration, offset }) => (
          <div
            className="login-patrol"
            key={color}
            data-patrol={color === "hero" ? undefined : color}
            data-character={color}
            style={
              {
                "--patrol-duration": `${duration}s`,
                "--patrol-delay": `${-offset}s`,
                ...Object.fromEntries(
                  tiles.flatMap((tile, stop) => [
                    ...Object.entries(tilePosition(tile)).map(([axis, value]) => [`--${axis}${stop}`, value]),
                    [`--hop${stop}`, `${Math.max(heights[tile]!, heights[tiles[(stop + 1) % 4]!]!) * 18 + 19}px`]
                  ])
                )
              } as CSSProperties
            }
          >
            {(color === "hero" ? [] : [1, 3]).map((stop) => {
              const position = tilePosition(tiles[stop]!)
              return (
                <span
                  key={stop}
                  className="login-pickup"
                  data-stop={stop}
                  style={
                    {
                      transform: `translate3d(${position.x}, ${position.y}, ${position.z})`,
                      "--pickup-delay": `${-offset - (stop === 3 ? duration / 2 : 0)}s`
                    } as CSSProperties
                  }
                >
                  <span className="login-pickup-item">
                    <span className="login-gem" />
                  </span>
                  <span className="login-pickup-burst" />
                </span>
              )
            })}
            <div className={color === "hero" ? "login-hero-route" : "login-enemy-route"}>
              <span className="login-character-shadow" />
              <span
                className={`login-character ${color === "hero" ? "login-hero" : `login-enemy login-enemy-${color}`}`}
              >
                <span className="login-character-face">
                  <i />
                  <i />
                </span>
                {color === "hero" && <span className="login-hero-scarf" />}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="login-world-shadow" />
      <span className="login-spark login-spark-one" />
      <span className="login-spark login-spark-two" />
      <span className="login-spark login-spark-three" />
    </aside>
  )
}
