import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  Gamepad2,
  Monitor,
  Search,
  Smartphone
} from "lucide-react"
import { useState } from "react"
import { SelectField } from "../../select-field"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { sessionEvents, number, type AnalyticsData, type AnalyticsSession } from "./model"
import { Blank, Panel, Tone } from "./primitives"

export function AnalyticsSessions({
  sessions,
  onSession
}: {
  sessions: AnalyticsSession[]
  onSession: (session: AnalyticsSession) => void
}) {
  const [outcome, setOutcome] = useState("all"),
    [device, setDevice] = useState("all"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0)
  const filtered = sessions.filter(
    (session) =>
      (outcome === "all" || (outcome === "affected" ? session.issueId : !session.issueId)) &&
      (device === "all" || session.device === device) &&
      `${session.id} ${session.scene} ${session.browser}`.toLowerCase().includes(search.toLowerCase())
  )
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 12) - 1))
  const shown = filtered.slice(currentPage * 12, currentPage * 12 + 12)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Sessions</h2>
        </div>
      </div>
      <div className="an-filter-row">
        <div className="an-search">
          <Search />
          <Input
            aria-label="Search sessions"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
            placeholder="Session ID, scene or browser…"
          />
        </div>
        <SelectField
          className="w-44"
          label="Session outcome"
          value={outcome}
          onChange={(value) => {
            setOutcome(value)
            setPage(0)
          }}
          options={[
            { value: "all", label: "All outcomes" },
            { value: "affected", label: "With issues" },
            { value: "healthy", label: "Without issues" }
          ]}
        />
        <SelectField
          className="w-36"
          label="Session device"
          value={device}
          onChange={(value) => {
            setDevice(value)
            setPage(0)
          }}
          options={[
            { value: "all", label: "All devices" },
            ...["Desktop", "Mobile", "Tablet"].map((value) => ({ value, label: value }))
          ]}
        />
      </div>
      <div className="an-panel">
        <div className="an-table-scroll">
          <table className="an-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Device & browser</th>
                <th>Scene</th>
                <th>Duration</th>
                <th>Release</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((session) => (
                <tr key={session.id}>
                  <td>
                    <button className="an-text-link font-mono" onClick={() => onSession(session)}>
                      {session.id}
                      <ArrowUpRight className="size-3.5" />
                    </button>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(session.time).toISOString().slice(11, 19)} UTC
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {session.device === "Desktop" ? (
                        <Monitor className="size-4 text-muted-foreground" />
                      ) : (
                        <Smartphone className="size-4 text-muted-foreground" />
                      )}
                      <span>
                        {session.device}
                        <small className="block text-[11px] text-muted-foreground">{session.browser}</small>
                      </span>
                    </div>
                  </td>
                  <td>{session.scene}</td>
                  <td className="font-mono text-xs">
                    {Math.floor(session.duration / 60)}m {session.duration % 60}s
                  </td>
                  <td>
                    <Tone>{session.release}</Tone>
                  </td>
                  <td>
                    <button aria-label={`Inspect outcome for ${session.id}`} onClick={() => onSession(session)}>
                      <Tone tone={session.issueId ? "bad" : "good"}>
                        {session.issueId ? <CircleAlert className="size-3" /> : <Check className="size-3" />}
                        {session.issueId ? "Issue captured" : "No captured issues"}
                      </Tone>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <Blank title="No sessions match" description="Try a different device, outcome or search." />}
        <div className="an-pagination">
          <span className="an-metadata">
            <span>{number(filtered.length)} matching sessions</span>
            <span>
              Page {currentPage + 1} of {Math.max(1, Math.ceil(filtered.length / 12))}
            </span>
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={(currentPage + 1) * 12 >= filtered.length}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SessionInvestigation({
  session,
  data,
  backLabel = "Back to sessions",
  onBack,
  onIssue,
  onTrace
}: {
  session: AnalyticsSession
  data: AnalyticsData
  backLabel?: string
  onBack: () => void
  onIssue: (id: string) => void
  onTrace: (session: AnalyticsSession, operation?: "saveMs" | "loadMs" | "frameMs") => void
}) {
  const events = sessionEvents(session)
  const [selected, setSelected] = useState(3)
  const event = events[selected]!
  const issue = data.issues.find((item) => item.id === session.issueId)
  return (
    <div className="space-y-5">
      <button className="an-text-link" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {backLabel}
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex gap-2">
            <Tone tone={issue ? "bad" : "good"}>{issue ? "Issue captured" : "No captured issues"}</Tone>
            <Tone>{session.release}</Tone>
          </div>
          <h2 className="font-mono text-xl font-semibold">{session.id}</h2>
          <p className="an-metadata mt-2 text-xs text-muted-foreground">
            <span>{session.device}</span>
            <span>{session.browser}</span>
            <span>{session.region}</span>
            <span>{new Date(session.time).toISOString().slice(11, 19)} UTC</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onTrace(session, issue?.operation ?? "saveMs")}>
          {issue?.operation ? "Inspect trace" : "Inspect save trace"} <ArrowUpRight className="size-4" />
        </Button>
      </div>
      <div className="an-investigation-grid">
        <div className="space-y-5">
          <div className="an-journey-stage">
            <div className="flex items-center justify-between">
              <Tone tone="purple">
                <Gamepad2 className="size-3" />
                {session.scene}
              </Tone>
              <span className="text-[11px] text-muted-foreground">Event timeline</span>
            </div>
            <div className="an-journey-path">
              {events
                .map((event) => event.name.replaceAll(".", " ").replaceAll("_", " "))
                .map((label, index) => (
                  <button
                    key={label}
                    onClick={() => setSelected(index)}
                    className="an-journey-stop"
                    data-selected={selected === index}
                    data-error={index === 3 && !session.completed}
                  >
                    <span>
                      {index === 3 && !session.completed ? (
                        <CircleAlert className="size-5" />
                      ) : index === 4 ? (
                        <Check className="size-5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <strong>{label}</strong>
                    <small>{Math.round((session.duration * index) / 4)}s</small>
                  </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-5 border-t pt-4 text-xs text-muted-foreground">
              <span>
                <Clock3 className="mr-1 inline size-3.5" />
                {Math.floor(session.duration / 60)}m {session.duration % 60}s session
              </span>
              <span>
                Frame p95 <strong className="text-foreground">{session.frameMs} ms</strong>
              </span>
              <span>
                Save <strong className="text-foreground">{session.saveMs} ms</strong>
              </span>
            </div>
          </div>
          <Panel title="Recorded timeline">
            <div className="px-5 pb-4">
              {events.map((entry, index) => (
                <button
                  key={entry.id}
                  className="an-timeline-entry"
                  data-active={selected === index}
                  onClick={() => setSelected(index)}
                >
                  <span className="font-mono text-[11px] text-muted-foreground">
                    +{Math.round((session.duration * index) / 4)}s
                  </span>
                  <span className="an-timeline-dot" data-error={entry.level === "error"} />
                  <span className="flex-1 text-left">
                    <strong className="text-xs font-medium">{entry.name}</strong>
                    <small className="mt-1 block text-[11px] text-muted-foreground">
                      {entry.level === "error"
                        ? issue?.message
                        : entry.duration
                          ? `${entry.duration} ms`
                          : session.scene}
                    </small>
                  </span>
                  <Chevron label={entry.level} />
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <aside className="space-y-4">
          <Panel title="Selected event" subtitle={event.name}>
            <div className="space-y-4 px-5 pb-5">
              <Tone tone={event.level === "error" ? "bad" : "neutral"}>{event.level}</Tone>
              <dl className="an-detail-list">
                <div>
                  <dt>Time</dt>
                  <dd>{new Date(event.time).toISOString().slice(11, 19)} UTC</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{event.duration ? `${event.duration} ms` : "Not measured"}</dd>
                </div>
                {Object.entries(event.attributes).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Panel>
          {issue && (
            <div className="an-panel p-5">
              <Tone tone="bad">Related issue</Tone>
              <h3 className="my-3 text-sm font-semibold">{issue.title}</h3>
              <p className="mb-4 text-xs leading-5 text-muted-foreground">{issue.message}</p>
              <button className="an-text-link" onClick={() => onIssue(issue.id)}>
                Open {issue.id}
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
function Chevron({ label }: { label: string }) {
  return <Tone tone={label === "error" ? "bad" : "neutral"}>{label}</Tone>
}
