import { ArrowRight, Check, ExternalLink, Gamepad2, Globe2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ManagedPlatform } from "./managed-platform"
import { CloudPricing } from "./pricing-page"
import { ReleaseWalkthrough } from "./release-walkthrough"
import { PublicShell } from "./shell"
import "./marketing.css"
import "./cloud-marketing.css"

export function CloudPage() {
  return (
    <PublicShell active="/cloud">
      <div className="mk-page mk-cloud">
        <div className="mk-container">
          <section className="mk-hero">
            <div className="mk-hero-copy">
              <span className="mk-kicker">
                <Globe2 size={15} /> SPAWNKIT CLOUD
              </span>
              <h1>
                Bring your game <em>to players.</em>
              </h1>
              <p>
                Publish your browser game with free single-player hosting, source builds, and release controls. Build
                locally with your preferred AI agent, then share a playable game with your players.
              </p>
              <div className="mk-actions">
                <Button asChild size="lg">
                  <a href="/dashboard">Open dashboard</a>
                </Button>
                <a href="#pricing" className="mk-secondary">
                  See pricing <ArrowRight size={16} />
                </a>
              </div>
            </div>
            <div className="mk-cloud-cover" aria-label="Orchard Trail deployment illustration">
              <div className="mk-browser-bar">
                <Gamepad2 size={16} />
                <span>
                  <Globe2 size={12} /> orchard-trail.spawnkit.games
                </span>
                <ExternalLink size={13} />
              </div>
              <div className="mk-cloud-art">
                <img src="/examples/snake.webp" alt="Orchard Trail game artwork" fetchPriority="high" />
                <div>
                  <span>PRODUCTION</span>
                  <strong>Orchard Trail</strong>
                </div>
              </div>
              <div className="mk-deploy-card">
                <span className="mk-deploy-icon">
                  <Check size={23} />
                </span>
                <div>
                  <strong>Checkpoint fix deployed</strong>
                  <span>Version 1.2 is now live for players.</span>
                </div>
              </div>
            </div>
          </section>
          <section className="mk-cloud-section" aria-labelledby="release-heading">
            <div className="mk-section-heading">
              <div>
                <span className="mk-eyebrow">MANAGED DEVELOPMENT & DELIVERY</span>
                <h2 id="release-heading">
                  Less infrastructure to manage.
                  <br />
                  More time to make your game.
                </h2>
              </div>
            </div>
            <ReleaseWalkthrough />
          </section>
          <ManagedPlatform />
          <CloudPricing />
          <section className="mk-finale mk-cloud-finale">
            <div>
              <h2>Start with a free single-player game.</h2>
              <p>Create a project, connect your workflow, and publish when you’re ready.</p>
            </div>
            <div className="mk-finale-actions">
              <Button asChild size="lg">
                <a href="/dashboard">Open dashboard</a>
              </Button>
              <a href="/templates" className="mk-secondary">
                Start with a kit <ArrowRight size={16} />
              </a>
            </div>
          </section>
        </div>
      </div>
    </PublicShell>
  )
}
