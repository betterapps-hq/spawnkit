import {
  communityRoles,
  type CommunityRole,
  type TeamData,
  type TeamEvent,
  type TeamMember,
  type TeamInvitation
} from "@spawn/platform/community"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Clock3, Eye, History, Mail, MoreHorizontal, Search, ShieldCheck, UserPlus, Users } from "lucide-react"
import { useState } from "react"
import { communityDate, communityRequest } from "../../lib/community"
import { Button } from "../ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Input } from "../ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Textarea } from "../ui/textarea"
import { Avatar, Empty, FilterSegments, Notice, PreviewDialog, StatusPill } from "./design/safety-shared"
import "./community-pages.css"

const capabilities = [
  ["Read reports and history", true, true, true],
  ["Assign and resolve reports", true, true, false],
  ["Hide games and comments", true, true, false],
  ["Restrict hosted game access", true, false, false],
  ["Manage team access", true, false, false]
] as const
const roleDescriptions: Record<CommunityRole, string> = {
  Admin: "Manage content and team access.",
  Moderator: "Review reports and hide content.",
  Observer: "Read content, reports and history."
}
function RolePicker({ value, onChange }: { value: CommunityRole; onChange: (role: CommunityRole) => void }) {
  return (
    <fieldset className="community-role-picker">
      <legend>Role</legend>
      {communityRoles.map((role) => (
        <label key={role} data-selected={value === role} aria-label={role}>
          <input type="radio" name="team-role" value={role} checked={value === role} onChange={() => onChange(role)} />
          <span>
            <strong>{role}</strong>
            <small>{roleDescriptions[role]}</small>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
type Change =
  | { action: "role" | "remove"; member: TeamMember }
  | { action: "cancel" | "resend"; member: TeamInvitation }
export function LiveTeam() {
  const client = useQueryClient()
  const team = useQuery({
    queryKey: ["community-team"],
    queryFn: () => communityRequest<TeamData>("admin/team/members"),
    refetchInterval: 30_000
  })
  const [tab, setTab] = useState("members"),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState("")
  const [invite, setInvite] = useState(false),
    [permissions, setPermissions] = useState(false),
    [email, setEmail] = useState("")
  const [role, setRole] = useState<CommunityRole>("Moderator"),
    [reason, setReason] = useState(""),
    [change, setChange] = useState<Change | null>(null)
  const history = useInfiniteQuery({
    queryKey: ["community-team-history"],
    queryFn: ({ pageParam }) =>
      communityRequest<{ items: TeamEvent[]; nextCursor: string | null }>(
        `admin/team/history${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`
      ),
    initialPageParam: "",
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: tab === "history"
  })
  const mutation = useMutation({
    mutationFn: ({ path, body }: { path: string; body: unknown }) => communityRequest(path, body),
    onSuccess: async () => {
      setInvite(false)
      setChange(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: ["community-team"] }),
        client.invalidateQueries({ queryKey: ["community-team-history"] }),
        client.invalidateQueries({ queryKey: ["community-reports"] })
      ])
    }
  })
  const editable = team.data?.role === "Admin"
  const members = team.data?.members ?? [],
    invitations = team.data?.invitations ?? []
  const matches = (value: string) => value.toLowerCase().includes(query.toLowerCase())
  const shown = filter === "pending" ? [] : members.filter((m) => matches(`${m.name} ${m.email} ${m.role}`))
  const pending = filter === "active" ? [] : invitations.filter((m) => matches(`${m.email} ${m.role}`))
  const openChange = (value: Change) => {
    mutation.reset()
    setChange(value)
    setRole(value.member.role)
    setReason("")
  }
  return (
    <section className="community-page" aria-label="Team">
      <header className="community-heading">
        <h1>Team</h1>
        <div>
          <Button variant="outline" onClick={() => setPermissions(true)}>
            <ShieldCheck />
            Permissions
          </Button>
          {editable && (
            <Button
              onClick={() => {
                mutation.reset()
                setEmail("")
                setRole("Moderator")
                setInvite(true)
              }}
            >
              <UserPlus />
              Invite teammate
            </Button>
          )}
        </div>
      </header>
      {team.error ? (
        <Empty title="Unable to load team" action={<Button onClick={() => void team.refetch()}>Try again</Button>}>
          {team.error.message}
        </Empty>
      ) : (
        <div className="safety-surface">
          <Tabs value={tab} onValueChange={setTab} className="safety-panel-tabs">
            <TabsList variant="line" className="safety-surface-tabs">
              <TabsTrigger value="members">
                <Users />
                Members
              </TabsTrigger>
              <TabsTrigger value="history">
                <History />
                Access history
              </TabsTrigger>
            </TabsList>
            <TabsContent value="members">
              <div className="safety-team-tools">
                <div className="safety-search">
                  <Search />
                  <Input
                    aria-label="Search teammates"
                    placeholder="Search name, email or role"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <FilterSegments
                  label="Team membership"
                  value={filter}
                  onChange={setFilter}
                  items={[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "pending", label: "Invitations" }
                  ]}
                />
              </div>
              {team.isPending ? (
                <Empty title="Loading team" />
              ) : shown.length + pending.length === 0 ? (
                <Empty title="No teammates match" />
              ) : (
                <div className="safety-team-table-wrap">
                  <table className="safety-team-table">
                    <thead>
                      <tr>
                        <th>Teammate</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Activity</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((member) => (
                        <tr key={member.userId}>
                          <td>
                            <div className="safety-member">
                              <Avatar name={member.name || member.email || member.userId} />
                              <span>
                                <strong>
                                  {member.name || member.email || member.userId}
                                  {member.userId === team.data?.userId && <small>You</small>}
                                </strong>
                                <span>{member.email}</span>
                              </span>
                            </div>
                          </td>
                          <td>
                            <StatusPill tone={member.role === "Admin" ? "purple" : "quiet"}>
                              {member.role === "Observer" ? <Eye size={12} /> : <ShieldCheck size={12} />} {member.role}
                            </StatusPill>
                          </td>
                          <td>
                            <StatusPill tone="green">
                              <Check size={12} />
                              Active
                            </StatusPill>
                          </td>
                          <td className="safety-team-activity">
                            {member.cases} assigned {member.cases === 1 ? "case" : "cases"}
                          </td>
                          <td>
                            {editable && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Actions for ${member.name || member.email || member.userId}`}
                                    disabled={member.userId === team.data?.userId}
                                  >
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => openChange({ action: "role", member })}>
                                    Change role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={() => openChange({ action: "remove", member })}
                                  >
                                    Remove access
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        </tr>
                      ))}
                      {pending.map((member) => {
                        const expired = new Date(member.expiresAt).getTime() < team.dataUpdatedAt
                        return (
                          <tr key={member.id}>
                            <td>
                              <div className="safety-member">
                                <Avatar name={member.email} />
                                <span>
                                  <strong>{member.email}</strong>
                                </span>
                              </div>
                            </td>
                            <td>
                              <StatusPill>{member.role}</StatusPill>
                            </td>
                            <td>
                              <StatusPill tone={expired || member.emailState === "failed" ? "amber" : "quiet"}>
                                <Clock3 size={12} />
                                {expired
                                  ? "Expired"
                                  : member.emailState === "failed"
                                    ? "Delivery failed"
                                    : member.emailState === "pending"
                                      ? "Sending"
                                      : "Invited"}
                              </StatusPill>
                            </td>
                            <td className="safety-team-activity">
                              <span>Expires {communityDate(member.expiresAt)}</span>
                            </td>
                            <td>
                              {editable && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.email}`}>
                                      <MoreHorizontal />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => openChange({ action: "resend", member })}>
                                      <Mail />
                                      Resend invitation
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onSelect={() => openChange({ action: "cancel", member })}
                                    >
                                      Cancel invitation
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="safety-team-footer">
                {shown.length + pending.length} {shown.length + pending.length === 1 ? "person" : "people"}
              </div>
            </TabsContent>
            <TabsContent value="history">
              {history.error ? (
                <Empty
                  title="Unable to load history"
                  action={<Button onClick={() => void history.refetch()}>Try again</Button>}
                >
                  {history.error.message}
                </Empty>
              ) : history.isPending ? (
                <Empty title="Loading history" />
              ) : history.data.pages[0]?.items.length === 0 ? (
                <Empty title="No access changes" />
              ) : (
                <div className="safety-timeline safety-team-timeline">
                  {history.data?.pages
                    .flatMap((p) => p.items)
                    .map((event) => (
                      <article key={event.id}>
                        <span>
                          <ShieldCheck size={14} />
                        </span>
                        <div>
                          <header>
                            <strong>
                              {{
                                invite: "Invited",
                                resend: "Renewed invitation for",
                                cancel: "Cancelled invitation for",
                                role: "Changed role for",
                                remove: "Removed access for",
                                accept: "Joined team:"
                              }[event.action] ?? event.action}{" "}
                              {event.targetName}
                            </strong>
                            <time dateTime={event.createdAt}>{communityDate(event.createdAt)}</time>
                          </header>
                          <p>
                            {event.beforeState && `${event.beforeState} → `}
                            {event.afterState}
                          </p>
                          {event.reason && <p>{event.reason}</p>}
                          <small>{event.actorName}</small>
                        </div>
                      </article>
                    ))}
                </div>
              )}
              {history.hasNextPage && (
                <Button
                  variant="ghost"
                  disabled={history.isFetchingNextPage}
                  onClick={() => void history.fetchNextPage()}
                >
                  Load more
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
      <PreviewDialog
        open={invite}
        onClose={() => {
          if (!mutation.isPending) setInvite(false)
        }}
        title="Invite teammate"
      >
        <form
          className="community-form"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({
              path: "admin/team/invitations",
              body: { requestId: crypto.randomUUID(), action: "invite", email, role }
            })
          }}
        >
          <label htmlFor="team-invite-email">
            Email
            <Input
              id="team-invite-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <RolePicker value={role} onChange={setRole} />
          {mutation.error && <Notice tone="red">{mutation.error.message}</Notice>}
          <footer>
            <Button type="button" variant="outline" onClick={() => setInvite(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button disabled={mutation.isPending}>{mutation.isPending ? "Sending…" : "Send invitation"}</Button>
          </footer>
        </form>
      </PreviewDialog>
      <PreviewDialog
        open={Boolean(change)}
        onClose={() => {
          if (!mutation.isPending) setChange(null)
        }}
        title={
          change?.action === "role"
            ? "Change role"
            : change?.action === "remove"
              ? "Remove access"
              : change?.action === "resend"
                ? "Resend invitation"
                : "Cancel invitation"
        }
      >
        {change && (
          <form
            className="community-form"
            onSubmit={(e) => {
              e.preventDefault()
              const id = "userId" in change.member ? change.member.userId : change.member.id
              mutation.mutate({
                path: `admin/team/${"userId" in change.member ? "members" : "invitations"}/${encodeURIComponent(id)}`,
                body: {
                  requestId: crypto.randomUUID(),
                  action: change.action,
                  revision: change.member.revision,
                  role,
                  reason
                }
              })
            }}
          >
            <p>{"name" in change.member ? change.member.name : change.member.email}</p>
            {change.action === "role" && <RolePicker value={role} onChange={setRole} />}
            {(change.action === "role" || change.action === "remove") && (
              <label htmlFor="team-change-reason">
                Reason
                <Textarea
                  id="team-change-reason"
                  required
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            {mutation.error && <Notice tone="red">{mutation.error.message}</Notice>}
            <footer>
              <Button type="button" variant="outline" onClick={() => setChange(null)} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Confirm"}</Button>
            </footer>
          </form>
        )}
      </PreviewDialog>
      <PreviewDialog open={permissions} onClose={() => setPermissions(false)} title="Team permissions">
        <div className="community-permissions">
          <table>
            <thead>
              <tr>
                <th>Permission</th>
                {communityRoles.map((r) => (
                  <th key={r}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capabilities.map(([label, ...allowed]) => (
                <tr key={label}>
                  <th>{label}</th>
                  {allowed.map((yes, i) => (
                    <td key={i}>
                      {yes ? <Check size={16} aria-label="Allowed" /> : <span aria-label="Not allowed">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PreviewDialog>
    </section>
  )
}
