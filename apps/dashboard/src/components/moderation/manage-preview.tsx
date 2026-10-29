import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Flag,
  Gamepad2,
  Gauge,
  History,
  Inbox,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  UserRound,
  Users,
  X
} from "lucide-react"
import { useState, type KeyboardEvent } from "react"
import { BrandSymbol, BrandWordmark } from "../brand"
import { SidebarAccount } from "../sidebar-account"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "../ui/sidebar"
import { Textarea } from "../ui/textarea"
import {
  manageGames,
  manageComments,
  manageEvents,
  type ManagedGame,
  type ManagedComment,
  type ModerationEvent
} from "./manage-fixtures"
import "./manage-preview.css"

type View = "Games" | "Comments" | "Activity"
function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
  const tabs = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  const current = tabs.indexOf(event.currentTarget)
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length
  event.preventDefault()
  tabs[next]!.focus()
  tabs[next]!.click()
}
type Decision = {
  kind: "hide-game" | "restrict" | "restore-game" | "hide-comment" | "restore-comment" | "dismiss"
  game: ManagedGame
  comment?: ManagedComment
}
const labels = {
  "hide-game": "Hide from discovery",
  restrict: "Restrict game access",
  "restore-game": "Restore game",
  "hide-comment": "Hide comment",
  "restore-comment": "Restore comment",
  dismiss: "Dismiss reports"
}
function Status({ status }: { status: ManagedGame["status"] }) {
  const Icon = status === "Published" ? Check : status === "Hidden" ? EyeOff : LockKeyhole
  return (
    <span className="manage-status" data-status={status}>
      <Icon size={12} />
      {status}
    </span>
  )
}
function ReportCount({ count }: { count: number }) {
  return count ? (
    <span className="manage-reports">
      <Flag size={12} />
      {count}
    </span>
  ) : (
    <span className="manage-quiet">—</span>
  )
}

/** Interactive design only. No platform API calls or persistent moderation actions. */
export function ManagePreview({
  initialView = "Games",
  reviewGame = false,
  empty = false,
  role = "Admin",
  state = "ready"
}: {
  initialView?: View
  reviewGame?: boolean
  empty?: boolean
  role?: "Admin" | "Moderator" | "Viewer"
  state?: "ready" | "loading" | "error"
}) {
  const [view, setView] = useState<View>(initialView)
  const [games, setGames] = useState(empty ? [] : manageGames)
  const [comments, setComments] = useState(empty ? [] : manageComments)
  const [events, setEvents] = useState(empty ? [] : manageEvents)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [assigned, setAssigned] = useState(false)
  const [selected, setSelected] = useState<string | null>(reviewGame ? "orchard" : null)
  const [detailView, setDetailView] = useState<"Overview" | "Comments" | "History">("Overview")
  const [decision, setDecision] = useState<Decision | null>(null)
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [notice, setNotice] = useState("")
  const [guidelines, setGuidelines] = useState(false)
  const [loadState, setLoadState] = useState(state)
  const editable = role !== "Viewer"
  const active = games.find((game) => game.id === selected)
  const search = query.trim().toLowerCase()
  const attention = games.filter((game) => game.reports > 0).length
  const reportedComments = comments.filter((comment) => comment.reports > 0 && !comment.hidden).length
  const shownGames = games.filter(
    (game) =>
      `${game.title} ${game.creator} ${game.id}`.toLowerCase().includes(search) &&
      (!assigned || game.assigned === "You") &&
      (filter === "all" || (filter === "reported" ? game.reports > 0 : game.status.toLowerCase() === filter))
  )
  const shownComments = comments.filter((comment) => {
    const game = games.find((item) => item.id === comment.gameId)
    return (
      `${comment.text} ${comment.author} ${game?.title}`.toLowerCase().includes(search) &&
      (!assigned || game?.assigned === "You") &&
      (filter === "all" ||
        (filter === "reported"
          ? comment.reports > 0 && !comment.hidden
          : filter === "hidden"
            ? comment.hidden
            : !comment.hidden))
    )
  })
  function switchView(next: View) {
    setView(next)
    setFilter("all")
    setQuery("")
    setAssigned(false)
  }
  function inspect(game: ManagedGame) {
    setSelected(game.id)
    setDetailView("Overview")
  }
  function propose(next: Decision) {
    setDecision(next)
    setReason("")
    setNote("")
  }
  function recordEvent(action: string, game: ManagedGame, detail: string) {
    setEvents((items) => [
      { id: crypto.randomUUID(), actor: "You", action, target: game.title, reason: detail, time: "Just now" },
      ...items
    ])
  }
  function confirm() {
    if (
      !decision ||
      !reason ||
      !note.trim() ||
      !editable ||
      ((decision.kind === "restrict" || (decision.kind === "restore-game" && decision.game.status === "Restricted")) &&
        role !== "Admin")
    )
      return
    const { kind, game, comment } = decision
    if (comment)
      setComments((items) =>
        items.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                hidden: kind === "hide-comment" ? true : kind === "restore-comment" ? false : item.hidden,
                reports: 0
              }
            : item
        )
      )
    else
      setGames((items) =>
        items.map((item) =>
          item.id === game.id
            ? {
                ...item,
                reports: 0,
                status:
                  kind === "hide-game"
                    ? "Hidden"
                    : kind === "restrict"
                      ? "Restricted"
                      : kind === "restore-game"
                        ? "Published"
                        : item.status
              }
            : item
        )
      )
    recordEvent(labels[kind], game, `${reason}: ${note.trim()}`)
    setNotice(`${labels[kind]} saved for ${comment ? `@${comment.author}'s comment` : game.title}.`)
    setDecision(null)
  }
  function commentCard(comment: ManagedComment, compact = false) {
    const game = games.find((item) => item.id === comment.gameId)!
    return (
      <article className="manage-comment" key={comment.id} data-hidden={comment.hidden}>
        <span className="manage-avatar">{comment.initials}</span>
        <div className="manage-comment-body">
          <div className="manage-comment-meta">
            <strong>@{comment.author}</strong>
            <span>{comment.time}</span>
            {comment.hidden && (
              <span className="manage-status" data-status="Hidden">
                <EyeOff size={12} />
                Hidden
              </span>
            )}
          </div>
          {!compact && (
            <button
              className="manage-text-link"
              onClick={() => {
                inspect(game)
                setDetailView("Comments")
              }}
            >
              {game.title}
              <ChevronRight size={12} />
            </button>
          )}
          <p>{comment.text}</p>
          <div className="manage-comment-bottom">
            <span className="manage-comment-flag">
              {comment.reports > 0 ? (
                <>
                  <Flag size={12} />
                  {comment.reports} reports: {comment.reason}
                </>
              ) : (
                "No open reports"
              )}
            </span>
            <div className="manage-comment-actions">
              {comment.reports > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!editable}
                  onClick={() => propose({ kind: "dismiss", game, comment })}
                >
                  Dismiss reports
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={!editable}
                onClick={() => propose({ kind: comment.hidden ? "restore-comment" : "hide-comment", game, comment })}
              >
                {comment.hidden ? <Eye /> : <EyeOff />}
                {comment.hidden ? "Restore" : "Hide comment"}
              </Button>
            </div>
          </div>
        </div>
      </article>
    )
  }
  function eventList(items: ModerationEvent[]) {
    return (
      <div className="manage-history">
        {items.length ? (
          items.map((event) => (
            <article key={event.id}>
              <span className="manage-history-icon">
                <ShieldCheck size={15} />
              </span>
              <div>
                <p>
                  <strong>{event.actor}</strong>: {event.action}
                </p>
                <span className="manage-history-target">{event.target}</span>
                <p className="manage-history-reason">{event.reason}</p>
                <time>{event.time}</time>
              </div>
            </article>
          ))
        ) : (
          <p className="manage-muted">No moderation decisions yet.</p>
        )}
      </div>
    )
  }
  return (
    <SidebarProvider defaultOpen>
      <div className="manage-root">
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-4 py-6">
            <div className="flex items-center gap-2.5">
              <BrandSymbol />
              <BrandWordmark className="group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton disabled tooltip="Dashboard">
                    <Gauge />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Community</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton disabled tooltip="Submissions">
                    <Inbox />
                    <span>Submissions</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Manage">
                    <ShieldCheck />
                    <span>Manage</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="manage-side-note group-data-[collapsible=icon]:hidden">
              <ShieldCheck size={16} />
              <div>
                <strong>Community team</strong>
                <span>{role} access</span>
              </div>
            </div>
            <SidebarAccount account={{ name: "Alex Morgan", email: "Community team" }} />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="min-w-0">
          <header className="manage-topbar">
            <div>
              <SidebarTrigger />
              <span className="manage-topbar-divider" />
              <span className="manage-muted">Community</span>
              <ChevronRight size={13} />
              <strong>Manage</strong>
            </div>
            <span className="manage-role">
              <ShieldCheck size={13} />
              {role}
            </span>
          </header>
          <main className="manage-main">
            <div className="manage-heading">
              <div>
                <div className="manage-eyebrow">COMMUNITY OPERATIONS</div>
                <h1>Manage</h1>
                <p>A great place to play starts with a healthy community.</p>
              </div>
              <Button variant="outline" onClick={() => setGuidelines(true)}>
                <CircleHelp />
                Moderation guide
              </Button>
            </div>
            <div className="manage-summary">
              <button
                onClick={() => {
                  switchView("Games")
                  setFilter("all")
                }}
              >
                <span className="manage-summary-icon">
                  <Gamepad2 />
                </span>
                <div>
                  <span>Community games</span>
                  <strong>
                    {games.length}
                    <small>{games.filter((game) => game.status === "Published").length} published</small>
                  </strong>
                </div>
              </button>
              <button
                onClick={() => {
                  switchView("Games")
                  setFilter("reported")
                }}
              >
                <span className="manage-summary-icon manage-amber">
                  <Flag />
                </span>
                <div>
                  <span>Games to review</span>
                  <strong>
                    {attention}
                    <small>with open reports</small>
                  </strong>
                </div>
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => {
                  switchView("Comments")
                  setFilter("reported")
                }}
              >
                <span className="manage-summary-icon">
                  <MessageSquare />
                </span>
                <div>
                  <span>Reported comments</span>
                  <strong>
                    {reportedComments}
                    <small>need a decision</small>
                  </strong>
                </div>
                <ChevronRight size={15} />
              </button>
            </div>
            {role === "Viewer" && (
              <div className="manage-access">
                <Eye size={16} />
                You have view access. A moderator can make changes.
              </div>
            )}
            {notice && (
              <output className="manage-notice">
                <Check size={16} />
                <span>{notice}</span>
                <Button size="icon-xs" variant="ghost" aria-label="Dismiss notification" onClick={() => setNotice("")}>
                  <X />
                </Button>
              </output>
            )}
            <section className="manage-workspace" aria-label="Community moderation">
              <div className="manage-tabs" role="tablist" aria-label="Manage content">
                {(["Games", "Comments", "Activity"] as const).map((item) => (
                  <button
                    key={item}
                    role="tab"
                    aria-selected={view === item}
                    tabIndex={view === item ? 0 : -1}
                    onKeyDown={moveTab}
                    onClick={() => switchView(item)}
                  >
                    {item === "Games" ? <Gamepad2 /> : item === "Comments" ? <MessageSquare /> : <History />}
                    {item}
                    {item !== "Activity" && <span>{item === "Games" ? games.length : comments.length}</span>}
                  </button>
                ))}
                <span className="manage-team">
                  <Users size={14} />
                  Shared workspace
                </span>
              </div>
              {view !== "Activity" && (
                <div className="manage-toolbar">
                  <div className="manage-search">
                    <Search size={16} />
                    <Input
                      aria-label={view === "Games" ? "Search games" : "Search comments"}
                      placeholder={
                        view === "Games"
                          ? "Search by game, creator, or project ID…"
                          : "Search comments, authors, or games…"
                      }
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    {query && (
                      <button aria-label="Clear search" onClick={() => setQuery("")}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger aria-label="Filter status" className="manage-filter">
                      <SlidersHorizontal size={14} />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="reported">Needs review</SelectItem>
                      <SelectItem value="published">{view === "Games" ? "Published" : "Visible"}</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      {view === "Games" && <SelectItem value="restricted">Restricted</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Button
                    variant={assigned ? "secondary" : "outline"}
                    aria-pressed={assigned}
                    onClick={() => setAssigned(!assigned)}
                  >
                    <UserRound />
                    Assigned to me
                  </Button>
                </div>
              )}
              {loadState === "loading" ? (
                <div className="manage-loading" aria-label="Loading community content" aria-busy="true">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n}>
                      <span />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              ) : loadState === "error" ? (
                <div className="manage-empty">
                  <ShieldOff />
                  <h2>We couldn’t load the community</h2>
                  <p>Your filters and moderation decisions are safe.</p>
                  <Button variant="outline" onClick={() => setLoadState("ready")}>
                    Try again
                  </Button>
                </div>
              ) : view === "Activity" ? (
                eventList(events)
              ) : view === "Games" && shownGames.length ? (
                <div className="manage-table-wrap">
                  <table className="manage-table">
                    <thead>
                      <tr>
                        <th>Game</th>
                        <th>Creator</th>
                        <th>Status</th>
                        <th>Reports</th>
                        <th>Views</th>
                        <th>Updated</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownGames.map((game) => (
                        <tr key={game.id}>
                          <td aria-label={game.title}>
                            <button
                              className="manage-game-identity"
                              aria-label={`Open ${game.title} review`}
                              onClick={() => inspect(game)}
                            >
                              <img src={game.cover} alt="" width="76" height="50" />
                              <span>
                                <strong>{game.title}</strong>
                                <small>
                                  <span>{game.genre}</span>
                                  <span>{game.dimension}</span>
                                </small>
                              </span>
                            </button>
                          </td>
                          <td>
                            <div className="manage-creator">
                              <span className="manage-avatar">{game.initials}</span>
                              {game.creator}
                            </div>
                          </td>
                          <td>
                            <Status status={game.status} />
                          </td>
                          <td>
                            <ReportCount count={game.reports} />
                          </td>
                          <td className="manage-views">{game.views}</td>
                          <td className="manage-updated">{game.updated}</td>
                          <td>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Review ${game.title}`}
                              onClick={() => inspect(game)}
                            >
                              <ChevronRight />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : view === "Comments" && shownComments.length ? (
                <div className="manage-comments">{shownComments.map((comment) => commentCard(comment))}</div>
              ) : (
                <div className="manage-empty">
                  <Search />
                  <h2>
                    {query || filter !== "all" || assigned
                      ? "Nothing matches this view"
                      : view === "Games"
                        ? "Your community starts here"
                        : "No comments yet"}
                  </h2>
                  <p>
                    {query || filter !== "all" || assigned
                      ? "Try another search or clear your filters."
                      : "New community activity will appear here."}
                  </p>
                  {(query || filter !== "all" || assigned) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuery("")
                        setFilter("all")
                        setAssigned(false)
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
              <footer className="manage-table-footer">
                <span>
                  {view === "Games"
                    ? `${shownGames.length} of ${games.length} games`
                    : view === "Comments"
                      ? `${shownComments.length} of ${comments.length} comments`
                      : `${events.length} decisions`}
                </span>
              </footer>
            </section>
          </main>
        </SidebarInset>
        <Sheet
          open={Boolean(active)}
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        >
          <SheetContent className="manage-inspector" aria-describedby="manage-review-description">
            <SheetHeader>
              <div className="manage-eyebrow">GAME REVIEW</div>
              <SheetTitle>{active?.title}</SheetTitle>
              <SheetDescription id="manage-review-description">
                Review the game, its community, and past decisions.
              </SheetDescription>
            </SheetHeader>
            {active && (
              <>
                <div className="manage-inspector-scroll">
                  <div className="manage-game-cover">
                    <img src={active.cover} alt={`${active.title} cover`} />
                    <span>
                      <Status status={active.status} />
                    </span>
                    {active.url ? (
                      <Button size="sm" variant="secondary" asChild>
                        <a href={active.url} target="_blank" rel="noreferrer">
                          Open game
                          <ArrowUpRight />
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled>
                        Sample game
                      </Button>
                    )}
                  </div>
                  <div className="manage-detail-meta">
                    <span className="manage-avatar">{active.initials}</span>
                    <div>
                      <strong>{active.creator}</strong>
                      <span className="manage-detail-classification">
                        <span>{active.genre}</span>
                        <span>{active.dimension}</span>
                      </span>
                    </div>
                    <span>
                      <Eye size={13} />
                      {active.views} views
                    </span>
                  </div>
                  <div className="manage-detail-tabs" role="tablist" aria-label="Game details">
                    {(["Overview", "Comments", "History"] as const).map((item) => (
                      <button
                        key={item}
                        role="tab"
                        aria-selected={detailView === item}
                        tabIndex={detailView === item ? 0 : -1}
                        onKeyDown={moveTab}
                        onClick={() => setDetailView(item)}
                      >
                        {item}
                        {item === "Comments" && <span>{comments.filter((c) => c.gameId === active.id).length}</span>}
                      </button>
                    ))}
                  </div>
                  {detailView === "Overview" ? (
                    <div className="manage-detail-content">
                      <div className="manage-report-panel">
                        <div>
                          <Flag size={16} />
                          <strong>{active.reports ? `${active.reports} open reports` : "No open game reports"}</strong>
                        </div>
                        <p>{active.reports ? active.reason : "This game has no unresolved game reports."}</p>
                        {active.reports > 0 && (
                          <p className="manage-muted">
                            Player reports are signals to investigate, not proof of a violation.
                          </p>
                        )}
                      </div>
                      <div className="manage-assignment">
                        <div>
                          <span className="manage-section-label">ASSIGNED TO</span>
                          <strong>
                            <UserRound size={14} />
                            {active.assigned ?? "Unassigned"}
                          </strong>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!editable}
                          onClick={() => {
                            const assignment = active.assigned === "You" ? null : "You"
                            setGames((items) =>
                              items.map((item) => (item.id === active.id ? { ...item, assigned: assignment } : item))
                            )
                            recordEvent(
                              assignment ? "Assigned review to themselves" : "Released review",
                              active,
                              "Review assignment updated."
                            )
                          }}
                        >
                          {active.assigned === "You" ? "Release" : "Assign to me"}
                        </Button>
                      </div>
                      <dl className="manage-facts">
                        <div>
                          <dt>Project ID</dt>
                          <dd>{active.id}</dd>
                        </div>
                        <div>
                          <dt>Last updated</dt>
                          <dd>{active.updated}</dd>
                        </div>
                        <div>
                          <dt>Visibility</dt>
                          <dd>
                            {active.status === "Published"
                              ? "Discoverable and playable"
                              : active.status === "Hidden"
                                ? "Playable by direct link"
                                : "Access restricted"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ) : detailView === "Comments" ? (
                    <div className="manage-detail-comments">
                      {comments.filter((comment) => comment.gameId === active.id).length ? (
                        comments
                          .filter((comment) => comment.gameId === active.id)
                          .map((comment) => commentCard(comment, true))
                      ) : (
                        <div className="manage-empty">
                          <MessageSquare />
                          <h2>No comments yet</h2>
                          <p>Comments on this game will appear here.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    eventList(events.filter((event) => event.target === active.title))
                  )}
                </div>
                <div className="manage-inspector-actions">
                  <Button
                    className="flex-1"
                    disabled={!editable || active.reports === 0}
                    onClick={() => propose({ kind: "dismiss", game: active })}
                  >
                    <Check />
                    Dismiss reports
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Game moderation actions" disabled={!editable}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={active.status === "Hidden" || active.status === "Restricted"}
                        onSelect={() => propose({ kind: "hide-game", game: active })}
                      >
                        <EyeOff />
                        Hide from discovery
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={active.status === "Published" || (active.status === "Restricted" && role !== "Admin")}
                        onSelect={() => propose({ kind: "restore-game", game: active })}
                      >
                        <Eye />
                        Restore game
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={role !== "Admin" || active.status === "Restricted"}
                        onSelect={() => propose({ kind: "restrict", game: active })}
                        className="text-destructive"
                      >
                        <LockKeyhole />
                        Restrict access{role !== "Admin" && " (Admin only)"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
        <Sheet
          open={Boolean(decision)}
          onOpenChange={(open) => {
            if (!open) setDecision(null)
          }}
        >
          <SheetContent side="bottom" className="manage-decision">
            <SheetHeader>
              <SheetTitle>{decision ? labels[decision.kind] : "Review decision"}</SheetTitle>
              <SheetDescription>
                {decision?.kind === "restrict"
                  ? "All game URLs and assets will be blocked, including direct links and older releases."
                  : decision?.kind === "hide-game"
                    ? "The game leaves discovery. People with a direct link can still play."
                    : decision?.kind === "hide-comment"
                      ? "The comment leaves the public conversation. Its record is retained for review."
                      : "Record your decision so the rest of the team has the same context."}
              </SheetDescription>
            </SheetHeader>
            <div className="manage-decision-body">
              <div className="manage-decision-target">
                <ShieldCheck size={16} />
                <strong>{decision?.game.title}</strong>
                {decision?.comment && <span>@{decision.comment.author}</span>}
              </div>
              <label htmlFor="moderation-reason">Reason</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="moderation-reason">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "No violation found",
                    "Spam or advertising",
                    "Harassment",
                    "Misleading listing",
                    "Unsafe content",
                    "Issue resolved",
                    "Other policy concern"
                  ].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label htmlFor="moderation-note">
                Decision notes <span>Required</span>
              </label>
              <Textarea
                id="moderation-note"
                placeholder="What did you find? Give the next moderator enough context."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
              />
              <div className="manage-note-limit">{note.length}/500</div>
              <div className="manage-decision-footer">
                <Button variant="outline" onClick={() => setDecision(null)}>
                  Cancel
                </Button>
                <Button
                  variant={decision?.kind === "restrict" ? "destructive" : "default"}
                  disabled={!reason || !note.trim() || !editable}
                  onClick={confirm}
                >
                  {decision ? labels[decision.kind] : "Save decision"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Sheet open={guidelines} onOpenChange={setGuidelines}>
          <SheetContent className="manage-guide">
            <SheetHeader>
              <SheetTitle>Moderation guide</SheetTitle>
              <SheetDescription>Use the lightest action that resolves the issue.</SheetDescription>
            </SheetHeader>
            <div>
              <section>
                <EyeOff />
                <h3>Hide from discovery</h3>
                <p>Remove a listing from browsing and search while leaving direct play available.</p>
              </section>
              <section>
                <LockKeyhole />
                <h3>Restrict access</h3>
                <p>For unsafe games. An admin blocks every hosted version and asset, including direct URLs.</p>
              </section>
              <section>
                <MessageSquare />
                <h3>Moderate the conversation</h3>
                <p>
                  Hide comments that violate the community guidelines. Keep criticism and differing opinions when they
                  follow the rules.
                </p>
              </section>
              <section>
                <History />
                <h3>Leave a clear record</h3>
                <p>
                  Review the context, choose a reason, and explain the decision. Hidden content can be restored after
                  review.
                </p>
              </section>
              <div className="manage-access">
                <Users size={16} />
                Moderators handle listings and comments. Admins also control access restrictions.
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </SidebarProvider>
  )
}
