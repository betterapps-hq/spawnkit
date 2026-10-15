import { ArrowLeft, ArrowRight } from "lucide-react"
import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { health, issueImpact, number, percent, type AnalyticsData, type AnalyticsSession } from "./model"
import { Blank, Panel, Tone } from "./primitives"
import { releaseCatalog } from "./release-catalog"
import { ReleaseHealth } from "./release-health"
import { ReleasePicker } from "./release-picker"
import "./releases.css"

export function AnalyticsReleases({
  data,
  sessions,
  onIssue,
  onRelease
}: {
  data: AnalyticsData
  sessions: AnalyticsSession[]
  onIssue: (id: string) => void
  onRelease: (version: string) => void
}) {
  const catalog = useMemo(() => releaseCatalog(data), [data])
  const [comparison, setComparison] = useState<{ baseline: string; candidate: string } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const returnTo = useRef<HTMLButtonElement | null>(null)
  const comparing = Boolean(comparison)
  useLayoutEffect(() => {
    if (comparing) heading.current?.focus({ preventScroll: true })
    else returnTo.current?.focus({ preventScroll: true })
  }, [comparing])
  if (!catalog.length)
    return (
      <Blank title="No releases yet" description="Releases appear when deployment or telemetry data is available." />
    )
  const before = sessions.filter((session) => session.release === comparison?.baseline),
    after = sessions.filter((session) => session.release === comparison?.candidate)
  const a = health(before),
    b = health(after)
  const comparisons = [
    {
      title: "Sessions without issues",
      a: percent(a.errorFree),
      b: percent(b.errorFree),
      delta: b.errorFree - a.errorFree,
      unit: "pp",
      higherGood: true
    },
    {
      title: "Scene load (p95)",
      a: `${a.load} ms`,
      b: `${b.load} ms`,
      delta: b.load - a.load,
      unit: "ms",
      higherGood: false
    },
    {
      title: "Checkpoint save (p95)",
      a: `${a.save} ms`,
      b: `${b.save} ms`,
      delta: b.save - a.save,
      unit: "ms",
      higherGood: false
    },
    {
      title: "Frame time (p95)",
      a: `${a.frame} ms`,
      b: `${b.frame} ms`,
      delta: b.frame - a.frame,
      unit: "ms",
      higherGood: false
    }
  ]
  const introduced = issueImpact(data.issues, after).filter((issue) => issue.firstRelease === comparison?.candidate)
  return (
    <>
      <div hidden={comparing}>
        <ReleaseHealth
          data={data}
          sessions={sessions}
          catalog={catalog}
          onRelease={onRelease}
          onCompare={(candidate, trigger) => {
            const index = catalog.findIndex((release) => release.version === candidate)
            const baseline = catalog[index + 1]?.version ?? catalog[index - 1]?.version
            if (!baseline) return
            returnTo.current = trigger
            setComparison({ baseline, candidate })
          }}
        />
      </div>
      {comparison && (
        <div className="an-release-comparison-view space-y-5">
          <button className="an-text-link" onClick={() => setComparison(null)}>
            <ArrowLeft className="size-4" /> Back to release health
          </button>
          <h2 ref={heading} tabIndex={-1} className="text-base font-semibold outline-none">
            Compare releases
          </h2>
          <div className="an-panel">
            <table className="an-release-comparison">
              <caption className="sr-only">Release health comparison</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Metric</span>
                  </th>
                  <th scope="col">
                    <span className="an-label">Baseline</span>
                    <ReleasePicker
                      label="Baseline release"
                      value={comparison.baseline}
                      releases={catalog}
                      onChange={(baseline) => setComparison({ ...comparison, baseline })}
                    />
                  </th>
                  <th scope="col">
                    <span className="an-label">Release</span>
                    <ReleasePicker
                      label="Comparison release"
                      value={comparison.candidate}
                      releases={catalog}
                      onChange={(candidate) => setComparison({ ...comparison, candidate })}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="an-release-samples">
                  <th scope="row">Recorded sessions</th>
                  <td>{number(before.length)}</td>
                  <td>{number(after.length)}</td>
                </tr>
                {comparison.baseline === comparison.candidate ? (
                  <tr>
                    <td colSpan={3}>
                      <Blank
                        title="Choose two different releases"
                        description="Select a separate baseline to compare changes."
                      />
                    </td>
                  </tr>
                ) : !before.length || !after.length ? (
                  <tr>
                    <td colSpan={3}>
                      <Blank title="Not enough data for this comparison" description="Try a wider time range." />
                    </td>
                  </tr>
                ) : (
                  comparisons.map((metric) => (
                    <tr key={metric.title}>
                      <th scope="row">{metric.title}</th>
                      <td className="text-muted-foreground">{metric.a}</td>
                      <td>
                        <strong>{metric.b}</strong>
                        <div className="mt-1.5">
                          <Tone
                            tone={
                              metric.delta === 0 ? "neutral" : metric.delta > 0 === metric.higherGood ? "good" : "bad"
                            }
                          >
                            {metric.delta > 0 ? "+" : ""}
                            {metric.delta.toFixed(1)} {metric.unit}
                          </Tone>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Panel title={`First seen in ${comparison.candidate}`}>
            {introduced.length ? (
              introduced.map((issue) => (
                <button className="an-release-issue" key={issue.id} onClick={() => onIssue(issue.id)}>
                  <div>
                    <span className="font-mono text-[11px] text-muted-foreground">{issue.id}</span>
                    <strong>{issue.title}</strong>
                    <small>{issue.sessions.length} affected sessions</small>
                  </div>
                  <Tone tone={issue.state === "Regressed" ? "bad" : "purple"}>{issue.state}</Tone>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            ) : (
              <p className="px-5 pb-5 text-sm text-muted-foreground">
                {after.length ? "No new issue groups in this window." : "No sessions in this window."}
              </p>
            )}
          </Panel>
        </div>
      )}
    </>
  )
}
