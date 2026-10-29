import { Cloud, GitBranch, GitPullRequest } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { CloudWorld } from "./cloud-world"
import { useDeferredEnhancement } from "./use-deferred-enhancement"
import "./scenes.css"

const environments = [
  {
    name: "Preview",
    title: "Pull request preview",
    icon: GitPullRequest,
    detail: "Preview isolates a change before it is merged."
  },
  { name: "Staging", title: "Staging", icon: GitBranch, detail: "Staging tests changes separately from production." },
  { name: "Production", title: "Production", icon: Cloud, detail: "Production serves your published release." }
]
export function CloudScene() {
  const [environment, setEnvironment] = useState("Production")
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const host = useRef<HTMLElement>(null)
  const enhanced = useDeferredEnhancement(host)
  const world = useRef<CloudWorld | null>(null)
  const selected = useRef(environment)
  useEffect(() => {
    const element = host.current
    if (!element || !enhanced) return
    let disposed = false
    void import("./cloud-world")
      .then(({ createCloudWorld }) => {
        if (disposed) return
        world.current = createCloudWorld(element)
        world.current.select(selected.current)
        setReady(true)
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })
    return () => {
      disposed = true
      world.current?.dispose()
      world.current = null
    }
  }, [enhanced])
  return (
    <div className="p-cloud-scene env-scene" data-environment={environment} data-ready={ready}>
      <div className="env-heading">
        <span>Release environments</span>
      </div>
      <figure
        className="env-scene-host"
        ref={host}
        aria-label="3D release path from a pull request preview through staging to production"
      >
        {!ready && <div className="env-loading">{failed ? "Environments unavailable" : "Loading environments…"}</div>}
      </figure>
      <div className="env-controls" aria-label="Cloud environment">
        {environments.map(({ name, icon: Icon }) => (
          <Button
            key={name}
            variant="ghost"
            aria-pressed={environment === name}
            onClick={() => {
              setEnvironment(name)
              selected.current = name
              world.current?.select(name)
            }}
          >
            <Icon size={14} />
            {name}
          </Button>
        ))}
      </div>
      <p className="env-scene-status" aria-live="polite">
        {environments.find((item) => item.name === environment)?.detail}
      </p>
    </div>
  )
}
