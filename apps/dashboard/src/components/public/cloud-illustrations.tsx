import {
  Activity,
  ArrowDown,
  ArrowRight,
  Check,
  Circle,
  Code2,
  FileCode2,
  GitMerge,
  GitPullRequest,
  Globe2,
  Layers3,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Terminal,
  TriangleAlert
} from "lucide-react"
import { useState, type CSSProperties } from "react"
import { Button } from "@/components/ui/button"
import { PlaybackControls, useCloudPlayback } from "./cloud-playback"
import "./cloud-scenes.css"

export function CreateIllustration() {
  const { ref, ...playback } = useCloudPlayback(8, 1400, 5)
  const phase = Math.min(playback.frame, 5)
  const collected = phase >= 4
  return (
    <div
      ref={ref}
      className="mk-scene mk-create-scene"
      data-running={playback.running}
      data-phase={phase}
      aria-label="Illustration of editing movement code and collecting an item in a game preview"
    >
      <header className="mk-scene-header">
        <Code2 size={16} />
        <strong>Orchard Trail</strong>
        <PlaybackControls playback={playback} label="starter" />
      </header>
      <div className="mk-editor-preview">
        <div className="mk-code-pane">
          <span className="mk-file-tab">
            <FileCode2 size={13} /> simulation.ts
          </span>
          <pre>
            <code>
              <span className="mk-code-purple">const</span> player = {"{"}
              <br /> x: <span className="mk-code-green">0</span>,<br /> y: <span className="mk-code-green">0</span>,
              <br />
              <span className="mk-code-edit">
                {" "}
                speed: <b>{phase >= 1 ? "140" : "100"}</b>
              </span>
              <br />
              {"}"}
              <br />
              <br />
              <span className="mk-code-purple">const</span> next =<br /> simulation.step(
              <br /> input, deltaTime
              <br /> )
            </code>
          </pre>
          <div className="mk-editor-change">
            <Check size={13} />
            {phase >= 1 ? "Movement speed updated" : "Ready to edit"}
          </div>
        </div>
        <div className="mk-playfield-pane">
          <div className="mk-preview-label">
            <Globe2 size={12} /> Local preview
          </div>
          <div className="mk-playfield" aria-hidden="true">
            {Array.from({ length: 25 }, (_, index) => (
              <i key={index} className={index === 3 || index === 20 || index === 24 ? "mk-grass-tile" : ""} />
            ))}
            <span className="mk-game-gem" data-collected={collected} />
            <span
              className="mk-game-character"
              style={
                { "--player-x": phase < 2 ? 1 : phase < 3 ? 2 : 3, "--player-y": phase < 4 ? 2 : 1 } as CSSProperties
              }
            >
              <i />
              <i />
            </span>
            <span className="mk-collect-pop" data-visible={collected}>
              +1
            </span>
          </div>
          <div className="mk-preview-score">
            <span>Collected</span>
            <b>{collected ? "1" : "0"} / 1</b>
          </div>
        </div>
      </div>
      <footer className="mk-scene-footer">
        <Terminal size={14} />
        <code>pnpm dev</code>
        <span>Changes appear in your local game</span>
      </footer>
    </div>
  )
}

const checks = [
  { name: "TypeScript", result: "No type errors", duration: "0.8s" },
  { name: "Lint & format", result: "Code checks passed", duration: "0.6s" },
  { name: "Unit test baselines", result: "Movement, world bounds, and independent sessions", duration: "1.2s" },
  { name: "Checkpoint regression", result: "Checkpoint restores player position", duration: "0.7s" },
  { name: "Browser test", result: "Player can resume the level", duration: "2.4s" }
]

export function ChecksIllustration() {
  const { ref, ...playback } = useCloudPlayback(14, 850, 10)
  const completed = Math.min(Math.floor(playback.frame / 2), checks.length)
  const done = completed === checks.length
  return (
    <div
      ref={ref}
      className="mk-scene mk-checks-scene"
      data-running={playback.running}
      data-complete={done}
      aria-label="Animated example build checks"
    >
      <header className="mk-scene-header">
        <ShieldCheck size={17} />
        <strong>Checkpoint fix</strong>
        <PlaybackControls playback={playback} label="checks" />
      </header>
      <div className="mk-check-summary">
        <span>{done ? "All checks passed" : "Running project checks"}</span>
        <b>
          {completed} / {checks.length}
        </b>
      </div>
      <progress
        className="mk-build-progress"
        aria-label="Completed build checks"
        max={checks.length}
        value={completed}
      />
      <div className="mk-check-rows">
        {checks.map(({ name, result, duration }, index) => {
          const status = index < completed ? "passed" : index === completed ? "running" : "queued"
          return (
            <div key={name} className="mk-check-row" data-state={status}>
              {status === "passed" ? (
                <Check size={16} />
              ) : status === "running" ? (
                <LoaderCircle size={16} className="mk-spin" />
              ) : (
                <Circle size={14} />
              )}
              <div>
                <strong>{name}</strong>
                <span>{result}</span>
              </div>
              <small>{status === "passed" ? duration : status === "running" ? "Running" : "Queued"}</small>
            </div>
          )
        })}
      </div>
      <footer className="mk-scene-footer">
        <Terminal size={14} />
        <code>pnpm verify</code>
        <span>{done ? "Ready for deployment" : "Checking the next version"}</span>
      </footer>
    </div>
  )
}

const deploymentStages = [
  { title: "Review the pull request", detail: "Production keeps serving v1.1 while the next change is reviewed." },
  { title: "Merge the checkpoint fix", detail: "The merge triggers the configured CI workflow." },
  { title: "Build in staging", detail: "The new version is built for Sandbox, your staging environment." },
  { title: "Play-test v1.2 in Sandbox", detail: "Check the candidate before changing the game your players open." },
  { title: "Promote v1.2 to production", detail: "The same tested build goes live, without rebuilding." },
  { title: "Roll back to v1.1", detail: "Restore a previous build. Player data is not rolled back." }
]

export function DeployIllustration() {
  const { ref, ...playback } = useCloudPlayback(9, 1800, 4)
  const [selected, setSelected] = useState<number | null>(null)
  const phase = selected ?? Math.min(playback.frame, 5)
  const stage = deploymentStages[phase]!
  const controlPlayback = {
    ...playback,
    paused: selected !== null || playback.paused,
    toggle: () => {
      if (selected !== null) {
        setSelected(null)
        if (playback.paused) playback.toggle()
      } else playback.toggle()
    },
    replay: () => {
      setSelected(null)
      playback.replay()
    }
  }
  return (
    <div
      ref={ref}
      className="mk-scene mk-deploy-scene"
      data-running={playback.running && selected === null}
      data-stage={phase}
      aria-label="Animated pull request merge, staging promotion, and rollback"
    >
      <header className="mk-scene-header">
        <GitMerge size={16} />
        <strong>Deployment workflow</strong>
        <PlaybackControls playback={controlPlayback} label="deployment" />
      </header>
      <div className="mk-deployment-map">
        <div className="mk-pr-lanes">
          <div className="mk-pr-chip" data-merged={phase > 0}>
            {phase > 0 ? <GitMerge size={15} /> : <GitPullRequest size={15} />}
            <span>
              PR #24<strong>Checkpoint fix</strong>
            </span>
            <small>{phase > 0 ? "Merged" : "Review"}</small>
          </div>
          <div className="mk-pr-chip">
            <GitPullRequest size={15} />
            <span>
              PR #25<strong>Next level</strong>
            </span>
            <small>In review</small>
          </div>
        </div>
        <div className="mk-merge-line" data-active={phase === 1 || phase === 2}>
          <ArrowDown size={18} />
          <span>main</span>
        </div>
        <div className="mk-map-environments">
          <div className="mk-map-node" data-active={phase >= 2 && phase <= 3}>
            <Layers3 size={20} />
            <strong>Sandbox</strong>
            <small>Staging</small>
            <b>{phase >= 3 ? "v1.2" : phase === 2 ? "Building" : "v1.1"}</b>
          </div>
          <div className="mk-promotion-link" data-active={phase === 4} data-rollback={phase === 5}>
            {phase === 5 ? <RotateCcw size={21} /> : <ArrowRight size={21} />}
          </div>
          <div className="mk-map-node mk-production-node" data-active={phase >= 4}>
            <Globe2 size={20} />
            <strong>Production</strong>
            <small>Live for players</small>
            <b>{phase === 4 ? "v1.2" : "v1.1"}</b>
          </div>
        </div>
      </div>
      <div className="mk-deploy-caption">
        <strong>{stage.title}</strong>
        <p>{stage.detail}</p>
      </div>
      <div className="mk-deploy-stages" aria-label="Inspect deployment stages">
        {[
          ["Merge", 1],
          ["Staging", 3],
          ["Promote", 4],
          ["Rollback", 5]
        ].map(([name, index]) => (
          <Button
            key={name}
            variant="ghost"
            size="sm"
            aria-pressed={phase === index}
            onClick={() => {
              setSelected(Number(index))
              if (!playback.paused) playback.toggle()
            }}
          >
            {name}
          </Button>
        ))}
      </div>
    </div>
  )
}

const activity = [12, 18, 16, 26, 22, 34, 30, 42, 35, 48, 28, 19]
export function MonitorIllustration() {
  const { ref, ...playback } = useCloudPlayback(12, 1000, 8)
  const [detail, setDetail] = useState(false)
  const revealed = Math.min(playback.frame + 3, activity.length)
  const errorVisible = playback.frame >= 6 || detail
  return (
    <div
      ref={ref}
      className="mk-scene mk-monitor-scene"
      data-running={playback.running}
      aria-label="Illustrated game activity and a checkpoint error investigation"
    >
      <header className="mk-scene-header">
        <Activity size={16} />
        <strong>Orchard Trail</strong>
        <span className="mk-scene-context">Production v1.1</span>
        <PlaybackControls playback={playback} label="monitoring" />
      </header>
      <div className="mk-activity-heading">
        <div>
          <span>Game events</span>
          <strong>Session activity</strong>
        </div>
        <span className="mk-session-tag">session-42</span>
      </div>
      <div className="mk-activity-chart" aria-label="Game events during a play session">
        {activity.map((height, index) => (
          <span
            key={index}
            data-revealed={index < revealed}
            data-error={index === 8 && errorVisible}
            style={{ "--bar-height": `${height * 1.6}px` } as CSSProperties}
          />
        ))}
        <div className="mk-chart-axis">
          <span>Session started</span>
          <span>Checkpoint reached</span>
        </div>
      </div>
      <Button
        variant="ghost"
        className="mk-issue-toggle"
        aria-expanded={detail}
        onClick={() => setDetail((value) => !value)}
      >
        <TriangleAlert size={18} />
        <span>
          <strong>Player could not resume level</strong>
          <small>{errorVisible ? "TypeError in restoreCheckpoint" : "Inspect the checkpoint event"}</small>
        </span>
        <ArrowRight size={16} />
      </Button>
      <div className="mk-issue-detail" data-expanded={detail}>
        <div>
          <code>simulation.ts:84</code>
          <span>checkpoint.loaded</span>
        </div>
        <pre>
          <code>
            <span className="mk-code-muted">
              Level: orchard
              <br />
              Checkpoint: bridge
            </span>
            <br />
            <b>Player position: missing</b>
          </code>
        </pre>
        {detail && (
          <p>
            The checkpoint loaded without a player position. Pass this session context to your preferred AI agent to
            investigate.
          </p>
        )}
      </div>
    </div>
  )
}
