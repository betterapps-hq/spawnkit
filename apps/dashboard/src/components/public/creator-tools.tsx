import { ArrowRight, Code2, Layers3, ShieldCheck } from "lucide-react"
import { CreatorChecks } from "./creator-checks"
import { PhysicsDemo } from "./physics-demo"
import "./creator-workbench.css"

export function CreatorTools() {
  return (
    <section id="creator-tools" className="c-tools-section" aria-labelledby="creator-tools-heading">
      <div className="c-tools-intro">
        <span className="mk-eyebrow">THE TOOLS BEHIND YOUR GAME</span>
        <h2 id="creator-tools-heading">
          A game development stack,
          <br />
          handpicked by experts.
        </h2>
        <p>
          Spend your time making the game. We select tools that work well together and configure them around your
          engine, from fast local previews to physics and automated testing.
        </p>
        <div className="c-foundation-tools" aria-label="Included development tools">
          <span>
            <Code2 size={15} />
            <strong>TypeScript</strong>Catch type errors
          </span>
          <span>
            <Code2 size={15} />
            <strong>Vite</strong>Preview changes locally
          </span>
          <span>
            <ShieldCheck size={15} />
            <strong>Oxlint + Oxfmt</strong>Keep code consistent
          </span>
        </div>
      </div>
      <article className="c-workbench-row c-physics-workbench">
        <div className="c-workbench-copy">
          <span className="mk-feature-label">
            <Layers3 size={17} />
            PHYSICS
          </span>
          <h3>Build movement that feels right.</h3>
          <p>
            Add a physics engine compatible with your game. Gravity, friction, and collision detection turn movement
            rules into objects that roll down ramps, bounce, and come to rest.
          </p>
          <p>
            Try the Rapier 3D course. Each marble is a rigid body interacting with the track, barriers, and other
            marbles.
          </p>
          <a className="mk-secondary" href="/templates?engine=babylon">
            Choose your physics tools <ArrowRight size={16} />
          </a>
        </div>
        <div className="c-physics-stage">
          <PhysicsDemo />
        </div>
      </article>
      <article className="c-workbench-row c-testing-workbench">
        <div className="c-workbench-copy">
          <span className="mk-feature-label">
            <ShieldCheck size={17} />
            REGRESSION PROTECTION
          </span>
          <h3>
            Make changes.
            <br />
            Keep the game working.
          </h3>
          <p>
            Add unit testing baselines for game logic and browser tests for real player interactions. Run them after a
            change to catch regressions before they reach your players.
          </p>
          <p>
            Your preferred AI agent can use the same checks while editing the standalone source. A failing test points
            to a specific behavior to investigate.
          </p>
          <a className="mk-secondary" href="/templates">
            Add tests to your kit <ArrowRight size={16} />
          </a>
        </div>
        <CreatorChecks />
      </article>
    </section>
  )
}
