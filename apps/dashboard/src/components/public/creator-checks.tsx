import { Check, Circle, FlaskConical, Keyboard, LoaderCircle, MousePointer2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlaybackControls, useCloudPlayback } from "./cloud-playback"
import "./cloud-scenes.css"

const suites = {
  unit: {
    name: "Game logic",
    tool: "Vitest",
    command: "pnpm test",
    checks: ["Movement stays within bounds", "Simulation behaves consistently", "Game sessions stay independent"]
  },
  browser: {
    name: "Player interactions",
    tool: "Playwright",
    command: "pnpm test:e2e",
    checks: ["Open game in Chromium", "Move with keyboard input", "Verify the player collects an item"]
  }
}

function CheckRun({ kind }: { kind: keyof typeof suites }) {
  const { ref, ...playback } = useCloudPlayback(10, 1000, 6)
  const suite = suites[kind]
  const complete = Math.min(Math.floor(playback.frame / 2), 3)
  const browser = kind === "browser"
  return (
    <div ref={ref} className="c-test-run mk-scene" data-running={playback.running} data-complete={complete === 3}>
      <header className="mk-scene-header">
        {browser ? <MousePointer2 size={16} /> : <FlaskConical size={16} />}
        <strong>{suite.name}</strong>
        <span className="c-test-tool">{suite.tool}</span>
        <PlaybackControls playback={playback} label={kind === "unit" ? "unit tests" : "browser tests"} />
      </header>
      <div className="c-test-proof" aria-hidden="true">
        {browser ? (
          <div className="c-browser-proof">
            <div className="c-mini-address">localhost / game</div>
            <div className="c-test-level" data-moved={complete >= 2} data-collected={complete === 3}>
              <span className="c-test-player">
                <i />
                <i />
              </span>
              <span className="c-test-pickup" />
              <span className="c-test-score">{complete === 3 ? "1 / 1 collected" : "0 / 1 collected"}</span>
            </div>
            <span className="c-key-input">
              <Keyboard size={14} />
              {complete >= 2 ? "ArrowRight pressed" : "Waiting for input"}
            </span>
          </div>
        ) : (
          <div className="c-unit-proof">
            <span>movement.test.ts</span>
            <code>
              <span>player.x</span> = 120
              <br />
              movePlayer(player, <b>"right"</b>)<br />
              <br />
              expect(player.x).toBe(<b>120</b>)
            </code>
            <div data-passed={complete >= 1}>
              <Check size={14} />
              Player stays inside the world boundary
            </div>
          </div>
        )}
      </div>
      <div className="c-test-results">
        {suite.checks.map((check, index) => {
          const state = index < complete ? "passed" : index === complete ? "running" : "queued"
          return (
            <div key={check} data-state={state}>
              {state === "passed" ? (
                <Check size={15} />
              ) : state === "running" ? (
                <LoaderCircle size={15} className="mk-spin" />
              ) : (
                <Circle size={13} />
              )}
              <span>{check}</span>
              <small>{state === "passed" ? "Passed" : state === "running" ? "Running" : "Queued"}</small>
            </div>
          )
        })}
      </div>
      <footer className="mk-scene-footer">
        <code>{suite.command}</code>
        <span>{complete === 3 ? "All checks passed" : "Running checks"}</span>
      </footer>
    </div>
  )
}

export function CreatorChecks() {
  return (
    <Tabs defaultValue="unit" className="c-checks-workbench">
      <TabsList aria-label="Testing layers">
        <TabsTrigger value="unit">Unit tests</TabsTrigger>
        <TabsTrigger value="browser">Browser tests</TabsTrigger>
      </TabsList>
      <TabsContent value="unit">
        <CheckRun kind="unit" />
      </TabsContent>
      <TabsContent value="browser">
        <CheckRun kind="browser" />
      </TabsContent>
    </Tabs>
  )
}
