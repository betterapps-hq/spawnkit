import type { CommunityRole } from "@spawn/platform/community"
import {
  moderationActions,
  moderationEventActions,
  moderationReasons,
  type ManagedGame,
  type ManagedComment,
  type ModerationDecision,
  type ModerationEvent,
  type ModerationPage,
  type ModerationSummary
} from "@spawn/platform/moderation"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Gamepad2,
  History,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  X
} from "lucide-react"
import { useState, type KeyboardEvent, type ReactNode } from "react"
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
import { Textarea } from "../ui/textarea"
import "./manage-preview.css"
import "./manage-page.css"

class ManageError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}
async function api<T>(path: string, body?: ModerationDecision): Promise<T> {
  const response = await fetch(`/api/platform/v1/admin/manage/${path}`, {
    cache: "no-store",
    ...(body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})
  })
  const data = (await response.json().catch(() => null)) as (T & { error?: { message: string } }) | null
  if (!response.ok || !data)
    throw new ManageError(
      data?.error?.message ?? "The moderation service is unavailable. Please try again.",
      response.status
    )
  return data
}
const count = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value)
function DateLabel({ value }: { value: string }) {
  const date = new Date(value)
  return (
    <time dateTime={value} title={date.toLocaleString()}>
      <Clock3 size={12} />
      {Number.isNaN(date.getTime())
        ? "Unknown date"
        : date.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })}
    </time>
  )
}
function Cover({ game }: { game: ManagedGame }) {
  const [failed, setFailed] = useState(false)
  return game.coverUrl && !failed ? (
    <img src={game.coverUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <span className="manage-live-cover">
      <Gamepad2 aria-hidden="true" />
    </span>
  )
}
function Status({ status }: { status: ManagedGame["status"] }) {
  const Icon =
    status === "Restricted" ? LockKeyhole : status === "Hidden" ? EyeOff : status === "Published" ? Check : Eye
  return (
    <span className="manage-status" data-status={status}>
      <Icon size={12} />
      {status}
    </span>
  )
}
function Tabs<T extends string>({
  items,
  value,
  onChange,
  label
}: {
  items: readonly T[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  function key(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length
    event.preventDefault()
    onChange(items[next]!)
    event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>("button")[next]!.focus()
  }
  return (
    <div className="manage-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item}
          role="tab"
          aria-selected={value === item}
          tabIndex={value === item ? 0 : -1}
          onKeyDown={(event) => key(event, index)}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="manage-empty" role="alert">
      <ShieldCheck />
      <h2>
        {error instanceof ManageError && error.status === 403
          ? "Administrator access required"
          : "Unable to load this view"}
      </h2>
      <p>{error.message}</p>
      <Button variant="outline" onClick={retry}>
        <RefreshCw />
        Try again
      </Button>
    </div>
  )
}
function Loading() {
  return (
    <div className="manage-loading" aria-label="Loading moderation data" aria-busy="true">
      {[1, 2, 3, 4].map((n) => (
        <div key={n}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}
type Target = { game: ManagedGame; comment?: ManagedComment; action: ModerationDecision["action"] }
function useRows<T>(resource: string, query: string, status: string, project = "") {
  return useInfiniteQuery({
    queryKey: ["manage", resource, query, status, project],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<ModerationPage<T>>(
        `${resource}?${new URLSearchParams({ q: query, status, ...(project ? { project } : {}), ...(pageParam ? { cursor: pageParam } : {}) })}`
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: 1
  })
}
function More({ fetching, more, onClick }: { fetching: boolean; more: boolean; onClick: () => void }) {
  return more ? (
    <div className="manage-live-more">
      <Button variant="outline" disabled={fetching} onClick={onClick}>
        {fetching ? <LoaderCircle className="animate-spin" /> : null}Load more
      </Button>
    </div>
  ) : null
}
function Audit({ query = "", project = "" }: { query?: string; project?: string }) {
  const history = useRows<ModerationEvent>("history", query, "all", project)
  if (history.isPending) return <Loading />
  if (history.error) return <Failure error={history.error} retry={() => void history.refetch()} />
  const items = history.data.pages.flatMap((page) => page.items)
  return (
    <>
      <div className="manage-history">
        {items.length ? (
          items.map((event) => (
            <article key={event.id}>
              <span className="manage-history-icon">
                <ShieldCheck size={16} />
              </span>
              <div>
                <p>
                  <strong title={event.actorId}>{event.actorName}</strong> / {moderationEventActions[event.action]}
                </p>
                <span className="manage-history-target">
                  {event.gameTitle}
                  {event.commentId ? " / Comment" : ""}
                </span>
                <p className="manage-history-reason">
                  <b>{event.reason}</b> / {event.note}
                </p>
                <DateLabel value={event.createdAt} />
                <details className="manage-audit-detail">
                  <summary>Decision details</summary>
                  <p>
                    {event.commentId
                      ? `${JSON.parse(event.beforeState).hidden ? "Hidden" : "Visible"} → ${JSON.parse(event.afterState).hidden ? "Hidden" : "Visible"}`
                      : `${event.beforeState} → ${event.afterState}`}
                  </p>
                  {event.commentId && <blockquote>{JSON.parse(event.beforeState).body}</blockquote>}
                  <dl>
                    <dt>Administrator</dt>
                    <dd>{event.actorId}</dd>
                    <dt>Project</dt>
                    <dd>{event.projectId}</dd>
                    <dt>Decision</dt>
                    <dd>{event.id}</dd>
                  </dl>
                </details>
              </div>
            </article>
          ))
        ) : (
          <div className="manage-empty">
            <History />
            <h2>No decisions yet</h2>
            <p>Moderation actions and their notes will appear here.</p>
          </div>
        )}
      </div>
      <More
        fetching={history.isFetchingNextPage}
        more={history.hasNextPage}
        onClick={() => void history.fetchNextPage()}
      />
    </>
  )
}
function Comments({
  query = "",
  status = "all",
  game,
  inspect,
  propose,
  disabled
}: {
  query?: string
  status?: string
  game?: ManagedGame
  inspect: (id: string) => void
  propose: (target: Target) => void
  disabled: boolean
}) {
  const comments = useRows<ManagedComment>("comments", query, status, game?.id)
  const [error, setError] = useState("")
  const [opening, setOpening] = useState(false)
  async function act(comment: ManagedComment) {
    setOpening(true)
    setError("")
    try {
      const target = game ?? (await api<ManagedGame>(`games/${comment.projectId}`))
      propose({ game: target, comment, action: comment.hidden ? "restore-comment" : "hide-comment" })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to review this comment.")
    } finally {
      setOpening(false)
    }
  }
  if (comments.isPending) return <Loading />
  if (comments.error) return <Failure error={comments.error} retry={() => void comments.refetch()} />
  const items = comments.data.pages.flatMap((page) => page.items)
  return (
    <>
      {error && (
        <p role="alert" className="manage-live-error">
          {error}
        </p>
      )}
      <div className="manage-comments">
        {items.length ? (
          items.map((comment) => (
            <article className="manage-comment" key={comment.id} data-hidden={Boolean(comment.hidden)}>
              <span className="manage-avatar">{comment.author.slice(0, 2).toUpperCase()}</span>
              <div className="manage-comment-body">
                <div className="manage-comment-meta">
                  <strong>{comment.author}</strong>
                  <DateLabel value={comment.createdAt} />
                  {Boolean(comment.hidden) && <Status status="Hidden" />}
                </div>
                {!game && (
                  <button className="manage-text-link" onClick={() => inspect(comment.projectId)}>
                    {comment.gameTitle}
                    <ChevronRight size={12} />
                  </button>
                )}
                <p>{comment.body}</p>
                <div className="manage-comment-bottom">
                  <span className="manage-muted">{comment.updatedAt !== comment.createdAt ? "Edited" : ""}</span>
                  <Button size="sm" variant="outline" disabled={disabled || opening} onClick={() => void act(comment)}>
                    {comment.hidden ? <Eye /> : <EyeOff />}
                    {comment.hidden ? "Restore comment" : "Hide comment"}
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="manage-empty">
            <MessageSquare />
            <h2>No comments found</h2>
            <p>
              {query || status !== "all"
                ? "Try another search or filter."
                : "Comments will appear here as players join the conversation."}
            </p>
          </div>
        )}
      </div>
      <More
        fetching={comments.isFetchingNextPage}
        more={comments.hasNextPage}
        onClick={() => void comments.fetchNextPage()}
      />
    </>
  )
}
function Review({
  id,
  propose,
  disabled,
  role
}: {
  id: string
  propose: (target: Target) => void
  disabled: boolean
  role: CommunityRole
}) {
  const game = useQuery({ queryKey: ["manage", "game", id], queryFn: () => api<ManagedGame>(`games/${id}`), retry: 1 })
  const [tab, setTab] = useState<"Overview" | "Comments" | "History">("Overview")
  if (game.isPending)
    return (
      <>
        <SheetHeader>
          <SheetTitle>Loading game</SheetTitle>
          <SheetDescription>Loading moderation details.</SheetDescription>
        </SheetHeader>
        <Loading />
      </>
    )
  if (game.error)
    return (
      <>
        <SheetHeader>
          <SheetTitle>Game review</SheetTitle>
          <SheetDescription>Review game details and moderation history.</SheetDescription>
        </SheetHeader>
        <Failure error={game.error} retry={() => void game.refetch()} />
      </>
    )
  const item = game.data
  return (
    <>
      <SheetHeader>
        <span className="manage-section-label">GAME REVIEW</span>
        <SheetTitle>{item.title}</SheetTitle>
        <SheetDescription>Review this game, its comments, and previous decisions.</SheetDescription>
      </SheetHeader>
      <div className="manage-inspector-scroll">
        <div className="manage-live-hero">
          <Cover game={item} />
          <Status status={item.status} />
          {item.url && item.state !== "restricted" && (
            <Button size="sm" variant="secondary" asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Open game
                <ArrowUpRight />
              </a>
            </Button>
          )}
        </div>
        <Tabs items={["Overview", "Comments", "History"]} value={tab} onChange={setTab} label="Game details" />
        {tab === "Overview" ? (
          <div className="manage-detail-content">
            <p className="manage-live-description">{item.description || "No description provided."}</p>
            <dl className="manage-facts">
              <div>
                <dt>Project ID</dt>
                <dd>{item.id}</dd>
              </div>
              <div>
                <dt>Creator account</dt>
                <dd>{item.creatorId}</dd>
              </div>
              <div>
                <dt>Genre / dimension</dt>
                <dd>{[item.genre, item.dimension].filter(Boolean).join(" / ") || "Not specified"}</dd>
              </div>
              <div>
                <dt>Views</dt>
                <dd>{item.views.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>
                  <DateLabel value={item.updatedAt} />
                </dd>
              </div>
              <div>
                <dt>Visibility</dt>
                <dd>
                  {item.state === "restricted"
                    ? "Hosted access blocked"
                    : item.state === "hidden"
                      ? "Hidden from discovery; direct play available"
                      : item.status === "Published"
                        ? "Discoverable and playable"
                        : "Not listed in discovery"}
                </dd>
              </div>
            </dl>
          </div>
        ) : tab === "Comments" ? (
          <Comments game={item} inspect={() => {}} propose={propose} disabled={disabled} />
        ) : (
          <Audit project={id} />
        )}
      </div>
      <div className="manage-inspector-actions">
        <Button
          className="flex-1"
          variant="outline"
          disabled={disabled || (item.state === "restricted" && role !== "Admin")}
          onClick={() => propose({ game: item, action: item.state === "normal" ? "hide-game" : "restore-game" })}
        >
          {item.state === "normal" ? <EyeOff /> : <Eye />}
          {item.state === "normal" ? "Hide from discovery" : "Restore game"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Game moderation actions" disabled={disabled}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={item.state !== "normal"}
              onSelect={() => propose({ game: item, action: "hide-game" })}
            >
              <EyeOff />
              Hide from discovery
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={item.state === "normal" || (item.state === "restricted" && role !== "Admin")}
              onSelect={() => propose({ game: item, action: "restore-game" })}
            >
              <Eye />
              Restore game
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              disabled={item.state === "restricted" || role !== "Admin"}
              onSelect={() => propose({ game: item, action: "restrict-game" })}
            >
              <LockKeyhole />
              Restrict game access
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
function Decision({ target, close, saved }: { target: Target; close: () => void; saved: (text: string) => void }) {
  const client = useQueryClient()
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const mutation = useMutation({
    mutationFn: () =>
      api<{ id: string }>("decisions", {
        requestId,
        action: target.action,
        projectId: target.game.id,
        ...(target.comment ? { commentId: target.comment.id } : {}),
        revision: target.comment?.revision ?? target.game.revision,
        reason,
        note
      }),
    onError: async () => {
      await client.invalidateQueries({ queryKey: ["manage"] })
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["manage"] })
      saved(
        `${moderationActions[target.action]} saved for ${target.comment ? "the comment on " : ""}${target.game.title}.`
      )
      close()
    }
  })
  const description =
    target.action === "restrict-game"
      ? "Blocks new requests to every hosted version, alias and asset. The game also leaves discovery."
      : target.action === "hide-game"
        ? "Removes the game from discovery. People with a direct link can still play."
        : target.action === "hide-comment"
          ? "Hides the comment from public conversations and counts. Its record remains available to admins."
          : target.action === "restore-game"
            ? "Removes the moderation hold. Discovery still depends on the game’s existing publication status."
            : "Makes the comment visible in the conversation again."
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close()
      }}
    >
      <SheetContent side="bottom" className="manage-decision">
        <SheetHeader>
          <SheetTitle>{moderationActions[target.action]}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="manage-decision-body">
          <div className="manage-decision-target">
            <ShieldCheck size={16} />
            <strong>{target.game.title}</strong>
            {target.comment && <span>{target.comment.author}</span>}
          </div>
          {target.comment && <blockquote className="manage-live-excerpt">{target.comment.body}</blockquote>}
          <label htmlFor="moderation-reason">Reason</label>
          <Select
            value={reason}
            disabled={mutation.isPending}
            onValueChange={(value) => {
              setReason(value)
              setRequestId(crypto.randomUUID())
            }}
          >
            <SelectTrigger id="moderation-reason">
              <SelectValue placeholder="Choose a reason" />
            </SelectTrigger>
            <SelectContent>
              {moderationReasons.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label htmlFor="moderation-note">
            Decision notes <span>Internal / Required</span>
          </label>
          <Textarea
            id="moderation-note"
            value={note}
            disabled={mutation.isPending}
            maxLength={500}
            placeholder="Explain what you found and why this action is appropriate."
            onChange={(event) => {
              setNote(event.target.value)
              setRequestId(crypto.randomUUID())
            }}
          />
          <div className="manage-note-limit">{note.length}/500</div>
          {mutation.error && (
            <p role="alert" className="manage-live-error">
              {mutation.error.message}
            </p>
          )}
          <div className="manage-decision-footer">
            <Button variant="outline" disabled={mutation.isPending} onClick={close}>
              {mutation.error instanceof ManageError && mutation.error.status === 409
                ? "Close and review again"
                : "Cancel"}
            </Button>
            <Button
              variant={target.action === "restrict-game" ? "destructive" : "default"}
              disabled={
                !reason ||
                !note.trim() ||
                mutation.isPending ||
                (mutation.error instanceof ManageError && mutation.error.status === 409)
              }
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && <LoaderCircle className="animate-spin" />}
              {moderationActions[target.action]}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
export function LiveManage({ role = "Admin" }: { role?: CommunityRole }) {
  const [view, setView] = useState<"Games" | "Comments" | "History">("Games")
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [decision, setDecision] = useState<Target | null>(null)
  const [notice, setNotice] = useState("")
  const summary = useQuery({
    queryKey: ["manage", "summary"],
    queryFn: () => api<ModerationSummary>("summary"),
    retry: 1
  })
  const games = useRows<ManagedGame>("games", search, view === "Games" ? status : "all")
  function inspect(id: string) {
    setSelected(id)
    setReviewOpen(true)
  }
  function switchView(next: typeof view) {
    setView(next)
    setStatus("all")
    setQuery("")
    setSearch("")
  }
  let content: ReactNode
  if (view === "Comments")
    content = (
      <Comments
        query={search}
        status={status}
        inspect={inspect}
        propose={setDecision}
        disabled={Boolean(decision) || role === "Observer"}
      />
    )
  else if (view === "History") content = <Audit query={search} />
  else if (games.isPending) content = <Loading />
  else if (games.error) content = <Failure error={games.error} retry={() => void games.refetch()} />
  else {
    const items = games.data.pages.flatMap((page) => page.items)
    content = items.length ? (
      <>
        <div className="manage-table-wrap">
          <table className="manage-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Creator account</th>
                <th>Status</th>
                <th>Comments</th>
                <th>Views</th>
                <th>Updated</th>
                <th>
                  <span className="sr-only">Review</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((game) => (
                <tr key={game.id}>
                  <td>
                    <button
                      className="manage-game-identity"
                      onClick={() => inspect(game.id)}
                      aria-label={`Review ${game.title}`}
                    >
                      <Cover game={game} />
                      <span>
                        <strong>{game.title}</strong>
                        <small>{[game.genre, game.dimension].filter(Boolean).join(" / ") || "Not specified"}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="manage-live-creator" title={game.creatorId}>
                      {game.creatorId}
                    </span>
                  </td>
                  <td>
                    <Status status={game.status} />
                  </td>
                  <td>{count(game.comments)}</td>
                  <td>{count(game.views)}</td>
                  <td>
                    <DateLabel value={game.updatedAt} />
                  </td>
                  <td>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Open ${game.title} details`}
                      onClick={() => inspect(game.id)}
                    >
                      <ChevronRight />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <More fetching={games.isFetchingNextPage} more={games.hasNextPage} onClick={() => void games.fetchNextPage()} />
      </>
    ) : (
      <div className="manage-empty">
        <Gamepad2 />
        <h2>No games found</h2>
        <p>{search || status !== "all" ? "Try another search or filter." : "Deployed games will appear here."}</p>
      </div>
    )
  }
  return (
    <section className="manage-live" aria-label="Community moderation">
      <div className="manage-live-intro">
        <p>Manage community games and conversations.</p>
        <span className="manage-role">
          <ShieldCheck size={13} />
          {role}
        </span>
      </div>
      {summary.error ? (
        <Failure error={summary.error} retry={() => void summary.refetch()} />
      ) : (
        <>
          <div className="manage-summary">
            <button onClick={() => switchView("Games")}>
              <span className="manage-summary-icon">
                <Gamepad2 />
              </span>
              <div>
                <span>Deployed games</span>
                <strong>
                  {summary.data?.games ?? "—"}
                  <small>{summary.data ? `${summary.data.published} published` : "Loading"}</small>
                </strong>
              </div>
            </button>
            <button
              onClick={() => {
                switchView("Games")
                setStatus("Restricted")
              }}
            >
              <span className="manage-summary-icon">
                <LockKeyhole />
              </span>
              <div>
                <span>Restricted games</span>
                <strong>
                  {summary.data?.restricted ?? "—"}
                  <small>{summary.data ? `${summary.data.hidden} hidden from discovery` : "Loading"}</small>
                </strong>
              </div>
            </button>
            <button onClick={() => switchView("Comments")}>
              <span className="manage-summary-icon">
                <MessageSquare />
              </span>
              <div>
                <span>Comments</span>
                <strong>
                  {summary.data?.comments ?? "—"}
                  <small>{summary.data ? `${summary.data.hiddenComments} hidden` : "Loading"}</small>
                </strong>
              </div>
            </button>
          </div>
          {notice && (
            <output className="manage-notice">
              <Check size={16} />
              <span>{notice}</span>
              <Button size="icon-xs" variant="ghost" aria-label="Dismiss notification" onClick={() => setNotice("")}>
                <X />
              </Button>
            </output>
          )}
          <div className="manage-workspace">
            <Tabs items={["Games", "Comments", "History"]} value={view} onChange={switchView} label="Manage content" />
            <div className="manage-toolbar">
              <form
                className="manage-search"
                onSubmit={(event) => {
                  event.preventDefault()
                  setSearch(query.trim())
                }}
              >
                <Search size={16} />
                <Input
                  aria-label={`Search ${view.toLowerCase()}`}
                  value={query}
                  placeholder={
                    view === "Games"
                      ? "Search by game, project or creator ID…"
                      : view === "Comments"
                        ? "Search comments, authors or games…"
                        : "Search decisions, games or admins…"
                  }
                  onChange={(event) => {
                    setQuery(event.target.value)
                    if (!event.target.value) setSearch("")
                  }}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("")
                      setSearch("")
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
                <Button type="submit" variant="ghost" size="sm">
                  Search
                </Button>
              </form>
              {view !== "History" && (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="manage-filter" aria-label="Filter status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {(view === "Games"
                      ? ["Published", "Unlisted", "Hidden", "Restricted", "Unavailable"]
                      : ["visible", "hidden"]
                    ).map((value) => (
                      <SelectItem key={value} value={value}>
                        {value[0]!.toUpperCase() + value.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {content}
            <footer className="manage-table-footer">
              <span>Live community data</span>
              <span>
                <ShieldCheck size={13} />
                Decisions are recorded in history
              </span>
            </footer>
          </div>
        </>
      )}
      <Sheet open={reviewOpen} onOpenChange={setReviewOpen}>
        <SheetContent className="manage-inspector">
          {selected && (
            <Review
              key={selected}
              id={selected}
              propose={setDecision}
              disabled={Boolean(decision) || role === "Observer"}
              role={role}
            />
          )}
        </SheetContent>
      </Sheet>
      {decision && <Decision target={decision} close={() => setDecision(null)} saved={setNotice} />}
    </section>
  )
}
