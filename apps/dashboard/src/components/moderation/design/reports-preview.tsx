import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flag,
  Gamepad2,
  History,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  Search,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { CopyButton } from "../../copy-button"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import { Textarea } from "../../ui/textarea"
import { caseSeeds, eventSeeds, type CaseEvent, type SafetyCase, type SafetyRole } from "./safety-fixtures"
import {
  Avatar,
  BackButton,
  Empty,
  FilterSegments,
  Metadata,
  Notice,
  PreviewDialog,
  SafetyShell,
  StatusPill
} from "./safety-shared"

type Scenario = "ready" | "empty" | "loading" | "error" | "save-error" | "conflict"
type DecisionKind =
  | "Hide comment"
  | "Hide from discovery"
  | "Restrict game access"
  | "No violation found"
  | "Escalate to admin"
  | "Reopen report"
const reasons = [
  "Spam or advertising",
  "Harassment or hate",
  "Unsafe links or downloads",
  "Misleading listing",
  "No violation found",
  "Needs an admin decision",
  "New evidence"
]
const outcomes: Record<DecisionKind, string> = {
  "Hide comment": "Hides the comment. The original stays in the audit history.",
  "Hide from discovery": "Hides the listing. Direct links still work.",
  "Restrict game access": "Hides the listing and blocks all hosted versions and assets.",
  "No violation found": "Resolves the reports without hiding content.",
  "Escalate to admin": "Requests an admin decision. Content stays available.",
  "Reopen report": "Returns the case to the open queue. History is retained."
}
function ReviewDecision({
  item,
  kind,
  role,
  scenario,
  close,
  save,
  onConflict
}: {
  item: SafetyCase
  kind: DecisionKind
  role: SafetyRole
  scenario: Scenario
  close: () => void
  save: (kind: DecisionKind, reason: string, note: string) => void
  onConflict: (draft: string) => void
}) {
  const [action, setAction] = useState(kind)
  const [reason, setReason] = useState(
    kind === "Escalate to admin" ? "Needs an admin decision" : kind === "Reopen report" ? "New evidence" : ""
  )
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    await new Promise((resolve) => setTimeout(resolve, 450))
    setPending(false)
    setAttempt(attempt + 1)
    if (scenario === "conflict") {
      setError("Alex Morgan resolved this report. Review the latest decision.")
      return
    }
    if (scenario === "save-error" && attempt === 0) {
      setError("The decision could not be saved. Try again.")
      return
    }
    save(action, reason, note.trim())
  }
  const escalation = kind === "Escalate to admin" || kind === "Reopen report"
  return (
    <PreviewDialog
      open
      onClose={() => {
        if (!pending) close()
      }}
      title={escalation ? kind : "Make a decision"}
    >
      <form onSubmit={(event) => void submit(event)} className="safety-dialog-body">
        <div className="safety-target">
          <img src={item.cover} alt="" />
          <div>
            <strong>{item.game}</strong>
            <Metadata items={[item.kind, item.id]} />
          </div>
        </div>
        {!escalation && (
          <div className="safety-field">
            <label htmlFor="case-action">Action</label>
            <Select value={action} onValueChange={(value) => setAction(value as DecisionKind)} disabled={pending}>
              <SelectTrigger id="case-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(item.kind === "Comment"
                  ? ["Hide comment", "No violation found"]
                  : ["Hide from discovery", "Restrict game access", "No violation found"]
                ).map((value) => (
                  <SelectItem key={value} value={value} disabled={value === "Restrict game access" && role !== "Admin"}>
                    {value}
                    {value === "Restrict game access" && role !== "Admin" ? " (Admin only)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Notice tone={action === "Restrict game access" ? "red" : "purple"}>
          <strong>{action}</strong>
          <p>{outcomes[action]}</p>
          {!escalation && (
            <small>
              Resolves {item.reports.length} grouped {item.reports.length === 1 ? "report" : "reports"}.
            </small>
          )}
        </Notice>
        <div className="safety-field">
          <label htmlFor="case-reason">Reason</label>
          <Select value={reason} onValueChange={setReason} disabled={pending}>
            <SelectTrigger id="case-reason">
              <SelectValue placeholder="Choose a reason" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((value) => (
                <SelectItem value={value} key={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="safety-field">
          <label htmlFor="case-note">
            Decision notes <span>Required</span>
          </label>
          <Textarea
            id="case-note"
            value={note}
            disabled={pending}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Explain your decision."
          />
          <small className="safety-field-foot">
            <span>Team only.</span>
            <span>{note.length}/500</span>
          </small>
        </div>
        {error && (
          <Notice tone="red">
            <strong>{scenario === "conflict" ? "This report has changed" : "Couldn’t save decision"}</strong>
            <p>{error}</p>
          </Notice>
        )}
        <div className="safety-dialog-actions">
          <Button type="button" variant="outline" disabled={pending} onClick={close}>
            Cancel
          </Button>
          {scenario === "conflict" && error ? (
            <Button type="button" onClick={() => onConflict(note)}>
              Review latest
              <ArrowRight />
            </Button>
          ) : (
            <Button
              type="submit"
              variant={action === "Restrict game access" ? "destructive" : "default"}
              disabled={!reason || !note.trim() || pending}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
              {pending ? "Saving…" : escalation ? action : "Save decision"}
            </Button>
          )}
        </div>
      </form>
    </PreviewDialog>
  )
}
export function ReportsPreview({
  scenario = "ready",
  role = "Admin",
  initialCase = "RPT-1042",
  showDetail = false
}: {
  scenario?: Scenario
  role?: SafetyRole
  initialCase?: string
  showDetail?: boolean
}) {
  const [cases, setCases] = useState<SafetyCase[]>(scenario === "empty" ? [] : structuredClone(caseSeeds))
  const [events, setEvents] = useState<CaseEvent[]>(eventSeeds)
  const [selected, setSelected] = useState(initialCase)
  const [mobileDetail, setMobileDetail] = useState(showDetail)
  const [view, setView] = useState("open")
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState("all")
  const [mine, setMine] = useState(false)
  const [sort, setSort] = useState("newest")
  const [state, setState] = useState(scenario)
  const [decision, setDecision] = useState<DecisionKind | null>(null)
  const [notice, setNotice] = useState("")
  const [note, setNote] = useState("")
  const [currentSeen, setCurrentSeen] = useState(false)
  const [version, setVersion] = useState("reported")
  const [handoff, setHandoff] = useState(false)
  const [takeoverNote, setTakeoverNote] = useState("")
  const active = cases.find((item) => item.id === selected)
  const editable = role !== "Observer"
  const open = cases.filter((item) => item.state !== "Resolved")
  const shown = cases
    .filter(
      (item) =>
        (view === "all" || (view === "open" ? item.state !== "Resolved" : item.state === "Resolved")) &&
        (kind === "all" || item.kind === kind) &&
        (!mine || item.assignee === "You") &&
        `${item.game} ${item.id} ${item.reason} ${item.author}`.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) =>
      sort === "priority"
        ? Number(b.priority === "High") - Number(a.priority === "High")
        : sort === "oldest"
          ? a.id.localeCompare(b.id)
          : b.id.localeCompare(a.id)
    )
  const other = Boolean(active?.assignee && active.assignee !== "You")
  function record(action: string, detail: string) {
    if (active)
      setEvents((items) => [
        { id: crypto.randomUUID(), caseId: active.id, actor: "You", action, note: detail, time: "Just now" },
        ...items
      ])
  }
  function update(patch: Partial<SafetyCase>) {
    setCases((items) => items.map((item) => (item.id === selected ? { ...item, ...patch } : item)))
  }
  function inspect(id: string) {
    setSelected(id)
    setMobileDetail(true)
    setCurrentSeen(false)
    setVersion("reported")
    setNote("")
  }
  function start() {
    update({ assignee: "You", state: "In review" })
    record("Started review", "Assigned to you.")
    setNotice("Assigned to you.")
  }
  function save(action: DecisionKind, reason: string, detail: string) {
    update({
      state: action === "Escalate to admin" ? "Escalated" : action === "Reopen report" ? "In review" : "Resolved",
      assignee: action === "Escalate to admin" ? null : "You",
      outcome: action
    })
    record(action, `${reason}: ${detail}`)
    setDecision(null)
    setNotice(
      action === "Escalate to admin"
        ? "Escalated for an admin decision."
        : action === "Reopen report"
          ? "Report reopened."
          : "Decision saved."
    )
  }
  function reset() {
    setQuery("")
    setKind("all")
    setMine(false)
  }
  return (
    <SafetyShell page="Reports" accountRole={role}>
      <div className="safety-report-summary">
        <span>{state === "loading" ? "—" : open.length} open cases</span>
        <span>
          <LockKeyhole size={14} />
          {state === "loading" ? "—" : open.filter((item) => item.state === "Escalated").length} need an admin
        </span>
        <span>
          <UserRound size={14} />
          {state === "loading" ? "—" : open.filter((item) => !item.assignee).length} unassigned
        </span>
        <StatusPill>{role} access</StatusPill>
      </div>
      {role === "Observer" && <Notice>Read-only access.</Notice>}
      {notice && (
        <Notice tone="green" close={() => setNotice("")}>
          {notice}
        </Notice>
      )}
      <div className="safety-report-workspace" data-detail={mobileDetail}>
        <section className="safety-queue" aria-label="Report queue">
          <FilterSegments
            value={view}
            onChange={setView}
            label="Report status"
            line
            items={[
              {
                value: "open",
                label: (
                  <>
                    Open<span className="safety-count">{open.length}</span>
                  </>
                )
              },
              { value: "resolved", label: "Resolved" },
              { value: "all", label: "All" }
            ]}
          />
          <div className="safety-queue-tools">
            <div className="safety-search">
              <Search />
              <Input
                aria-label="Search reports"
                placeholder="Search games, reasons or report ID"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <Button size="icon-xs" variant="ghost" aria-label="Clear report search" onClick={() => setQuery("")}>
                  <X />
                </Button>
              )}
            </div>
            <div>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger aria-label="Content type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All content</SelectItem>
                  <SelectItem value="Game">Games</SelectItem>
                  <SelectItem value="Comment">Comments</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={mine ? "secondary" : "outline"}
                size="sm"
                aria-pressed={mine}
                onClick={() => setMine(!mine)}
              >
                <UserRound />
                Assigned to me
              </Button>
            </div>
            <div className="safety-sort">
              <span>
                {shown.length} {shown.length === 1 ? "case" : "cases"}
              </span>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger aria-label="Sort reports">
                  <ArrowDownWideNarrow size={13} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="priority">High priority first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {state === "loading" ? (
            <div className="safety-skeletons" aria-label="Loading reports" aria-busy="true">
              {[1, 2, 3, 4].map((n) => (
                <div key={n}>
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : state === "error" ? (
            <Empty
              title="Reports couldn’t load"
              action={<Button onClick={() => setState("ready")}>Try again</Button>}
            ></Empty>
          ) : shown.length ? (
            <div className="safety-case-list">
              {shown.map((item) => (
                <button
                  className="safety-case"
                  key={item.id}
                  aria-pressed={selected === item.id}
                  aria-label={`Review ${item.id}: ${item.reason} on ${item.game}`}
                  onClick={() => inspect(item.id)}
                >
                  <div className="safety-case-top">
                    <span>
                      {item.kind === "Comment" ? <MessageSquare size={12} /> : <Gamepad2 size={12} />} {item.kind}
                      {item.id}
                    </span>
                    <span>{item.age}</span>
                  </div>
                  <div className="safety-case-title">
                    <img src={item.cover} alt="" />
                    <span>
                      <strong>{item.game}</strong>
                      <span>{item.reason}</span>
                    </span>
                    <ChevronRight size={15} />
                  </div>
                  <div className="safety-case-bottom">
                    <span>
                      <Flag size={12} />
                      {item.reports.length} {item.reports.length === 1 ? "report" : "reports"}
                    </span>
                    {item.priority === "High" && <StatusPill tone="amber">High priority</StatusPill>}
                    <span className="safety-assignee-mini">
                      {item.assignee ? (
                        <>
                          <Avatar name={item.assignee} />
                          {item.assignee === "You" ? "You" : item.assignee.split(" ")[0]}
                        </>
                      ) : item.state === "Escalated" ? (
                        <StatusPill tone="purple">Escalated</StatusPill>
                      ) : (
                        <span>Unassigned</span>
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title={
                query || mine || kind !== "all"
                  ? "No matching reports"
                  : view === "resolved"
                    ? "No resolved reports yet"
                    : "No open reports"
              }
              action={
                query || mine || kind !== "all" ? (
                  <Button variant="outline" onClick={reset}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            >
              {query || mine || kind !== "all"
                ? "Try another search or clear your filters."
                : "New reports will appear here. There’s nothing to review right now."}
            </Empty>
          )}
        </section>
        <section className="safety-investigation" aria-label="Report investigation">
          {state === "loading" || state === "error" || !active || !cases.length ? (
            <Empty title={state === "loading" ? "Preparing your queue" : "Select a report"}></Empty>
          ) : (
            <>
              <div className="safety-investigation-head">
                <BackButton onClick={() => setMobileDetail(false)} />
                <div className="safety-case-reference">
                  <span>{active.id}</span>
                  <CopyButton value={active.id} label="Copy report ID" compact />
                  <StatusPill
                    tone={active.state === "Resolved" ? "green" : active.state === "Escalated" ? "purple" : "quiet"}
                  >
                    {active.state === "Resolved" && <Check size={11} />} {active.state}
                  </StatusPill>
                </div>
                <div className="safety-detail-title">
                  <img src={active.cover} alt="" />
                  <div>
                    <h2>{active.game}</h2>
                    <p>{active.kind === "Comment" ? `Comment by ${active.author}` : `Game by ${active.author}`}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={`https://${active.game === "Orchard Snake" ? "spawn-snake" : active.game === "Prism Break" ? "prism-break" : "starfall-squadron"}.spawnkit.games`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open game
                      <ArrowUpRight />
                    </a>
                  </Button>
                </div>
                <div className="safety-detail-meta">
                  <span>
                    <Flag size={13} />
                    {active.reports.length} grouped {active.reports.length === 1 ? "report" : "reports"}
                  </span>
                  <span>
                    <Clock3 size={13} />
                    First reported Oct 17, {active.reports.at(-1)?.time}
                  </span>
                </div>
              </div>
              <div className="safety-investigation-content">
                {active.state === "Resolved" && (
                  <Notice tone="green">
                    <strong>{active.outcome ?? "Report resolved"}</strong>
                  </Notice>
                )}
                {active.state === "Escalated" && (
                  <Notice>
                    <strong>Admin review requested</strong>
                  </Notice>
                )}
                {other && active.state !== "Resolved" && (
                  <Notice tone="amber">
                    <strong>{active.assignee} is reviewing this case</strong>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setHandoff(true)
                        setTakeoverNote("")
                      }}
                      disabled={!editable}
                    >
                      {role === "Admin" ? "Take over review" : "Request handoff"}
                    </Button>
                  </Notice>
                )}
                <Tabs defaultValue="evidence" key={active.id}>
                  <TabsList variant="line" className="safety-detail-tabs">
                    <TabsTrigger value="evidence">
                      <Flag />
                      Evidence
                    </TabsTrigger>
                    <TabsTrigger value="activity">
                      <History />
                      History & notes
                      <span className="safety-count">{events.filter((item) => item.caseId === active.id).length}</span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="evidence">
                    <section className="safety-evidence-section">
                      <div className="safety-section-heading">
                        <h3>{active.kind === "Comment" ? "Reported comment" : "Reported issue"}</h3>
                        <StatusPill>{active.reason}</StatusPill>
                      </div>
                      {active.current && (
                        <>
                          <Notice tone="amber">
                            <strong>The comment was edited after it was reported</strong>
                          </Notice>
                          <div className="safety-version-toggle">
                            <Button
                              variant={version === "reported" ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => setVersion("reported")}
                            >
                              Reported version
                            </Button>
                            <Button
                              variant={version === "current" ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => {
                                setVersion("current")
                                setCurrentSeen(true)
                              }}
                            >
                              Current version
                            </Button>
                          </div>
                        </>
                      )}
                      <div className="safety-evidence">
                        <div>
                          <Avatar name={active.author} />
                          <strong>{active.author}</strong>
                          <span>{version === "current" ? "Edited at 10:12 AM" : "Captured at time of report"}</span>
                        </div>
                        <blockquote>
                          {version === "current" && active.current ? active.current : active.content}
                        </blockquote>
                        <footer>
                          {active.kind === "Comment"
                            ? "Links are displayed as plain text for review."
                            : "Unverified player report."}
                        </footer>
                      </div>
                      {active.kind === "Comment" && (
                        <details className="safety-context">
                          <summary>
                            View conversation context
                            <ChevronDown size={15} />
                          </summary>
                          <article>
                            <Avatar name="Juniper" />
                            <div>
                              <strong>
                                juniper<span>Before the reported comment</span>
                              </strong>
                              <p>The orchard looks lovely. Just hit a personal best of 280!</p>
                            </div>
                          </article>
                          <article>
                            <Avatar name="Sky" />
                            <div>
                              <strong>
                                skybound<span>After the reported comment</span>
                              </strong>
                              <p>Does anyone have tips for the faster levels?</p>
                            </div>
                          </article>
                        </details>
                      )}
                    </section>
                    <section className="safety-evidence-section">
                      <div className="safety-section-heading">
                        <h3>
                          What players reported<span>{active.reports.length}</span>
                        </h3>
                        <span className="safety-muted">Newest first</span>
                      </div>
                      <div className="safety-reporter-list">
                        {active.reports.map((report, index) => (
                          <details key={report.id} open={index === 0}>
                            <summary>
                              <span className="safety-reporter-icon">
                                <Flag size={13} />
                              </span>
                              <span>
                                <strong>Reporter {report.id}</strong>
                              </span>
                              <time>{report.time}</time>
                              <ChevronDown size={14} />
                            </summary>
                            <p>{report.detail}</p>
                          </details>
                        ))}
                      </div>
                      <p className="safety-private-note">
                        <LockKeyhole size={12} />
                        Reporter identities are never shared with the creator or comment author.
                      </p>
                    </section>
                  </TabsContent>
                  <TabsContent value="activity">
                    <div className="safety-timeline">
                      {events.filter((event) => event.caseId === active.id).length ? (
                        events
                          .filter((event) => event.caseId === active.id)
                          .map((event) => (
                            <article key={event.id}>
                              <span>
                                <ShieldCheck size={14} />
                              </span>
                              <div>
                                <header>
                                  <strong>{event.action}</strong>
                                  <time>{event.time}</time>
                                </header>
                                <p>{event.note}</p>
                                <small>{event.actor}</small>
                              </div>
                            </article>
                          ))
                      ) : (
                        <Empty title="No decisions yet">
                          Assignment changes, notes and decisions will be recorded here.
                        </Empty>
                      )}
                    </div>
                    <form
                      className="safety-internal-note"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (!note.trim()) return
                        record("Added an internal note", note.trim())
                        setNote("")
                        setNotice("Internal note added to the case history.")
                      }}
                    >
                      <label htmlFor="internal-case-note">Add an internal note</label>
                      <Textarea
                        id="internal-case-note"

                        value={note}
                        maxLength={500}
                        onChange={(event) => setNote(event.target.value)}
                        disabled={!editable}
                      />
                      <div>
                        <span>
                          <LockKeyhole size={12} />
                          Team only.
                        </span>
                        <Button type="submit" size="sm" disabled={!editable || !note.trim()}>
                          Add note
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
              <footer className="safety-review-actions">
                <div>
                  <Avatar name={active.assignee ?? "Unassigned"} />
                  <span>
                    <small>Assigned to</small>
                    <strong>{active.assignee ?? "No one yet"}</strong>
                  </span>
                </div>
                {active.state === "Resolved" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!editable}
                      onClick={() => setDecision("Reopen report")}
                    >
                      Reopen
                    </Button>
                    <Button
                      size="sm"
                      disabled={!open.length}
                      onClick={() => {
                        const next = open.find((item) => item.id !== selected)
                        if (next) {
                          inspect(next.id)
                          setView("open")
                        }
                      }}
                    >
                      Next report
                      <ArrowRight />
                    </Button>
                  </>
                ) : !active.assignee ? (
                  <Button disabled={!editable} onClick={start}>
                    Start review
                    <ArrowRight />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!editable || other}
                      onClick={() => setDecision("Escalate to admin")}
                    >
                      Escalate
                    </Button>
                    <Button
                      size="sm"
                      disabled={!editable || other || Boolean(active.current && !currentSeen)}
                      onClick={() => setDecision(active.kind === "Comment" ? "Hide comment" : "Hide from discovery")}
                    >
                      Make a decision
                      <ChevronRight />
                    </Button>
                  </>
                )}
                {active.current && !currentSeen && active.state !== "Resolved" && (
                  <small className="safety-action-hint">Review the current version before deciding.</small>
                )}
              </footer>
            </>
          )}
        </section>
      </div>
      {decision && active && (
        <ReviewDecision
          item={active}
          kind={decision}
          role={role}
          scenario={state}
          close={() => setDecision(null)}
          save={save}
          onConflict={(draft) => {
            setNote(draft)
            update({ state: "Resolved", outcome: "No violation found", assignee: "Alex Morgan" })
            record("Decision changed elsewhere", "Alex Morgan resolved this case while it was open.")
            setDecision(null)
            setNotice("Latest decision loaded. Unsent notes are in History & notes.")
          }}
        />
      )}
      <PreviewDialog
        open={handoff}
        onClose={() => setHandoff(false)}
        title={role === "Admin" ? "Take over review" : "Request a handoff"}
        description={role === "Admin" ? "Assigns the case to you." : "The current reviewer keeps the assignment."}
      >
        <form
          className="safety-dialog-body"
          onSubmit={(event) => {
            event.preventDefault()
            record(role === "Admin" ? "Took over review" : "Requested a handoff", takeoverNote.trim())
            if (role === "Admin") update({ assignee: "You" })
            setHandoff(false)
            setNotice(
              role === "Admin" ? "The case is now assigned to you." : "Handoff request added to the case history."
            )
          }}
        >
          <div className="safety-field">
            <label htmlFor="handoff-reason">
              Reason <span>Required</span>
            </label>
            <Textarea
              id="handoff-reason"
              value={takeoverNote}
              maxLength={500}
              onChange={(event) => setTakeoverNote(event.target.value)}
            />
          </div>
          <div className="safety-dialog-actions">
            <Button variant="outline" type="button" onClick={() => setHandoff(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!takeoverNote.trim()}>
              {role === "Admin" ? "Take over review" : "Save request"}
            </Button>
          </div>
        </form>
      </PreviewDialog>
    </SafetyShell>
  )
}
