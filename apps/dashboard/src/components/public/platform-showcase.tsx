import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function PlatformShowcase() {
  return (
    <section className="p-platform-showcase" aria-labelledby="platform-title">
      <div className="p-section-heading">
        <h2 id="platform-title">Choose where your game runs</h2>
      </div>
      <div className="p-device-grid">
        <article className="p-device-card">
          <div className="p-device-stage" aria-hidden="true">
            <div className="p-device p-browser-device">
              <div className="p-browser-chrome">
                <i />
                <i />
                <i />
                <span>your-game.spawnkit.cloud</span>
              </div>
              <img src="/examples/platformer-3d.webp" alt="" loading="lazy" />
              <div className="p-device-game-title">
                Tiny Treasures <span>Browser game</span>
              </div>
            </div>
          </div>
          <div className="p-device-description">
            <h3>Web games</h3>
            <p>Share a link. Play in a browser.</p>
            <a href="/templates" className="p-text-link">
              Build for the web <ArrowRight size={16} />
            </a>
          </div>
        </article>
        <article className="p-device-card">
          <div className="p-device-stage" aria-hidden="true">
            <div className="p-device p-laptop-device">
              <div className="p-laptop-screen">
                <i className="p-camera" />
                <div className="p-desktop-toolbar">
                  <span>Alpine Rally</span>
                  <span>− · ×</span>
                </div>
                <img src="/examples/racing.webp" alt="" loading="lazy" />
              </div>
              <div className="p-laptop-base">
                <span />
              </div>
            </div>
          </div>
          <div className="p-device-description">
            <h3>Desktop games</h3>
            <p>Native builds for desktop.</p>
            <Badge variant="outline" className="p-tag">
              Coming soon
            </Badge>
          </div>
        </article>
        <article className="p-device-card">
          <div className="p-device-stage" aria-hidden="true">
            <div className="p-device p-phone-device">
              <div className="p-phone-screen">
                <img src="/examples/snake.webp" alt="" loading="lazy" />
                <span className="p-phone-island" />
                <span className="p-phone-clock">9:41</span>
                <div className="p-phone-game">
                  Orchard
                  <br />
                  Trail<span>Tap to play</span>
                </div>
                <span className="p-phone-home" />
              </div>
              <i className="p-phone-button" />
            </div>
          </div>
          <div className="p-device-description">
            <h3>Mobile apps</h3>
            <p>Native projects for mobile.</p>
            <Badge variant="outline" className="p-tag">
              Coming soon
            </Badge>
          </div>
        </article>
      </div>
      <p className="p-collection-note">
        Device previews use concept artwork. Native desktop and mobile templates are in development.
      </p>
    </section>
  )
}
