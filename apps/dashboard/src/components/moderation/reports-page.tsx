import type {
  CommunityRole,
  ReportCase,
  ReportDetail,
  ReportAction,
  ReportCommand,
  ReportEvent,
  ReportItem
} from "@spawn/platform/community"
import { moderationReasons } from "@spawn/platform/moderation"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowUpRight, ChevronRight, Flag, Gamepad2, MessageSquare, Search, UserRound } from "lucide-react"
import { useState } from "react"
import { communityDate, communityRequest } from "../../lib/community"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { Empty, FilterSegments, Notice, PreviewDialog, StatusPill } from "./design/safety-shared"
import "./community-pages.css"

const labels: Record<ReportAction, string> = {
  claim: "Start review",
  takeover: "Take over review",
  handoff: "Request handoff",
  note: "Add note",
  resolve: "No action needed",
  "hide-game": "Hide game",
  "hide-comment": "Hide comment",
  "restrict-game": "Restrict game",
  escalate: "Escalate to admin",
  reopen: "Reopen report"
}
function useReportFeed<T>(
  current: ReportDetail | undefined,
  feed: "history" | "evidence",
  items: T[],
  nextCursor: string | null
) {
  return useInfiniteQuery({
    queryKey: ["community-report-feed", current?.id, current?.revision, feed],
    queryFn: ({ pageParam }) =>
      communityRequest<{ items: T[]; nextCursor: string | null }>(
        `admin/reports/${current?.id}?${new URLSearchParams({ feed, cursor: pageParam })}`
      ),
    initialPageParam: "",
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    ...(current ? { initialData: { pages: [{ items, nextCursor }], pageParams: [""] } } : {}),
    enabled: Boolean(current),
    staleTime: Infinity
  })
}
export function LiveReports() {
  const client = useQueryClient()
  const [view, setView] = useState("open"),
    [kind, setKind] = useState("all"),
    [mine, setMine] = useState(false),
    [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null),
    [mobileDetail, setMobileDetail] = useState(false)
  const [version, setVersion] = useState("reported"),
    [seenVersion, setSeenVersion] = useState<string | null>(null)
  const [action, setAction] = useState<ReportAction | null>(null),
    [reason, setReason] = useState(""),
    [note, setNote] = useState("")
  const queue = useInfiniteQuery({
    queryKey: ["community-reports", view, kind, mine, query],
    queryFn: ({ pageParam }) =>
      communityRequest<{ items: ReportCase[]; nextCursor: string | null; role: CommunityRole; userId: string }>(
        `admin/reports?${new URLSearchParams({ state: view, kind, mine: String(mine), q: query, ...(pageParam ? { cursor: pageParam } : {}) })}`
      ),
    initialPageParam: "",
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    refetchInterval: 30_000
  })
  const detail = useQuery({
    queryKey: ["community-report", selected],
    queryFn: () => communityRequest<ReportDetail>(`admin/reports/${selected}`),
    enabled: Boolean(selected),
    refetchInterval: 30_000
  })
  const items = queue.data?.pages.flatMap((p) => p.items) ?? [],
    access = queue.data?.pages[0]
  const current = detail.data,
    editable = Boolean(access && access.role !== "Observer"),
    assigned = current?.assigneeId === access?.userId
  const needsAdmin = current?.state === "escalated" && access?.role !== "Admin"
  const history = useReportFeed<ReportEvent>(current, "history", current?.events ?? [], current?.historyCursor ?? null)
  const evidence = useReportFeed<ReportItem>(
    current,
    "evidence",
    current?.evidence ?? [],
    current?.evidenceCursor ?? null
  )
  const historyItems = history.data?.pages.flatMap((page) => page.items) ?? []
  const evidenceItems = evidence.data?.pages.flatMap((page) => page.items) ?? []
  const activeFeed = version === "history" ? history : evidence
  const reviewed = current?.contentVersion === seenVersion
  const mutation = useMutation({
    mutationFn: (body: ReportCommand) => communityRequest(`admin/reports/${selected}`, body),
    onSuccess: async () => {
      setAction(null)
      setNote("")
      await Promise.all([
        client.invalidateQueries({ queryKey: ["community-reports"] }),
        client.invalidateQueries({ queryKey: ["community-report", selected] }),
        client.invalidateQueries({ queryKey: ["manage"] })
      ])
    }
  })
  const open = (next: ReportAction) => {
    mutation.reset()
    setAction(next)
    setReason("")
    setNote("")
  }
  function inspect(id: string) {
    setSelected(id)
    setMobileDetail(true)
    setSeenVersion(null)
    setVersion("reported")
    mutation.reset()
  }
  function submit(next: ReportAction) {
    if (current)
      mutation.mutate({
        requestId: crypto.randomUUID(),
        revision: current.revision,
        action: next,
        reason,
        note,
        contentVersion: current.contentVersion
      })
  }
  const decisions = ["resolve", "hide-game", "hide-comment", "restrict-game", "escalate", "reopen"]
  return (
    <section className="community-page" aria-label="Reports">
      <header className="community-heading">
        <h1>Reports</h1>
        {access && <StatusPill>{access.role}</StatusPill>}
      </header>
      <div className="safety-report-workspace" data-detail={mobileDetail}>
        <section className="safety-queue" aria-label="Report queue">
          <FilterSegments
            value={view}
            onChange={setView}
            label="Report status"
            line
            items={[
              { value: "open", label: "Open" },
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
                onChange={(e) => setQuery(e.target.value)}
              />
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
                size="sm"
                variant={mine ? "secondary" : "outline"}
                aria-pressed={mine}
                onClick={() => setMine(!mine)}
              >
                <UserRound />
                Assigned to me
              </Button>
            </div>
          </div>
          {queue.error ? (
            <Empty
              title="Unable to load reports"
              action={<Button onClick={() => void queue.refetch()}>Try again</Button>}
            >
              {queue.error.message}
            </Empty>
          ) : queue.isPending ? (
            <Empty title="Loading reports" />
          ) : items.length === 0 ? (
            <Empty
              title={
                query || mine || kind !== "all"
                  ? "No matching reports"
                  : view === "resolved"
                    ? "No resolved reports"
                    : "No open reports"
              }
            />
          ) : (
            <div className="safety-case-list">
              {items.map((item) => (
                <button
                  className="safety-case"
                  key={item.id}
                  aria-pressed={selected === item.id}
                  aria-label={`Review ${item.title}: ${item.reason}`}
                  onClick={() => inspect(item.id)}
                >
                  <div className="safety-case-top">
                    <span>
                      {item.kind === "Game" ? <Gamepad2 size={12} /> : <MessageSquare size={12} />} {item.kind}
                    </span>
                    <time dateTime={item.createdAt}>{communityDate(item.createdAt)}</time>
                  </div>
                  <div className="safety-case-title">
                    <span>
                      <strong>{item.title}</strong>
                      <span>{item.reason}</span>
                    </span>
                    <ChevronRight size={15} />
                  </div>
                  <div className="safety-case-bottom">
                    <span>
                      <Flag size={12} />
                      {item.reports} {item.reports === 1 ? "report" : "reports"}
                    </span>
                    {item.state === "escalated" ? (
                      <StatusPill tone="purple">Escalated</StatusPill>
                    ) : (
                      <span>{item.assigneeId === access?.userId ? "You" : item.assigneeName || "Unassigned"}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {queue.hasNextPage && (
            <Button variant="ghost" disabled={queue.isFetchingNextPage} onClick={() => void queue.fetchNextPage()}>
              Load more
            </Button>
          )}
        </section>
        <section className="safety-investigation" aria-label="Report investigation">
          {!selected ? (
            <Empty title="Select a report" />
          ) : detail.error ? (
            <Empty
              title="Unable to load report"
              action={<Button onClick={() => void detail.refetch()}>Try again</Button>}
            >
              {detail.error.message}
            </Empty>
          ) : !current ? (
            <Empty title="Loading report" />
          ) : (
            <>
              <header className="community-investigation-header">
                <Button className="community-back" size="sm" variant="ghost" onClick={() => setMobileDetail(false)}>
                  <ArrowLeft />
                  Reports
                </Button>
                <div>
                  <div>
                    <StatusPill
                      tone={current.state === "escalated" ? "purple" : current.state === "resolved" ? "green" : "quiet"}
                    >
                      {current.state === "resolved"
                        ? "Resolved"
                        : current.state === "escalated"
                          ? "Escalated"
                          : current.assigneeId
                            ? "In review"
                            : "Open"}
                    </StatusPill>
                    <span>{current.kind}</span>
                  </div>
                  <h2>{current.title}</h2>
                  <p>{current.reason}</p>
                </div>
                <div className="community-investigation-actions">
                  {current.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={current.url} target="_blank" rel="noreferrer">
                        Open game
                        <ArrowUpRight />
                      </a>
                    </Button>
                  )}
                  {editable &&
                    current.state !== "resolved" &&
                    !needsAdmin &&
                    (!current.assigneeId ? (
                      <Button size="sm" disabled={mutation.isPending} onClick={() => submit("claim")}>
                        Start review
                      </Button>
                    ) : !assigned && access?.role === "Admin" ? (
                      <Button variant="outline" size="sm" onClick={() => open("takeover")}>
                        Take over
                      </Button>
                    ) : null)}
                </div>
              </header>
              {mutation.error && !action && <Notice tone="red">{mutation.error.message}</Notice>}
              <div className="community-evidence">
                <FilterSegments
                  label="Evidence version"
                  value={version}
                  onChange={(value) => {
                    setVersion(value)
                    if (value === "current") setSeenVersion(current.contentVersion)
                  }}
                  items={[
                    { value: "reported", label: "Reported content" },
                    { value: "current", label: "Current content" },
                    { value: "history", label: "History" }
                  ]}
                />
                {version === "history" ? (
                  <div className="safety-timeline">
                    {historyItems.length === 0 ? (
                      <Empty title="No decisions yet" />
                    ) : (
                      historyItems.map((event) => (
                        <article key={event.id}>
                          <span>
                            <Flag size={13} />
                          </span>
                          <div>
                            <header>
                              <strong>{labels[event.action] ?? event.action}</strong>
                              <time dateTime={event.createdAt}>{communityDate(event.createdAt)}</time>
                            </header>
                            {event.reason && <p>{event.reason}</p>}
                            {event.note && <p>{event.note}</p>}
                            <small>{event.actorName}</small>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                ) : version === "current" ? (
                  <article className="community-evidence-card">
                    {current.current ? (
                      <>
                        <header>
                          <strong>{current.current.author || current.current.title}</strong>
                          {current.current.updatedAt && <time>{communityDate(current.current.updatedAt)}</time>}
                        </header>
                        <p>{current.current.body ?? current.current.description}</p>
                        {current.current.releaseId && <small>Release {current.current.releaseId.slice(0, 8)}</small>}
                      </>
                    ) : (
                      <p>This content has been removed.</p>
                    )}
                  </article>
                ) : (
                  evidenceItems.map((item) => (
                    <article className="community-evidence-card" key={item.id}>
                      <header>
                        <strong>{item.reason}</strong>
                        <time dateTime={item.createdAt}>{communityDate(item.createdAt)}</time>
                      </header>
                      <blockquote>
                        <strong>{item.snapshot.author || item.snapshot.title}</strong>
                        <p>{item.snapshot.body ?? item.snapshot.description}</p>
                      </blockquote>
                      {item.details && <p>{item.details}</p>}
                    </article>
                  ))
                )}
                {version !== "current" && activeFeed.error && <Notice tone="red">{activeFeed.error.message}</Notice>}
                {version !== "current" && activeFeed.hasNextPage && (
                  <Button
                    variant="ghost"
                    disabled={activeFeed.isFetchingNextPage}
                    onClick={() => void activeFeed.fetchNextPage()}
                  >
                    Load more {version === "history" ? "history" : "reports"}
                  </Button>
                )}
              </div>
              {editable && (
                <footer className="community-review-footer">
                  <div>
                    {current.state !== "resolved" && (
                      <Button variant="outline" size="sm" onClick={() => open("note")}>
                        Add note
                      </Button>
                    )}
                    {current.assigneeId && !assigned && current.state !== "resolved" && (
                      <Button variant="outline" size="sm" onClick={() => open("handoff")}>
                        Request handoff
                      </Button>
                    )}
                  </div>
                  {current.state === "resolved" ? (
                    <Button variant="outline" size="sm" onClick={() => open("reopen")}>
                      Reopen report
                    </Button>
                  ) : assigned && !needsAdmin ? (
                    <div>
                      {!reviewed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setVersion("current")
                            setSeenVersion(current.contentVersion)
                          }}
                        >
                          Review current content
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => open("resolve")}>
                            No action
                          </Button>
                          <Select value="" onValueChange={(value) => open(value as ReportAction)}>
                            <SelectTrigger aria-label="Moderation action">
                              <SelectValue placeholder="Take action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={current.kind === "Game" ? "hide-game" : "hide-comment"}>
                                Hide {current.kind.toLowerCase()}
                              </SelectItem>
                              {current.kind === "Game" && access?.role === "Admin" && (
                                <SelectItem value="restrict-game">Restrict game</SelectItem>
                              )}
                              <SelectItem value="escalate">Escalate to admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="community-assigned">
                      {needsAdmin
                        ? "Admin review required"
                        : current.assigneeName
                          ? `Assigned to ${current.assigneeName}`
                          : "Unassigned"}
                    </span>
                  )}
                </footer>
              )}
            </>
          )}
        </section>
      </div>
      <PreviewDialog
        open={Boolean(action)}
        onClose={() => {
          if (!mutation.isPending) setAction(null)
        }}
        title={action ? labels[action] : "Decision"}
      >
        {action && (
          <form
            className="community-form"
            onSubmit={(e) => {
              e.preventDefault()
              submit(action)
            }}
          >
            <p>{current?.title}</p>
            {decisions.includes(action) && (
              <label htmlFor="report-decision-reason">
                Reason
                <Select value={reason} onValueChange={setReason} required>
                  <SelectTrigger id="report-decision-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {moderationReasons.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
            <label>
              {action === "note" ? "Note" : "Decision notes"}
              <Textarea required maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
            </label>
            {mutation.error && <Notice tone="red">{mutation.error.message}</Notice>}
            <footer>
              <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button disabled={mutation.isPending || !note.trim() || (decisions.includes(action) && !reason)}>
                {mutation.isPending ? "Saving…" : "Confirm"}
              </Button>
            </footer>
          </form>
        )}
      </PreviewDialog>
    </section>
  )
}
