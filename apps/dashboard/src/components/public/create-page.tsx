import {
  ArrowDown,
  ArrowRight,
  Box,
  Check,
  CheckCheck,
  Code2,
  FileCode2,
  FlaskConical,
  GitBranch,
  Layers3,
  Play,
  ShieldCheck,
  Terminal
} from "lucide-react"
import { useState, type PointerEvent } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CopyButton } from "../copy-button"
import { CloudScene } from "./cloud-scene"
import { PlatformShowcase } from "./platform-showcase"
import { PublicShell } from "./shell"
import "./creator.css"

const engines = [
  {
    id: "pixi",
    name: "PixiJS",
    dimension: "2D renderer",
    image: "snake",
    title: "Orchard Trail",
    physics: "Rapier 2D",
    description: "A lightweight renderer for custom 2D mechanics."
  },
  {
    id: "phaser",
    name: "Phaser",
    dimension: "2D game engine",
    image: "platformer-2d",
    title: "Clockwork Courier",
    physics: "Arcade / Matter",
    description: "Scenes, sprites, and physics in a complete 2D framework."
  },
  {
    id: "babylon",
    name: "Babylon.js",
    dimension: "3D game engine",
    image: "platformer-3d",
    title: "Tiny Treasures",
    physics: "Havok",
    description: "A complete 3D engine with scene, lighting, and rendering tools."
  },
  {
    id: "three",
    name: "Three.js",
    dimension: "3D renderer",
    image: "racing",
    title: "Alpine Rally",
    physics: "Rapier 3D",
    description: "Flexible 3D rendering for custom worlds and interactions."
  }
]
const checks = {
  unit: {
    title: "Game logic",
    tool: "Vitest",
    text: "Check movement, boundaries, and simulation behavior before a change becomes a release.",
    files: ["movement.test.ts", "bounds.test.ts", "simulation.test.ts"]
  },
  browser: {
    title: "Player interactions",
    tool: "Playwright",
    text: "Run the game in a real browser and check that keyboard input moves your player.",
    files: ["Open game in Chromium", "Move with keyboard input", "Verify the player collects an item"]
  }
}
function tilt(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty("--tilt-x", `${((event.clientY - rect.top) / rect.height - 0.5) * -7}deg`)
  event.currentTarget.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - 0.5) * 9}deg`)
}
function untilt(event: PointerEvent<HTMLDivElement>) {
  event.currentTarget.style.setProperty("--tilt-x", "0deg")
  event.currentTarget.style.setProperty("--tilt-y", "0deg")
}
export function CreatePage() {
  const [engineId, setEngineId] = useState("babylon")
  const [check, setCheck] = useState<"unit" | "browser">("unit")
  const [gravity, setGravity] = useState(0)
  const engine = engines.find((item) => item.id === engineId)!
  const selectedCheck = checks[check]
  const starter = `/templates?engine=${engine.id}`
  const command = `pnpm cli init ../my-game --add ${engine.id},vitest`
  return (
    <PublicShell active="/create">
      <div className="c-page">
        <div className="p-container">
          <section className="c-hero">
            <div className="c-hero-copy">
              <h1>
                Turn your idea
                <br />
                into a <span>playable game.</span>
              </h1>
              <p>
                Start with a working project. Your engine, physics, and tests, connected and ready for you and your AI
                editor.
              </p>
              <div className="c-hero-actions">
                <Button asChild size="lg">
                  <a href={starter}>
                    Build your starter kit <ArrowRight />
                  </a>
                </Button>
                <a className="c-demo-link" href="/?availability=playable#games">
                  <Play size={15} /> Play the demos
                </a>
              </div>
              <div className="c-ownership">
                <Check size={14} /> Free starter kits
                <span />
                Your source code
              </div>
              <a className="c-explore-link" href="#creator-tools">
                <span>
                  <ArrowDown size={16} />
                </span>{" "}
                Explore what’s included
              </a>
            </div>
            <div
              className="c-scene"
              onPointerMove={tilt}
              onPointerLeave={untilt}
              aria-label={`${engine.name} starter kit illustration`}
            >
              <div className="c-scene-glow" />
              <div className="c-scene-grid" />
              <div className="c-scene-inner">
                <div className="c-orbit-ring" />
                <div className="c-orbit-ring c-orbit-second" />
                <div className="c-stage-floor">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="c-game-window">
                  <div className="c-window-bar">
                    <span className="c-window-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>my-game · development</span>
                    <Box size={13} />
                  </div>
                  <div className="c-game-screen" key={engine.id}>
                    <img
                      src={`/examples/${engine.image}.webp`}
                      alt={`${engine.title} concept artwork`}
                      fetchPriority="high"
                    />
                    <div className="c-game-screen-shade" />
                    <div className="c-screen-title">
                      <span>{engine.dimension}</span>
                      <strong>{engine.title}</strong>
                    </div>
                    <span className="c-screen-play">
                      <Play size={20} fill="currentColor" />
                    </span>
                  </div>
                  <div className="c-window-bottom">
                    <Code2 size={12} />
                    <span>TypeScript</span>
                    <span>Vite</span>
                    <span className="c-preview-label">Concept preview</span>
                  </div>
                </div>
                <div className="c-source-card">
                  <header>
                    <FileCode2 size={15} /> Your project <span>.ts</span>
                  </header>
                  <div>
                    <span>src/</span>
                    <p>
                      ├─ game.ts
                      <br />
                      ├─ input.ts
                      <br />
                      └─ simulation.ts
                    </p>
                  </div>
                  <footer>
                    <CheckCheck size={13} /> Source included
                  </footer>
                </div>
                <div className="c-engine-block" key={`engine-${engine.id}`}>
                  <img src={`/engines/${engine.id}.${engine.id === "phaser" ? "png" : "svg"}`} alt="" />
                  <span>{engine.name}</span>
                </div>
                <div className="c-physics-callout">
                  <div className="c-orb c-orb-one" />
                  <div className="c-orb c-orb-two" />
                  <div>
                    <strong>{engine.physics}</strong>
                    <span>Compatible physics</span>
                  </div>
                </div>
                <div className="c-test-callout">
                  <span>
                    <ShieldCheck size={19} />
                  </span>
                  <div>
                    <strong>Test your changes</strong>
                    <span>Vitest + Playwright</span>
                  </div>
                </div>
                <div className="c-scene-cube">
                  <Box size={30} />
                </div>
              </div>
            </div>
          </section>
          <section className="c-engine-picker" aria-label="Preview a starter engine">
            <div className="c-engine-picker-heading">
              <h2>Choose your starting point</h2>
              <p>Four engines. The same development workflow.</p>
            </div>
            <Tabs value={engineId} onValueChange={setEngineId}>
              <TabsList className="c-engine-tabs" aria-label="Preview engine">
                {engines.map((item) => (
                  <TabsTrigger key={item.id} value={item.id}>
                    <img src={`/engines/${item.id}.${item.id === "phaser" ? "png" : "svg"}`} alt="" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.dimension}</small>
                    </span>
                    <ArrowRight size={15} />
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="c-engine-detail">
              <p key={engine.id}>{engine.description}</p>
              <a href={starter}>
                Build with {engine.name}
                <ArrowRight size={15} />
              </a>
            </div>
            <p className="c-art-note">Artwork shows game concepts. Starter kits include a minimal working scene.</p>
          </section>
          <section className="c-tools" id="creator-tools">
            <div className="c-section-title">
              <h2>
                Less time setting up.
                <br />
                <span>More time building your game.</span>
              </h2>
              <p>
                Choose the parts you need.
                <br />
                They arrive in one working project.
              </p>
            </div>
            <div className="c-bento-grid">
              <article className="c-physics-card">
                <div className="c-card-copy">
                  <span className="c-feature-icon">
                    <Layers3 size={20} />
                  </span>
                  <h3>Physics you can build on.</h3>
                  <p>Add collisions and gravity with a physics engine that works with your renderer.</p>
                  <a href={starter}>
                    Choose your physics <ArrowRight size={16} />
                  </a>
                </div>
                <div className="c-physics-stage" aria-hidden="true">
                  <div className="c-physics-grid" />
                  <div className="c-physics-plinth" />
                  <div key={gravity} className={`c-physics-objects ${gravity ? "is-dropping" : ""}`}>
                    <div className="c-solid-ball" />
                    <div className="c-solid-cube">
                      <Box size={40} />
                    </div>
                    <div className="c-solid-ring" />
                  </div>
                  <div className="c-axis">
                    <span>Y</span>
                    <i />
                    <span>X</span>
                  </div>
                </div>
                <Button variant="outline" className="c-replay" onClick={() => setGravity(gravity + 1)}>
                  <Play size={13} /> Preview gravity
                </Button>
              </article>
              <article className="c-source-feature">
                <div className="c-source-visual" aria-hidden="true">
                  <div className="c-file-tile tile-back">{}</div>
                  <div className="c-file-tile tile-middle">
                    <Code2 />
                  </div>
                  <div className="c-file-tile tile-front">
                    <span>TS</span>
                  </div>
                </div>
                <div className="c-card-copy">
                  <h3>Your code. Your editor.</h3>
                  <p>
                    A standalone TypeScript project. Edit locally with your preferred AI tools and keep the complete
                    source.
                  </p>
                  <span className="c-feature-note">
                    <Check size={14} /> TypeScript · Vite · Oxlint · Oxfmt
                  </span>
                </div>
              </article>
              <article className="c-checks-card">
                <div className="c-checks-copy">
                  <span className="c-feature-icon">
                    <FlaskConical size={20} />
                  </span>
                  <h3>Check each change.</h3>
                  <p>
                    Add tests for game behavior and player interactions. Give your AI changes a repeatable way to prove
                    they work.
                  </p>
                </div>
                <div className="c-checks-preview">
                  <Tabs value={check} onValueChange={(value) => setCheck(value as "unit" | "browser")}>
                    <TabsList aria-label="Testing layers">
                      <TabsTrigger value="unit">Unit tests</TabsTrigger>
                      <TabsTrigger value="browser">Browser tests</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="c-check-content" key={check}>
                    <div>
                      <strong>{selectedCheck.title}</strong>
                      <span>{selectedCheck.tool}</span>
                    </div>
                    <p>{selectedCheck.text}</p>
                    {selectedCheck.files.map((file) => (
                      <span className="c-check-file" key={file}>
                        <FileCode2 size={14} />
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </section>
          <section className="c-command-section">
            <div className="c-command-copy">
              <Terminal size={28} />
              <h2>
                A project in
                <br />
                one command.
              </h2>
              <p>
                The same builder, from your terminal. Select your engine and tools, then generate a standalone project.
              </p>
              <a href={starter}>
                Or use the visual builder <ArrowRight size={16} />
              </a>
            </div>
            <div className="c-terminal-shell">
              <div className="c-terminal-depth" />
              <div className="c-terminal-panel">
                <header>
                  <span className="c-window-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>SpawnKit CLI</span>
                  <Terminal size={14} />
                </header>
                <div className="c-command-line">
                  <span>$</span>
                  <code>{command}</code>
                </div>
                <div className="c-terminal-files">
                  <p>
                    <Check size={14} />
                    <span>Engine</span>
                    <b>{engine.name}</b>
                  </p>
                  <p>
                    <Check size={14} />
                    <span>Language</span>
                    <b>TypeScript</b>
                  </p>
                  <p>
                    <Check size={14} />
                    <span>Quality tools</span>
                    <b>Oxlint + Oxfmt</b>
                  </p>
                  <p>
                    <Check size={14} />
                    <span>Tests</span>
                    <b>Vitest</b>
                  </p>
                </div>
                <div className="c-command-bottom">
                  <span>Example output · runs from this repository</span>
                  <CopyButton value={command} label="Copy CLI command" variant="outline" size="sm" />
                </div>
              </div>
            </div>
          </section>
          <PlatformShowcase />
          <section className="c-cloud-finale">
            <div>
              <span className="c-feature-icon">
                <GitBranch size={22} />
              </span>
              <h2>
                Deploy. Test.
                <br />
                <span>Release with confidence.</span>
              </h2>
              <p>
                Versioned releases, separate environments, and rollback. Managed Colyseus servers and player services
                are in development.
              </p>
              <Button asChild size="lg">
                <a href="/cloud">
                  Explore Cloud & pricing <ArrowRight />
                </a>
              </Button>
            </div>
            <CloudScene />
          </section>
        </div>
      </div>
    </PublicShell>
  )
}
