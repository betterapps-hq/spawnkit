import { ArrowLeft, ArrowUpRight, Braces, Layers3, Timer } from "lucide-react"
import { useState } from "react"
import { Button } from "../../ui/button"
import { health, percentile, percent, number, type AnalyticsSession } from "./model"
import { Breakdown, Panel, Tone } from "./primitives"

export function AnalyticsPerformance({
  sessions,
  onTrace
}: {
  sessions: AnalyticsSession[]
  onTrace: (session: AnalyticsSession, operation?: "saveMs" | "loadMs" | "frameMs") => void
}) {
  const stats = health(sessions)
  const operations = [
    {
      name: "checkpoint.save",
      kind: "Persistence",
      values: sessions.map((session) => session.saveMs),
      field: "saveMs" as const,
      budget: 500
    },
    {
      name: "scene.load",
      kind: "Asset loading",
      values: sessions.map((session) => session.loadMs),
      field: "loadMs" as const,
      budget: 2000
    },
    {
      name: "frame.update",
      kind: "Game loop",
      values: sessions.map((session) => session.frameMs),
      field: "frameMs" as const,
      budget: 16.7
    }
  ]
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Performance</h2>
      </div>
      <div className="an-performance-cards">
        {[
          {
            title: "Frame time (p95)",
            value: `${stats.frame} ms`,
            budget: "16.7 ms target",
            bad: stats.frame > 16.7,
            icon: Layers3
          },
          {
            title: "Scene load (p95)",
            value: `${(stats.load / 1000).toFixed(2)} s`,
            budget: "2 s target",
            bad: stats.load > 2000,
            icon: Timer
          },
          {
            title: "Checkpoint save (p95)",
            value: `${(stats.save / 1000).toFixed(2)} s`,
            budget: "500 ms target",
            bad: stats.save > 500,
            icon: Braces
          }
        ].map((metric) => (
          <div className="an-panel p-5" key={metric.title}>
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              {metric.title}
              <metric.icon className="size-4" />
            </div>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">{metric.value}</div>
            <div className="mt-4 flex items-center gap-2">
              <Tone tone={metric.bad ? "warning" : "good"}>{metric.bad ? "Above target" : "Within target"}</Tone>
              <span className="text-[11px] text-muted-foreground">{metric.budget}</span>
            </div>
          </div>
        ))}
      </div>
      <Panel title="Operations">
        <div className="an-table-scroll">
          <table className="an-table">
            <thead>
              <tr>
                <th>Operation</th>
                <th>Samples</th>
                <th>p50</th>
                <th>p95</th>
                <th>Over target</th>
                <th>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => (
                <tr key={operation.name}>
                  <td>
                    <button
                      className="an-text-link font-mono"
                      onClick={() => {
                        const slow = [...sessions].sort((a, b) => b[operation.field] - a[operation.field])[0]
                        if (slow) onTrace(slow, operation.field)
                      }}
                    >
                      {operation.name}
                      <ArrowUpRight className="size-3.5" />
                    </button>
                    <div className="mt-1 text-xs text-muted-foreground">{operation.kind}</div>
                  </td>
                  <td>{number(operation.values.length)}</td>
                  <td>{percentile(operation.values, 0.5)} ms</td>
                  <td className="font-medium">{percentile(operation.values)} ms</td>
                  <td>
                    <Tone tone="warning">
                      {percent(
                        (operation.values.filter((value) => value > operation.budget).length /
                          Math.max(1, sessions.length)) *
                          100
                      )}
                    </Tone>
                  </td>
                  <td>
                    <div className="an-histogram" aria-hidden="true">
                      {Array.from({ length: 14 }, (_, index) => {
                        const max = Math.max(...operation.values, 1),
                          low = (max * index) / 14,
                          count = operation.values.filter((value) => value >= low && value < low + max / 14).length
                        return (
                          <span
                            key={index}
                            style={{ height: `${Math.max(3, (count / Math.max(1, operation.values.length)) * 150)}px` }}
                          />
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div>
        <Panel title="Scene load by device" subtitle="p95 in milliseconds">
          <Breakdown
            unit=" ms"
            total={Math.max(
              ...["Desktop", "Mobile", "Tablet"].map((device) =>
                percentile(sessions.filter((session) => session.device === device).map((session) => session.loadMs))
              )
            )}
            values={["Desktop", "Mobile", "Tablet"].map((device) => ({
              label: device,
              value: percentile(
                sessions.filter((session) => session.device === device).map((session) => session.loadMs)
              )
            }))}
          />
        </Panel>
      </div>
    </div>
  )
}

export function TraceInvestigation({
  session,
  operation,
  backLabel = "Back to performance",
  onBack,
  onSession
}: {
  session: AnalyticsSession
  operation: "saveMs" | "loadMs" | "frameMs"
  backLabel?: string
  onBack: () => void
  onSession: (session: AnalyticsSession) => void
}) {
  const [selected, setSelected] = useState(3)
  const total = session[operation]
  const failure = session.operationFailures?.[operation]
  const failed = Boolean(failure)
  const slow = operation === "frameMs" && total > 16.7
  const spans = [
    {
      name: "checkpoint.save",
      service: "Game client",
      start: 0,
      duration: total,
      depth: 0,
      status: failed ? "error" : "ok"
    },
    {
      name: "POST /saves/checkpoint",
      service: "Edge gateway",
      start: total * 0.04,
      duration: total * 0.91,
      depth: 1,
      status: failed ? "409" : "200"
    },
    {
      name: "save.readRevision",
      service: "Game storage",
      start: total * 0.1,
      duration: total * 0.12,
      depth: 2,
      status: "ok"
    },
    {
      name: "save.write",
      service: "Game storage",
      start: total * 0.23,
      duration: total * 0.5,
      depth: 2,
      status: failed ? "conflict" : "ok"
    },
    {
      name: failed ? "error.handle" : "response.serialize",
      service: "Edge gateway",
      start: total * 0.76,
      duration: total * 0.15,
      depth: 2,
      status: "ok"
    }
  ]
  if (operation === "loadMs") {
    const labels = ["scene.load", "assets.fetch", "textures.decode", "scene.construct", "scene.activate"]
    spans.forEach((span, index) => {
      span.name = labels[index]!
      span.service = index === 1 ? "Asset service" : "Game client"
      const status =
        failure === "503"
          ? ["error", "503", "not_run", "not_run", "not_run"]
          : failure
            ? ["error", "200", "ok", "ok", failure]
            : ["ok", "200", "ok", "ok", "ok"]
      span.status = status[index]!
    })
    if (failure === "503") spans.splice(2)
  } else if (operation === "frameMs") {
    const labels = ["frame.update", "game.simulate", "input.update", "physics.step", "renderer.draw"]
    spans.forEach((span, index) => {
      span.name = labels[index]!
      span.service = "Game client"
      span.status = index === 0 && failed ? failure! : "ok"
    })
  }
  const span = spans[Math.min(selected, spans.length - 1)]!
  return (
    <div className="space-y-5">
      <button className="an-text-link" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {backLabel}
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex gap-2">
            <Tone tone="purple">Distributed trace</Tone>
            <Tone tone={failed ? "bad" : slow ? "warning" : "good"}>
              {failed
                ? failure === "conflict"
                  ? "Save conflict"
                  : operation === "saveMs"
                    ? "Save failed"
                    : operation === "loadMs"
                      ? "Load failed"
                      : "Frame failed"
                : slow
                  ? "Slow frame"
                  : "Completed"}
            </Tone>
          </div>
          <h2 className="text-xl font-semibold">{spans[0]!.name}</h2>
          <p className="an-metadata mt-2 text-xs text-muted-foreground">
            <span>{session.id}</span>
            <span>Release {session.release}</span>
            <span>{total} ms total</span>
            <span>{spans.length} spans</span>
            <span>{new Set(spans.map((span) => span.service)).size} services</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onSession(session)}>
          Open session <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
      <Panel title="Trace waterfall">
        <div className="an-waterfall-scroll">
          <div className="an-waterfall">
            <div className="an-waterfall-scale">
              <span>Operation / service</span>
              <div>
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                  <span key={fraction}>{Math.round(total * fraction)} ms</span>
                ))}
              </div>
            </div>
            {spans.map((entry, index) => (
              <button
                key={entry.name}
                className="an-span-row"
                data-active={Math.min(selected, spans.length - 1) === index}
                onClick={() => setSelected(index)}
                aria-label={`Inspect span ${entry.name}`}
              >
                <span style={{ paddingLeft: `${16 + entry.depth * 16}px` }}>
                  <strong>{entry.name}</strong>
                  <small>{entry.service}</small>
                </span>
                <div className="an-span-track">
                  <span
                    className="an-span-bar"
                    data-error={entry.status !== "ok" && entry.status !== "200"}
                    style={{ left: `${(entry.start / total) * 100}%`, width: `${(entry.duration / total) * 100}%` }}
                  >
                    {Math.round(entry.duration)} ms
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title={span.name} subtitle="Selected span">
        <div className="an-span-details">
          <dl className="an-detail-list">
            <div>
              <dt>Service</dt>
              <dd>{span.service}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{Math.round(span.duration)} ms</dd>
            </div>
            <div>
              <dt>Relative start</dt>
              <dd>+{Math.round(span.start)} ms</dd>
            </div>
          </dl>
          <dl className="an-detail-list">
            <div>
              <dt>Status</dt>
              <dd>
                <Tone tone={span.status === "ok" || span.status === "200" ? "good" : "bad"}>{span.status}</Tone>
              </dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>{session.release}</dd>
            </div>
            <div>
              <dt>Scene</dt>
              <dd>{session.scene}</dd>
            </div>
          </dl>
        </div>
      </Panel>
    </div>
  )
}
