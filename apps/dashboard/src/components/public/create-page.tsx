import { templates, type TemplateId } from "@spawn/templates/catalog"
import { ArrowRight, Check, Code2, FileCode2, FlaskConical, Layers3, Play, Terminal, Zap } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CopyButton } from "../copy-button"
import { PhysicsDemo } from "./physics-demo"
import { PlatformShowcase } from "./platform-showcase"
import { PublicShell } from "./shell"
import "./marketing.css"

const engineArt: Record<TemplateId, { image: string; title: string }> = {
  pixi: { image: "snake", title: "Orchard Trail" },
  phaser: { image: "platformer", title: "Clockwork Courier" },
  babylon: { image: "platformer-3d", title: "Tiny Treasures" },
  three: { image: "racing", title: "Alpine Rally" }
}
const engines = templates.map((template) => ({ ...template, ...engineArt[template.id] }))
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
  const [engineId, setEngineId] = useState<TemplateId>("pixi")
  const [check, setCheck] = useState<"unit" | "browser">("unit")
  const engine = engines.find((item) => item.id === engineId)!
  const starter = "/templates?engine=" + engine.id
  const command = "pnpm install\npnpm dev:setup\npnpm dev"
  return (
    <PublicShell active="/create">
      <div className="mk-page mk-creators">
        <div className="mk-container">
          <section className="mk-hero">
            <div className="mk-hero-copy">
              <span className="mk-kicker">
                <Zap size={15} /> FOR GAME CREATORS
              </span>
              <h1>
                Start with a playable game. <em>Make it yours.</em>
              </h1>
              <p>
                Choose your engine, add the tools your game needs, and download a standalone TypeScript project. Build
                in your own editor, with your own ideas.
              </p>
              <div className="mk-actions">
                <Button asChild size="lg">
                  <a href={starter}>
                    Build your starter kit <ArrowRight size={17} />
                  </a>
                </Button>
                <a className="mk-secondary" href="/?availability=playable#games">
                  <Play size={15} /> Explore games
                </a>
              </div>
              <div className="mk-reassurance">
                <span>
                  <Check size={14} /> Free to start
                </span>
                <span>
                  <Check size={14} /> Editable source
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
                <span>
                  {engine.dimension.toUpperCase()} {engine.name}
                </span>
                <strong>{engine.title}</strong>
              </div>
              <div className="mk-project-token">
                <span>
                  <Code2 size={22} />
                </span>
                <div>
                  <strong>Ready for your ideas</strong>
                  <small>TypeScript project with source included</small>
                </div>
                <Check size={18} />
              </div>
            </div>
          </section>

          <section className="mk-engine-section" aria-labelledby="engine-heading">
            <div className="mk-section-heading">
              <div>
                <span className="mk-eyebrow">CHOOSE YOUR ENGINE</span>
                <h2 id="engine-heading">Your game, your starting point.</h2>
              </div>
              <p>
                Pick the tools that fit your idea. <br />
                We’ll handle getting them connected.
              </p>
            </div>
            <Tabs value={engineId} onValueChange={(value) => setEngineId(value as TemplateId)}>
              <TabsList className="mk-engine-tabs" aria-label="Preview engine">
                {engines.map((item) => (
                  <TabsTrigger key={item.id} value={item.id}>
                    <span className="mk-engine-logo">
                      <img src={"/engines/" + item.id + (item.id === "phaser" ? ".png" : ".svg")} alt="" />
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.dimension.toUpperCase()}
                        {item.id === "pixi" || item.id === "babylon" ? " default" : " alternative"}
                      </small>
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
                <span className="mk-eyebrow">MAKE IT YOURS</span>
                <h2>The fun part starts sooner.</h2>
              </div>
              <p>
                Less setup between your idea <br />
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
                  <h3>A real project. All yours to edit.</h3>
                  <p>
                    Read the source, change the rules, and keep building. Use your favorite editor and AI coding tools.
                    Hosting is optional.
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
                    　main.ts
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
              <span className="mk-eyebrow">START BUILDING</span>
              <h2>Your first local playthrough.</h2>
              <p>
                Configure your stack, inspect the files, and download your starter. Unzip it, open the project folder in
                your terminal, and run these commands.
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
                <span>my-game / terminal</span>
                <Terminal size={16} />
              </header>
              <div className="c-command-line">
                <span>$</span>
                <code style={{ whiteSpace: "pre-line" }}>{command}</code>
              </div>
              <div className="mk-terminal-summary">
                <span>
                  ENGINE<strong>{engine.name}</strong>
                </span>
                <span>
                  LANGUAGE<strong>TypeScript</strong>
                </span>
                <span>
                  SOURCE<strong>Standalone</strong>
                </span>
              </div>
              <footer>
                <span>Requires Node.js 24+ and pnpm 12</span>
                <CopyButton value={command} label="Copy setup commands" variant="outline" size="sm" />
              </footer>
            </div>
          </section>
          <PlatformShowcase />
          <section className="mk-finale">
            <div>
              <span className="mk-eyebrow">YOUR NEXT ADVENTURE</span>
              <h2>Make your first move.</h2>
              <p>Start with something playable. Build something only you could make.</p>
              <Button asChild size="lg">
                <a href={starter}>
                  Build your starter kit <ArrowRight size={17} />
                </a>
              </Button>
              <a href="/cloud" className="mk-secondary mk-finale-cloud-link">
                Ready to share? Explore Cloud <ArrowRight size={16} />
              </a>
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
