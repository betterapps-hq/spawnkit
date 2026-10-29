import { templates, type TemplateId } from "@spawn/templates/catalog"
import { ArrowRight, Check, Code2, Play, Terminal, Zap } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CopyButton } from "../copy-button"
import { CreatorTools } from "./creator-tools"
import { PlatformShowcase } from "./platform-showcase"
import { PublicShell } from "./shell"
import "./marketing.css"

const engineArt: Record<TemplateId, { image: string; title: string }> = {
  pixi: { image: "snake", title: "Orchard Trail" },
  phaser: { image: "platformer", title: "Clockwork Courier" },
  babylon: { image: "dungeon-crawler", title: "Hollow Lantern" },
  three: { image: "racing", title: "Alpine Rally" }
}
const engines = templates.map((template) => ({ ...template, ...engineArt[template.id] }))
export function CreatePage() {
  const [engineId, setEngineId] = useState<TemplateId>("pixi")
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
                Make a browser game with a free TypeScript starter. Choose an engine and compatible tools, then build
                locally in your preferred editor with AI coding assistance.
              </p>
              <div className="mk-actions">
                <Button asChild size="lg">
                  <a href={starter}>Start with a kit</a>
                </Button>
                <a className="mk-secondary" href="/#games">
                  <Play size={15} /> Explore games
                </a>
              </div>
            </div>
            <div className="mk-game-cover">
              <img
                key={engine.id}
                src={"/examples/" + engine.image + ".webp"}
                alt={engine.title + " concept artwork"}
                fetchPriority="high"
              />
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
                  <strong>Playable source included</strong>
                  <small>Open it in your editor and build from there</small>
                </div>
                <Check size={18} />
              </div>
            </div>
          </section>

          <section className="mk-engine-section" aria-labelledby="engine-heading">
            <div className="mk-section-heading">
              <div>
                <span className="mk-eyebrow">START YOUR ENGINES</span>
                <h2 id="engine-heading">Spawn your game with a great engine.</h2>
              </div>
              <p>Choose a proven engine for your 2D or 3D game. We connect the compatible tools around it.</p>
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

          <CreatorTools />

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
                <Terminal size={16} />
                <span>my-game / terminal</span>
                <CopyButton value={command} label="Copy setup commands" variant="ghost" size="sm" />
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
            </div>
          </section>
          <PlatformShowcase />
          <section className="mk-finale">
            <div>
              <span className="mk-eyebrow">YOUR GAME STARTS HERE</span>
              <h2>Choose a kit. Build your game.</h2>
              <p>
                Get playable source, a configured toolchain, and room to make it yours. No hosting commitment required.
              </p>
              <Button asChild size="lg">
                <a href={starter}>Start with a kit</a>
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
