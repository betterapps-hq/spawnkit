import { colyseusServices } from "@spawn/templates/catalog"
import {
  Activity,
  ArrowRight,
  Braces,
  Check,
  GitBranch,
  GitPullRequest,
  Globe2,
  Radio,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CloudScene } from "./cloud-scene"
import { CloudPricing } from "./pricing-page"
import { CreatorBanner, PublicShell } from "./shell"

const releaseSteps = [
  {
    name: "Build",
    icon: Braces,
    title: "Your source becomes a versioned release.",
    description:
      "Publish from the CLI or connect your GitHub workflow. Isolated builds keep the output tied to the source that produced it.",
    detail: "Hosted builds are awaiting platform activation."
  },
  {
    name: "Preview",
    icon: GitPullRequest,
    title: "Review changes in a separate preview.",
    description:
      "Try a change in its own preview. Review a link, test the gameplay, and keep unfinished ideas away from production.",
    detail: "Managed GitHub previews are in development."
  },
  {
    name: "Stage",
    icon: GitBranch,
    title: "Test against a staging environment.",
    description:
      "An optional Sandbox separates staging from production. Test changes against the right configuration before promoting a release.",
    detail: "Sandbox adds $5/month plus usage when activated."
  },
  {
    name: "Release",
    icon: Globe2,
    title: "Promote or roll back a release.",
    description:
      "Promote the tested build, keep its history, and roll back a release when you need to. Promotion changes the build, not your players’ saved data.",
    detail: "Static release promotion and rollback are implemented."
  }
]
export function CloudPage() {
  const [step, setStep] = useState(0)
  return (
    <PublicShell active="/cloud">
      <div className="p-container">
        <section className="p-cloud-hero">
          <div>
            <span className="p-pill">
              <span className="p-live-dot" /> SPAWNKIT CLOUD · EARLY ACCESS
            </span>
            <h1>
              Game hosting.
              <br />
              <span className="p-accent">From build to release.</span>
            </h1>
            <p>
              Host your web game with versioned releases and rollback. Add separate testing environments and follow the
              progress of managed Colyseus services.
            </p>
            <div className="p-hero-actions">
              <Button asChild>
                <a href="/dashboard" className="p-button">
                  Open your dashboard <ArrowRight size={18} />
                </a>
              </Button>
              <a href="#pricing" className="p-text-link">
                Explore pricing <ArrowRight size={17} />
              </a>
            </div>
            <div className="p-proof-line">
              <Check size={14} /> Free frontend-only production hosting
            </div>
          </div>
          <CloudScene />
        </section>
        <section className="p-cloud-benefits">
          <div>
            <Globe2 />
            <span>One link to your game</span>
          </div>
          <div>
            <ShieldCheck />
            <span>Separate environments</span>
          </div>
          <div>
            <RotateCcw />
            <span>Release rollback</span>
          </div>
          <div>
            <Activity />
            <span>Errors, logs & events</span>
          </div>
        </section>
        <section className="p-section">
          <div className="p-section-heading">
            <div>
              <h2>Test changes before they reach players</h2>
            </div>
            <p>Explore the deployment workflow and current availability.</p>
          </div>
          <Tabs className="p-release-demo" value={String(step)} onValueChange={(value) => setStep(Number(value))}>
            <TabsList className="p-release-tabs" aria-label="Deployment pipeline">
              {releaseSteps.map(({ name, icon: Icon }, index) => (
                <TabsTrigger key={name} value={String(index)}>
                  <span>0{index + 1}</span>
                  <Icon size={21} />
                  {name}
                  <ArrowRight size={17} />
                </TabsTrigger>
              ))}
            </TabsList>
            {releaseSteps.map(({ name, title, description, detail, icon: Icon }, index) => (
              <TabsContent key={name} value={String(index)} className="p-release-content">
                <div className="p-release-icon">
                  <Icon size={45} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="p-availability-note">{detail}</span>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>
        <section className="p-multiplayer">
          <div>
            <h2>Multiplayer with Colyseus</h2>
            <p>
              Colyseus brings authoritative game servers, synchronized rooms, and matchmaking. SpawnKit’s managed
              integration is in development, so your next multiplayer idea has a clear place to go.
            </p>
            <a href="https://docs.colyseus.io/" target="_blank" rel="noreferrer" className="p-text-link">
              Explore Colyseus <ArrowRight size={17} />
            </a>
            <div className="p-server-tags">
              <span>
                <Radio size={14} /> State synchronization
              </span>
              <span>
                <Server size={14} /> Game rooms
              </span>
            </div>
          </div>
          <div
            className="p-room-illustration"
            aria-label="Illustration of four clients connected to one Colyseus game room"
          >
            <div className="p-room-grid" />
            <div className="p-room-center">
              <Server size={31} />
              <b>Colyseus</b>
              <span>One shared world</span>
            </div>
            {["YOU", "PLAYER 2", "PLAYER 3", "PLAYER 4"].map((name, index) => (
              <div key={name} className={`p-room-player player-${index}`}>
                <span>{["✳", "✦", "◆", "●"][index]}</span>
                <small>{name}</small>
              </div>
            ))}
            <span className="p-illustration-caption">MULTIPLAYER ARCHITECTURE · ILLUSTRATION</span>
          </div>
        </section>
        <section className="p-services">
          <div className="p-section-heading">
            <div>
              <h2>Player accounts, saves, and leaderboards</h2>
            </div>
            <Badge variant="outline" className="p-tag">
              Managed services · coming soon
            </Badge>
          </div>
          <div className="p-services-grid">
            {colyseusServices.slice(0, 4).map((service, index) => (
              <a key={service.id} href={service.source} target="_blank" rel="noreferrer">
                <span className="p-service-number">0{index + 1}</span>
                <h3>
                  {service.name}
                  <ArrowRight size={16} />
                </h3>
                <p>{service.description}</p>
              </a>
            ))}
          </div>
          <p className="p-collection-note">
            Official Colyseus capabilities. Selecting services in a project saves your configuration; it does not
            activate a hosted backend.
          </p>
        </section>
        <section className="p-ai-section">
          <div className="p-ai-console">
            <header>
              <Activity size={16} /> ISSUE CONTEXT <span>ILLUSTRATIVE</span>
            </header>
            <div className="p-issue">
              <span className="p-issue-dot" />
              <div>
                <b>Player falls through the platform</b>
                <small>Collision update · level-02</small>
              </div>
              <span>Open</span>
            </div>
            <div className="p-ai-thread">
              <Sparkles size={22} />
              <div>
                <b>Investigate with release and session context</b>
                <p>Error, release, session, and nearby events — together in a structured investigation.</p>
                <code>issue → context → proposed fix → test</code>
              </div>
            </div>
            <div className="p-ai-footer">
              <ShieldCheck size={14} /> You review the change. Your tests check the fix.
            </div>
          </div>
          <div>
            <h2>Debug with your AI editor</h2>
            <p>
              SpawnKit telemetry collects consented errors, logs, and game events. Bring that context into your AI
              coding workflow to investigate issues and work toward a fix.
            </p>
            <p>AI investigation tools are in development. Fixes still need your review and a test run.</p>
            <a href="/templates" className="p-text-link">
              Add telemetry to your starter <ArrowRight size={17} />
            </a>
          </div>
        </section>
        <CloudPricing />
        <CreatorBanner />
      </div>
    </PublicShell>
  )
}
