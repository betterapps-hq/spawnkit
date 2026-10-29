import { colyseusServices } from "@spawn/templates/catalog"
import {
  ArrowRight,
  ChartNoAxesCombined,
  CloudDownload,
  ExternalLink,
  Radio,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  StickyNote,
  Trophy,
  UserRound
} from "lucide-react"
import { useState, type CSSProperties } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlaybackControls, useCloudPlayback } from "./cloud-playback"
import { ServicePreview } from "./service-previews"
import "./cloud-scenes.css"
import "./service-previews.css"

const serviceVisuals = {
  auth: {
    icon: UserRound,
    label: "Accounts",
    heading: "Keep the same player across sessions."
  },
  saves: {
    icon: CloudDownload,
    label: "Cloud saves",
    heading: "Pick up from the last checkpoint."
  },
  leaderboards: {
    icon: Trophy,
    label: "Leaderboards",
    heading: "Give a great run a place on the board."
  },
  configs: {
    icon: SlidersHorizontal,
    label: "Live config",
    heading: "Tune the game without a new build."
  },
  analytics: {
    icon: ChartNoAxesCombined,
    label: "Analytics",
    heading: "Understand the events in a player’s journey."
  },
  moderation: {
    icon: ShieldCheck,
    label: "Moderation",
    heading: "Give moderators the access they need."
  },
  notes: {
    icon: StickyNote,
    label: "Player notes",
    heading: "Keep useful context for player support."
  }
}

export function ManagedPlatform() {
  const [selected, setSelected] = useState("saves")
  const { ref, ...playback } = useCloudPlayback(1, 60000, 0)
  return (
    <section id="multiplayer" className="mk-managed-platform" aria-labelledby="multiplayer-heading">
      <div className="mk-multiplayer">
        <div>
          <span className="mk-eyebrow">
            <Radio size={15} /> MULTIPLAYER <span className="mk-outline-pill">Coming soon</span>
          </span>
          <h2 id="multiplayer-heading">
            Build the multiplayer.
            <br />
            We’ll run the servers.
          </h2>
          <p>
            Colyseus gives your game rooms, matchmaking, synchronized state, and reconnection. SpawnKit will manage the
            servers and environments it runs on, with managed game services for the player features around your game.
          </p>
          <a className="mk-secondary" href="#pricing">
            Explore multiplayer pricing <ArrowRight size={16} />
          </a>
        </div>
        <div
          ref={ref}
          className="mk-services-universe"
          data-running={playback.running}
          aria-label="Managed game services orbiting a Colyseus game server"
        >
          <div className="mk-universe-controls">
            <PlaybackControls playback={playback} label="services orbit" replay={false} />
          </div>
          <div className="mk-services-orbit" aria-hidden="true" />
          <div className="mk-room-core">
            <Server size={30} />
            <strong>Colyseus</strong>
            <span>Game server</span>
          </div>
          {colyseusServices.map((service, index) => {
            const { icon: Icon, label } = serviceVisuals[service.id]
            return (
              <div
                className="mk-service-satellite"
                data-service={service.id}
                key={service.id}
                style={{ "--angle": `${(index * 360) / colyseusServices.length}deg` } as CSSProperties}
              >
                <Button
                  variant="ghost"
                  className="mk-satellite-button"
                  aria-label={`Explore ${service.name}`}
                  aria-pressed={selected === service.id}
                  onClick={() => setSelected(service.id)}
                >
                  <Icon size={25} />
                </Button>
                <span>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div id="services" className="mk-managed-services" aria-labelledby="services-heading">
        <div className="mk-services-intro">
          <span className="mk-eyebrow">
            INCLUDED WITH MULTIPLAYER <span className="mk-outline-pill">Coming soon</span>
          </span>
          <h3 id="services-heading">Managed game services</h3>
          <p>
            Cloud saves, leaderboards, player accounts, and more, without building each backend yourself. Add them to
            single-player for $5/month, or get them in the multiplayer bundle.
          </p>
        </div>
        <Tabs value={selected} onValueChange={setSelected} className="mk-service-browser">
          <TabsList aria-label="Managed game services" className="mk-service-tabs">
            {colyseusServices.map((service) => {
              const { icon: Icon, label } = serviceVisuals[service.id]
              return (
                <TabsTrigger key={service.id} value={service.id} data-service={service.id}>
                  <Icon size={15} />
                  {label}
                </TabsTrigger>
              )
            })}
          </TabsList>
          {colyseusServices.map((service) => {
            const { icon: Icon, heading } = serviceVisuals[service.id]
            return (
              <TabsContent value={service.id} key={service.id} className="mk-service-detail" data-service={service.id}>
                <div>
                  <span className="mk-service-detail-icon">
                    <Icon size={24} />
                  </span>
                  <h4>{service.name}</h4>
                  <p>
                    {service.description} {heading}
                  </p>
                  <a className="mk-secondary" href={service.source} target="_blank" rel="noreferrer">
                    Explore the service <ExternalLink size={13} />
                  </a>
                </div>
                <ServicePreview service={service.id} />
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </section>
  )
}
