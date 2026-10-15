import {
  Activity,
  ArrowRight,
  Box,
  Check,
  Code2,
  ExternalLink,
  GitBranch,
  Globe2,
  Layers3,
  Radio,
  Server,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
                A home for your browser game, with source builds, versioned releases, and the controls to decide what
                goes live next.
              </p>
              <div className="mk-actions">
                <Button asChild size="lg">
                  <a href="/dashboard">
                    Open dashboard <ArrowRight size={17} />
                  </a>
                </Button>
                <a href="#pricing" className="mk-secondary">
                  See pricing <ArrowRight size={16} />
                </a>
              </div>
              <div className="mk-reassurance">
                <span>
                  <Check size={14} /> Free frontend-only production hosting
                </span>
              </div>
            </div>
            <div className="mk-cloud-cover" aria-label="Illustration of a versioned game release">
              <div className="mk-browser-bar">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <Globe2 size={12} /> your-game.spawnkit.cloud
                </span>
                <ExternalLink size={13} />
              </div>
              <div className="mk-cloud-art">
                <img src="/examples/snake.webp" alt="Orchard Trail game artwork" fetchPriority="high" />
                <div>
                  <span>YOUR NEXT ADVENTURE</span>
                  <strong>
                    One game.
                    <br />A link to its world.
                  </strong>
                </div>
              </div>
              <div className="mk-deploy-card">
                <span className="mk-deploy-icon">
                  <Box size={23} />
                </span>
                <div>
                  <small>VERSIONED RELEASE</small>
                  <strong>Your game, ready to open.</strong>
                  <span className="mk-inline-flow">
                    Source <ArrowRight size={12} aria-hidden="true" /> Build <ArrowRight size={12} aria-hidden="true" />{" "}
                    Game URL
                  </span>
                </div>
                <Check size={20} />
              </div>
              <span className="mk-cloud-sticker">
                <GitBranch size={16} /> A version you can come back to
              </span>
            </div>
          </section>
          <div className="mk-value-strip">
            <span>
              <Code2 size={20} /> Source builds
            </span>
            <span>
              <Box size={20} /> Immutable releases
            </span>
            <span>
              <GitBranch size={20} /> Environment controls
            </span>
            <span>
              <Activity size={20} /> Errors & logs
            </span>
          </div>
          <section className="mk-cloud-section" aria-labelledby="release-heading">
            <div className="mk-section-heading">
              <div>
                <span className="mk-eyebrow">FROM BUILD TO RELEASE</span>
                <h2 id="release-heading">
                  Every release has a story.
                  <br />
                  Keep the whole thing together.
                </h2>
              </div>
              <p>
                Follow a game from source
                <br />
                to its next playable version.
              </p>
            </div>
            <ReleaseWalkthrough />
          </section>
          <section className="mk-platform-section" aria-labelledby="platform-heading">
            <div className="mk-platform-copy">
              <span className="mk-eyebrow">A PLACE FOR THE WHOLE PICTURE</span>
              <h2 id="platform-heading">
                Know what’s running.
                <br />
                <em>And what comes next.</em>
              </h2>
              <p>
                The source, built artifact, environment, and release history belong to one project. Open a version,
                inspect its build, or follow an error back to the release it came from.
              </p>
              <ul>
                <li>
                  <Globe2 size={18} />
                  <div>
                    <strong>A URL for your game</strong>
                    <span>Share your project’s SpawnKit address with players.</span>
                  </div>
                </li>
                <li>
                  <GitBranch size={18} />
                  <div>
                    <strong>Room to try the next version</strong>
                    <span>An optional Sandbox keeps staging separate from production.</span>
                  </div>
                </li>
                <li>
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Infrastructure managed by the platform</strong>
                    <span>Your project connects the build and hosting workflow.</span>
                  </div>
                </li>
              </ul>
              <a href="/dashboard" className="mk-secondary">
                Explore your dashboard <ArrowRight size={16} />
              </a>
            </div>
            <div className="mk-project-illustration" aria-label="Illustration of a project release overview">
              <header>
                <span className="mk-project-avatar">✳</span>
                <div>
                  <strong>Orchard Trail</strong>
                  <span>Project overview</span>
                </div>
                <span className="mk-outline-pill">Release view</span>
              </header>
              <div className="mk-project-environments">
                <div>
                  <Globe2 size={18} />
                  <span>
                    Production<strong>v1.2</strong>
                    <small>Published artifact</small>
                  </span>
                  <span className="mk-status-dot" />
                </div>
                <div>
                  <GitBranch size={18} />
                  <span>
                    Sandbox<strong>v1.3</strong>
                    <small>Next version to test</small>
                  </span>
                  <span className="mk-status-dot mk-status-lilac" />
                </div>
              </div>
              <div className="mk-project-timeline">
                <span>RELEASE HISTORY</span>
                {["v1.3 ready to inspect", "v1.2 current production", "v1.1 retained release"].map((label, index) => (
                  <p key={label}>
                    <span>{index === 0 ? <Box size={14} /> : <Check size={14} />}</span>
                    {label}
                  </p>
                ))}
              </div>
              <footer>
                <Box size={14} /> One artifact. The environment you choose.
              </footer>
            </div>
          </section>
          <section className="mk-observability" aria-labelledby="observability-heading">
            <div className="mk-log-window">
              <header>
                <Activity size={16} /> ERROR CONTEXT <span>Example event</span>
              </header>
              <div className="mk-log-error">
                <span>!</span>
                <div>
                  <strong>Collision update failed</strong>
                  <small>TypeError in level-02</small>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Release</dt>
                  <dd>v1.2</dd>
                </div>
                <div>
                  <dt>Environment</dt>
                  <dd>production</dd>
                </div>
                <div>
                  <dt>Session</dt>
                  <dd>session-42</dd>
                </div>
              </dl>
              <div className="mk-breadcrumb">
                <span>Nearby events</span>
                <code className="mk-inline-flow">
                  level.started <ArrowRight size={12} aria-hidden="true" /> checkpoint.reached{" "}
                  <ArrowRight size={12} aria-hidden="true" /> error
                </code>
              </div>
              <footer>
                <ShieldCheck size={14} /> Capture starts with consent.
              </footer>
            </div>
            <div>
              <span className="mk-eyebrow">KEEP MAKING IT BETTER</span>
              <h2>
                Give a bug report
                <br />
                <em>some context.</em>
              </h2>
              <p>
                Connect configured errors, logs, and game events to a release and session. Use that context to
                investigate in your editor, including with your AI coding tools.
              </p>
              <p className="mk-small-copy">You choose what to change. Your tests help check the fix.</p>
              <a href="/templates" className="mk-secondary">
                Add telemetry to your starter <ArrowRight size={16} />
              </a>
            </div>
          </section>
          <CloudPricing />
          <section id="multiplayer" className="mk-multiplayer" aria-labelledby="multiplayer-heading">
            <div>
              <span className="mk-eyebrow">
                <Radio size={15} /> THE NEXT CHAPTER <span className="mk-outline-pill">Coming soon</span>
              </span>
              <h2 id="multiplayer-heading">
                More players.
                <br />
                One shared world.
              </h2>
              <p>
                Managed multiplayer is being built around Colyseus: game rooms and synchronized state, with a runtime
                for your players to connect to.
              </p>
              <a className="mk-secondary" href="https://docs.colyseus.io/" target="_blank" rel="noreferrer">
                Explore Colyseus <ArrowRight size={16} />
              </a>
              <div id="services" className="mk-services-note">
                <Layers3 size={18} />
                <div>
                  <strong>Game services, too</strong>
                  <p>
                    Planned single-player services use supported official Colyseus capabilities. Managed services and
                    paid runtime activation are coming soon.
                  </p>
                </div>
              </div>
            </div>
            <div className="mk-room" aria-label="Four players connecting to one Colyseus game room">
              <div className="mk-room-orbit" />
              <div className="mk-room-core">
                <Server size={30} />
                <strong>Colyseus</strong>
                <span>One game room</span>
              </div>
              {["YOU", "PLAYER 2", "PLAYER 3", "PLAYER 4"].map((player, index) => (
                <div className={`mk-player mk-player-${index}`} key={player}>
                  <span>{["✳", "✦", "◆", "●"][index]}</span>
                  <small>{player}</small>
                </div>
              ))}
            </div>
          </section>
          <section className="mk-finale mk-cloud-finale">
            <div>
              <span className="mk-eyebrow">YOUR GAME’S NEXT CHAPTER</span>
              <h2>Give your next release a home.</h2>
              <p>Start with your project. Keep building from there.</p>
            </div>
            <div className="mk-finale-actions">
              <Button asChild size="lg">
                <a href="/dashboard">
                  Open dashboard <ArrowRight size={17} />
                </a>
              </Button>
              <a href="/templates" className="mk-secondary">
                Still building? Create a starter kit <ArrowRight size={16} />
              </a>
            </div>
          </section>
        </div>
      </div>
    </PublicShell>
  )
}
