import { Box, Check, Cloud, Database, GitBranch, Globe2, Radio, Server } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function CloudScene() {
  const [environment, setEnvironment] = useState("Production")
  return (
    <div className="p-cloud-scene" data-environment={environment}>
      <div className="p-scene-grid" aria-hidden="true" />
      <div className="p-scene-caption">
        <span className="p-live-dot" /> ENVIRONMENTS<span>ILLUSTRATION</span>
      </div>
      <div className="p-cloud-orbit" aria-hidden="true">
        <span className="p-orbit orbit-one" />
        <span className="p-orbit orbit-two" />
        <div className="p-cloud-platform platform-bottom" />
        <div className="p-cloud-platform platform-middle">
          <span />
          <span />
          <span />
        </div>
        <div className="p-cloud-platform platform-top">
          <Box />
        </div>
        <div className="p-orbit-node node-database">
          <Database />
        </div>
        <div className="p-orbit-node node-globe">
          <Globe2 />
        </div>
        <div className="p-orbit-node node-server">
          <Server />
        </div>
      </div>
      <div className="p-scene-label label-client">
        <Globe2 size={15} />
        <div>
          Web client<span>Browser game</span>
        </div>
        <Check size={14} />
      </div>
      <div className="p-scene-label label-server">
        <Radio size={15} />
        <div>
          Colyseus<span>Rooms & game services</span>
        </div>
      </div>
      <div className="p-environment-switch" aria-label="Illustrated cloud environment">
        {["Preview", "Staging", "Production"].map((name) => (
          <Button key={name} aria-pressed={environment === name} onClick={() => setEnvironment(name)}>
            {name === "Production" ? <Cloud size={13} /> : <GitBranch size={13} />}
            {name}
          </Button>
        ))}
      </div>
      <p className="p-scene-status">
        {environment === "Production"
          ? "Production serves your published release."
          : environment === "Staging"
            ? "Staging tests changes separately from production."
            : "Preview isolates a change before it is merged."}
      </p>
    </div>
  )
}
