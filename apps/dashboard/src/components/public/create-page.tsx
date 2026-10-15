import { ArrowRight, Check, Code2, FileCode2, FlaskConical, Layers3, Play, Terminal, Zap } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CopyButton } from "../copy-button"
import { PhysicsDemo } from "./physics-demo"
import { PlatformShowcase } from "./platform-showcase"
import { PublicShell } from "./shell"
import "./marketing.css"

const engines = [
  {
    id: "pixi",
    name: "PixiJS",
    dimension: "2D renderer",
    image: "snake",
    title: "Orchard Trail",
    description: "Keep it light. Build your own 2D mechanics with a fast, flexible renderer."
  },
  {
    id: "phaser",
    name: "Phaser",
    dimension: "2D game engine",
    image: "platformer",
    title: "Clockwork Courier",
    description: "Start with scenes, sprites, and physics. A complete toolkit for your next 2D game."
  },
  {
    id: "babylon",
    name: "Babylon.js",
    dimension: "3D game engine",
    image: "platformer-3d",
    title: "Tiny Treasures",
    description: "Build a world with a complete 3D engine, lighting, materials, and scene tools."
  },
  {
    id: "three",
    name: "Three.js",
    dimension: "3D renderer",
    image: "racing",
    title: "Alpine Rally",
    description: "Make 3D your own. Flexible rendering for custom worlds and interactions."
  }
]
const checks = {
  unit: {
    title: "Game logic",
    tool: "Vitest",
    files: ["Movement stays within bounds", "Simulation behaves consistently", "Game state changes as expected"]
  },
  browser: {
    title: "Player interactions",
    tool: "Playwright",
    files: ["Open game in Chromium", "Move with keyboard input", "Verify the player collects an item"]
  }
}
export function CreatePage() {
  const [engineId, setEngineId] = useState("babylon")
  const [check, setCheck] = useState<"unit" | "browser">("unit")
  const engine = engines.find((item) => item.id === engineId)!
  const starter = "/templates?engine=" + engine.id
  const command = "pnpm cli init ../my-game --add " + engine.id + ",vitest"
  return (
    <PublicShell active="/create">
      <div className="mk-page mk-creators">
        <div className="mk-container">
          <section className="mk-hero">
            <div className="mk-hero-copy">
              <span className="mk-kicker">
                <Zap size={15} /> A little spark. A whole new world.
              </span>
              <h1>
                Turn your idea into a <em>playable game.</em>
              </h1>
              <p>
                Your first level starts here. Choose an engine, add your tools, and get a working project you can make
                your own.
              </p>
              <div className="mk-actions">
                <Button asChild size="lg">
                  <a href={starter}>
                    Build your starter kit <ArrowRight size={17} />
                  </a>
                </Button>
                <a className="mk-secondary" href="/?availability=playable#games">
                  <Play size={15} /> Find a game
                </a>
              </div>
              <div className="mk-reassurance">
                <span>
                  <Check size={14} /> Free to start
                </span>
                <span>
                  <Check size={14} /> Your code, always
                </span>
              </div>
            </div>
            <div className="mk-game-cover">
              <img
                key={engine.id}
                src={"/examples/" + engine.image + ".webp"}
                alt={engine.title + " concept artwork"}
                fetchPriority="high"
              />
              <span className="mk-art-label">Imagine what you could make</span>
              <div className="mk-cover-title">
                <span>{engine.dimension}</span>
                <strong>{engine.title}</strong>
                <small>Concept artwork · starter kits begin with a simple playable scene</small>
              </div>
              <div className="mk-project-token">
                <span>
                  <Code2 size={22} />
                </span>
                <div>
                  <strong>Ready for your ideas</strong>
                  <small>TypeScript project · source included</small>
                </div>
                <Check size={18} />
              </div>
            </div>
          </section>

          <section className="mk-engine-section" aria-labelledby="engine-heading">
            <div className="mk-section-heading">
              <div>
                <span className="mk-eyebrow">01 / CHOOSE YOUR ENGINE</span>
                <h2 id="engine-heading">Every great game starts somewhere.</h2>
              </div>
              <p>
                Pick the tools that fit your idea.
                <br />
                We’ll handle getting them connected.
              </p>
            </div>
            <Tabs value={engineId} onValueChange={setEngineId}>
              <TabsList className="mk-engine-tabs" aria-label="Preview engine">
                {engines.map((item) => (
                  <TabsTrigger key={item.id} value={item.id}>
                    <span className="mk-engine-logo">
                      <img src={"/engines/" + item.id + (item.id === "phaser" ? ".png" : ".svg")} alt="" />
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.dimension}</small>
                    </span>
                    <ArrowRight size={17} />
                  </TabsTrigger>
                ))}
              </TabsList>
              {engines.map((item) => (
                <TabsContent key={item.id} value={item.id} className="mk-engine-description">
                  <p>{item.description}</p>
                  <a href={"/templates?engine=" + item.id}>
                    Build with {item.name} <ArrowRight size={16} />
                  </a>
                </TabsContent>
              ))}
            </Tabs>
          </section>

          <section className="mk-toolkit" id="creator-tools">
            <div className="mk-section-heading">
              <div>
                <span className="mk-eyebrow">02 / MAKE IT YOURS</span>
                <h2>The fun part starts sooner.</h2>
              </div>
              <p>
                Less setup between your idea
                <br />
                and that first “it works!” moment.
              </p>
            </div>
            <div className="mk-tool-grid">
              <article className="mk-physics-card c-physics-card">
                <div className="mk-card-copy">
                  <span className="mk-feature-label">
                    <Layers3 size={17} /> A world with a little weight
                  </span>
                  <h3>Give your game a feel.</h3>
                  <p>
                    Bounce, tumble, collide. Add compatible physics to your starter, then shape how your world behaves.
                  </p>
                </div>
                <PhysicsDemo />
              </article>
              <article className="mk-source-card">
                <div className="mk-card-copy">
                  <span className="mk-feature-label">
                    <Code2 size={17} /> Built to be yours
                  </span>
                  <h3>Your editor. Your imagination.</h3>
                  <p>
                    A standalone TypeScript project that works with your favorite editor and AI tools. Read the source,
                    change anything, and keep building.
                  </p>
                </div>
                <div className="mk-source-tree">
                  <div>
                    <FileCode2 size={16} />
                    <strong>my-game</strong>
                    <span>YOUR PROJECT</span>
                  </div>
                  <code>
                    src/
                    <br />
                    　game.ts
                    <br />
                    　input.ts
                    <br />
                    　simulation.ts
                  </code>
                  <footer>
                    <span>TypeScript</span>
                    <span>Vite</span>
                    <span>Oxlint + Oxfmt</span>
                  </footer>
                </div>
              </article>
              <article className="mk-checks-card">
                <div className="mk-card-copy">
                  <span className="mk-feature-label">
                    <FlaskConical size={17} /> Keep the good bits working
                  </span>
                  <h3>
                    Try things.
                    <br />
                    Then test them.
                  </h3>
                  <p>
                    Add repeatable checks for your game logic and real player interactions. Give each change a way to
                    prove itself.
                  </p>
                </div>
                <Tabs
                  value={check}
                  onValueChange={(value) => setCheck(value as "unit" | "browser")}
                  className="mk-test-panel"
                >
                  <TabsList aria-label="Testing layers">
                    <TabsTrigger value="unit">Unit tests</TabsTrigger>
                    <TabsTrigger value="browser">Browser tests</TabsTrigger>
                  </TabsList>
                  {Object.entries(checks).map(([id, item]) => (
                    <TabsContent value={id} key={id}>
                      <div className="mk-test-heading">
                        <strong>{item.title}</strong>
                        <span>{item.tool}</span>
                      </div>
                      {item.files.map((file) => (
                        <p key={file}>
                          <span className="mk-test-dot" />
                          {file}
                        </p>
                      ))}
                      <small>Checks included when you add the testing tools.</small>
                    </TabsContent>
                  ))}
                </Tabs>
              </article>
            </div>
          </section>

          <section className="mk-start-section">
            <div>
              <span className="mk-eyebrow">03 / START BUILDING</span>
              <h2>
                From “what if”
                <br />
                to your first commit.
              </h2>
              <p>
                Use the visual builder to choose your stack and download your project. Prefer the terminal? The local
                CLI uses the same starter kits.
              </p>
              <a className="mk-secondary" href={starter}>
                Open the visual builder <ArrowRight size={17} />
              </a>
            </div>
            <div className="mk-terminal">
              <header>
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <span>SpawnKit CLI</span>
                <Terminal size={16} />
              </header>
              <div className="c-command-line">
                <span>$</span>
                <code>{command}</code>
              </div>
              <div className="mk-terminal-summary">
                <span>
                  ENGINE<strong>{engine.name}</strong>
                </span>
                <span>
                  LANGUAGE<strong>TypeScript</strong>
                </span>
                <span>
                  TESTS<strong>Vitest</strong>
                </span>
              </div>
              <footer>
                <span>Run from the SpawnKit repository</span>
                <CopyButton value={command} label="Copy CLI command" variant="outline" size="sm" />
              </footer>
            </div>
          </section>
          <PlatformShowcase />
          <section className="mk-finale">
            <div>
              <span className="mk-eyebrow">BUILT SOMETHING GOOD?</span>
              <h2>
                Give it a home.
                <br />
                Then share it with the world.
              </h2>
              <p>Explore hosting, release environments, and the next steps for your game.</p>
              <Button asChild size="lg">
                <a href="/cloud">
                  Explore Cloud & pricing <ArrowRight size={17} />
                </a>
              </Button>
            </div>
            <div className="mk-finale-art" aria-hidden="true">
              <img src="/examples/space-shooter.webp" alt="" loading="lazy" />
              <img src="/examples/snake.webp" alt="" loading="lazy" />
              <span>
                <Zap size={36} fill="currentColor" />
              </span>
            </div>
          </section>
        </div>
      </div>
    </PublicShell>
  )
}
