import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Inbox,
  Mail,
  MessageSquare,
  Rocket,
  Search,
  Settings2,
  ShieldAlert,
  Undo2,
  UserRound,
  X
} from "lucide-react"
import { useState } from "react"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import {
  creatorNotificationSeeds,
  notificationSeeds,
  notificationWorkflows,
  type AdminNotification
} from "./notification-fixtures"
import type { SafetyRole } from "./safety-fixtures"
import { Empty, SafetyShell, StatusPill } from "./safety-shared"
import "./notifications.css"

type Scenario = "ready" | "empty" | "loading" | "error" | "save-error" | "unavailable"
type NotificationRole = SafetyRole | "Creator"
const seedsForRole = (role: NotificationRole) =>
  role === "Creator" || role === "Observer"
    ? creatorNotificationSeeds
    : notificationSeeds.filter((item) => role === "Admin" || item.kind !== "escalation")
const workflowsForRole = (role: NotificationRole) =>
  notificationWorkflows.filter((item) =>
    role === "Creator" || role === "Observer"
      ? ["deployment", "comment"].includes(item.id)
      : role === "Admin" || item.id !== "escalation"
  )
type Filter = "all" | "unread" | "archived"
type Preference = { inApp: boolean; email: string }
const initialPreferences: Record<string, Preference> = Object.fromEntries(
  notificationWorkflows.map((item) => [item.id, { inApp: true, email: item.email }])
)

export function NotificationsPreview({
  scenario = "ready",
  initialTab = "inbox",
  initialFilter = "all",
  showDetail = false,
  showBell = false,
  role = "Admin"
}: {
  scenario?: Scenario
  initialTab?: "inbox" | "preferences"
  initialFilter?: Filter
  showDetail?: boolean
  showBell?: boolean
  role?: NotificationRole
}) {
  const [items, setItems] = useState(() =>
    ["empty", "loading", "error"].includes(scenario) ? [] : seedsForRole(role).map((item) => ({ ...item }))
  )
  const [tab, setTab] = useState(initialTab)
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(showDetail ? seedsForRole(role)[0]!.id : null)
  const [mobileDetail, setMobileDetail] = useState(showDetail)
  const [bellOpen, setBellOpen] = useState(showBell)
  const [loadState, setLoadState] = useState(scenario)
  const [preferences, setPreferences] = useState(initialPreferences)
  const [savedPreferences, setSavedPreferences] = useState(initialPreferences)
  const [saveState, setSaveState] = useState<"idle" | "error" | "saved">("idle")
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [feedback, setFeedback] = useState("")
  const unread = items.filter((item) => item.unread && !item.archived).length
  const selected = items.find((item) => item.id === selectedId)
  const visible = items.filter(
    (item) =>
      (filter === "archived" ? item.archived : !item.archived && (filter !== "unread" || item.unread)) &&
      `${item.title} ${item.game} ${item.caseId}`.toLowerCase().includes(query.toLowerCase())
  )
  const dirty = JSON.stringify(preferences) !== JSON.stringify(savedPreferences)
  const patch = (id: string, changes: Partial<AdminNotification>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  function open(item: AdminNotification) {
    setSelectedId(item.id)
    setMobileDetail(true)
    patch(item.id, { unread: false })
    setBellOpen(false)
    setTab("inbox")
  }
  function archive(item: AdminNotification) {
    patch(item.id, { archived: !item.archived, unread: false })
    setFeedback(item.archived ? "Moved to inbox" : "Archived")
    setSelectedId(null)
    setMobileDetail(false)
  }
  function preference(id: string, value: Partial<Preference>) {
    setPreferences((current) => ({ ...current, [id]: { ...current[id]!, ...value } }))
    setSaveState("idle")
  }
  const bell = (
    <Popover open={bellOpen} onOpenChange={setBellOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="notification-bell"
          aria-label={`Notifications, ${unread} unread`}
        >
          <Bell />
          {unread > 0 && <span>{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="notification-popover" aria-label="Recent notifications">
        <div className="notification-popover-heading">
          <h2>Notifications</h2>
          <span>{unread} unread</span>
        </div>
        {items
          .filter((item) => !item.archived)
          .slice(0, 3)
          .map((item) => (
            <button className="notification-compact" key={item.id} onClick={() => open(item)}>
              <NotificationIcon item={item} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.game}</small>
                <time>{item.time}</time>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        {!items.length && <Empty title="You're all caught up" />}
        <Button
          variant="ghost"
          className="notification-popover-footer"
          onClick={() => {
            setTab("inbox")
            setBellOpen(false)
          }}
        >
          View inbox <ArrowRight />
        </Button>
      </PopoverContent>
    </Popover>
  )

  return (
    <SafetyShell page="Notifications" accountRole={role} headerActions={bell}>
      <div className="notification-page">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <div className="notification-tabs">
            <TabsList variant="line" aria-label="Notification views">
              <TabsTrigger value="inbox">
                <Inbox /> Inbox {unread > 0 && <span className="notification-count">{unread}</span>}
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Settings2 /> Preferences
              </TabsTrigger>
            </TabsList>
            {tab === "inbox" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!unread || loadState === "error" || loadState === "loading"}
                onClick={() => {
                  setItems((current) => current.map((item) => ({ ...item, unread: false })))
                  setFeedback("All notifications marked as read")
                }}
              >
                <CheckCheck /> Mark all read
              </Button>
            )}
          </div>
          <TabsContent value="inbox">
            {loadState === "error" ? (
              <div className="notification-state" role="alert">
                <Bell size={26} />
                <h2>Couldn't load notifications</h2>
                <Button
                  variant="outline"
                  onClick={() => {
                    setItems(seedsForRole(role).map((item) => ({ ...item })))
                    setLoadState("ready")
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : loadState === "loading" ? (
              <output className="notification-skeleton" aria-label="Loading notifications">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i}>
                    <span />
                    <div>
                      <span />
                      <span />
                    </div>
                  </div>
                ))}
              </output>
            ) : (
              <div className="notification-workspace" data-detail={mobileDetail} data-selected={Boolean(selected)}>
                <section className="notification-list" aria-label="Notification inbox">
                  <div className="notification-list-tools">
                    <fieldset className="notification-filters" aria-label="Filter notifications">
                      {(
                        [
                          ["all", "All"],
                          ["unread", "Unread"],
                          ["archived", "Archived"]
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          aria-pressed={filter === value}
                          onClick={() => {
                            setFilter(value)
                            setSelectedId(null)
                            setMobileDetail(false)
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </fieldset>
                    <div className="notification-search">
                      <Search size={15} />
                      <Input
                        aria-label="Search notifications"
                        placeholder="Search notifications"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      {query && (
                        <button aria-label="Clear search" onClick={() => setQuery("")}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {!visible.length ? (
                    <Empty
                      title={
                        query
                          ? "No matching notifications"
                          : filter === "archived"
                            ? "Nothing archived"
                            : "You're all caught up"
                      }
                    />
                  ) : (
                    ["Today", "Yesterday"].map((group) => {
                      const rows = visible.filter((item) => item.group === group)
                      return (
                        rows.length > 0 && (
                          <div key={group} className="notification-group">
                            <h2>{group}</h2>
                            {rows.map((item) => (
                              <button
                                key={item.id}
                                className="notification-row"
                                data-selected={selectedId === item.id}
                                data-unread={item.unread}
                                aria-pressed={selectedId === item.id}
                                aria-label={`${item.title}: ${item.game}${item.unread ? ", unread" : ""}`}
                                onClick={() => open(item)}
                              >
                                <NotificationIcon item={item} />
                                <span className="notification-row-content">
                                  <span className="notification-row-top">
                                    <strong>{item.title}</strong>
                                    <time>{item.time}</time>
                                  </span>
                                  <span className="notification-row-game">{item.game}</span>
                                </span>
                                {item.unread && <span className="notification-unread-mark" aria-hidden="true" />}
                                <ChevronRight size={14} className="notification-row-arrow" />
                              </button>
                            ))}
                          </div>
                        )
                      )
                    })
                  )}
                </section>
                {selected && (
                  <section className="notification-detail" aria-label="Notification details">
                    {selected ? (
                      <>
                        <div className="notification-detail-toolbar">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="notification-back"
                            onClick={() => {
                              setMobileDetail(false)
                              setSelectedId(null)
                            }}
                          >
                            <ArrowLeft /> Inbox
                          </Button>
                          <span>
                            {selected.group === "Today" ? "Today" : "Yesterday"}, {selected.time}
                          </span>
                          <div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={selected.unread ? "Mark as read" : "Mark as unread"}
                              onClick={() => patch(selected.id, { unread: !selected.unread })}
                            >
                              <Mail />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={selected.archived ? "Move to inbox" : "Archive notification"}
                              onClick={() => archive(selected)}
                            >
                              {selected.archived ? <Undo2 /> : <Archive />}
                            </Button>
                          </div>
                        </div>
                        <div className="notification-detail-body">
                          <h2>{selected.title}</h2>
                          <p>{selected.description}</p>
                          {scenario === "unavailable" ? (
                            <div className="notification-unavailable">
                              <Inbox size={22} />
                              <h3>This report is no longer available</h3>
                              <Button variant="outline" asChild>
                                <a href="?id=administration-reports--inbox&viewMode=story">
                                  Open reports <ArrowRight />
                                </a>
                              </Button>
                            </div>
                          ) : selected.kind === "deployment" || selected.kind === "comment" ? (
                            <div className="notification-project-link">
                              <img src={selected.cover} alt="" />
                              <strong>{selected.game}</strong>
                              <Button variant="outline" asChild>
                                <a href="?id=project-dashboard-overview--frontend-only&viewMode=story">
                                  Open project <ArrowRight />
                                </a>
                              </Button>
                            </div>
                          ) : selected.kind === "digest" ? (
                            <div className="notification-digest">
                              <strong>{selected.reportCount}</strong>
                              <span>unassigned reports</span>
                              <Button asChild>
                                <a href="?id=administration-reports--inbox&viewMode=story">
                                  Open queue <ArrowRight />
                                </a>
                              </Button>
                            </div>
                          ) : (
                            <div className="notification-report-card">
                              <div className="notification-game">
                                <img src={selected.cover} alt="" />
                                <div>
                                  <h3>{selected.game}</h3>
                                </div>
                              </div>
                              <dl>
                                <div>
                                  <dt>Reason</dt>
                                  <dd>{selected.reason}</dd>
                                </div>
                                <div>
                                  <dt>Status</dt>
                                  <dd>
                                    <StatusPill
                                      tone={
                                        selected.state === "Escalated"
                                          ? "amber"
                                          : selected.state === "Resolved"
                                            ? "green"
                                            : "quiet"
                                      }
                                    >
                                      {selected.state}
                                    </StatusPill>
                                  </dd>
                                </div>
                                <div>
                                  <dt>
                                    <UserRound size={13} /> Assigned to
                                  </dt>
                                  <dd>{selected.assignee}</dd>
                                </div>
                                <div>
                                  <dt>Player reports</dt>
                                  <dd>{selected.reportCount}</dd>
                                </div>
                              </dl>
                              <Button asChild>
                                <a href={`?id=administration-reports--${selected.story}&viewMode=story`}>
                                  Open report <ArrowRight />
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="notification-detail-empty">
                        <span>
                          <Bell size={28} />
                        </span>
                        <h2>{unread ? `${unread} unread notifications` : "You're all caught up"}</h2>
                        {unread > 0 && <p>Select a notification to review it.</p>}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </TabsContent>
          <TabsContent value="preferences">
            <div className="notification-preferences">
              <div className="notification-preferences-heading">
                <h2>Delivery preferences</h2>
              </div>
              <div className="notification-preference-table">
                <div className="notification-preference-head">
                  <span>Notify me about</span>
                  <span>
                    <Bell size={14} /> In-app
                  </span>
                  <span>
                    <Mail size={14} /> Email
                  </span>
                </div>
                {workflowsForRole(role).map((item) => (
                  <div className="notification-preference-row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={preferences[item.id]!.inApp}
                      aria-label={`${item.title} in-app`}
                      className="notification-switch"
                      onClick={() => preference(item.id, { inApp: !preferences[item.id]!.inApp })}
                    >
                      <span />
                    </button>
                    <Select
                      value={preferences[item.id]!.email}
                      onValueChange={(value) => preference(item.id, { email: value })}
                    >
                      <SelectTrigger aria-label={`${item.title} email`}>
                        <Mail size={14} className="notification-email-icon" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        {item.id !== "digest" && <SelectItem value="immediate">Immediately</SelectItem>}
                        <SelectItem value="daily">Daily summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="notification-summary-settings">
                <Clock3 size={17} />
                <div>
                  <strong>Daily summary</strong>
                  <p>9:00 AM in your account time zone.</p>
                </div>
                <span>America/Los_Angeles</span>
              </div>
              <div className="notification-save">
                <div aria-live="polite">
                  {saveState === "error" ? (
                    <span role="alert">Couldn't save preferences. Try again.</span>
                  ) : saveState === "saved" ? (
                    <span>
                      <Check size={15} /> Preferences saved
                    </span>
                  ) : dirty ? (
                    "Unsaved changes"
                  ) : (
                    ""
                  )}
                </div>
                <Button
                  variant="ghost"
                  disabled={!dirty}
                  onClick={() => {
                    setPreferences(savedPreferences)
                    setSaveState("idle")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!dirty}
                  onClick={() => {
                    if (scenario === "save-error" && !saveAttempted) {
                      setSaveAttempted(true)
                      setSaveState("error")
                      return
                    }
                    setSavedPreferences(preferences)
                    setSaveState("saved")
                  }}
                >
                  Save preferences
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <output className="sr-only">{feedback}</output>
      </div>
    </SafetyShell>
  )
}

function NotificationIcon({ item }: { item: AdminNotification }) {
  const Icon =
    item.kind === "deployment"
      ? Rocket
      : item.kind === "comment"
        ? MessageSquare
        : item.kind === "escalation"
          ? ShieldAlert
          : item.kind === "assignment"
            ? UserRound
            : item.kind === "digest"
              ? Inbox
              : Bell
  return (
    <span className="notification-icon" data-kind={item.kind}>
      <Icon size={18} />
    </span>
  )
}
