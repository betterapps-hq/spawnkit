import {
  Check,
  Clock3,
  Eye,
  History,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  X
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { Button } from "../../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../ui/dropdown-menu"
import { Input } from "../../ui/input"
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import { Textarea } from "../../ui/textarea"
import { roleDescriptions, teamSeeds, type SafetyRole, type TeamMember } from "./safety-fixtures"
import { Avatar, Empty, FilterSegments, Notice, PreviewDialog, SafetyShell, StatusPill } from "./safety-shared"

type TeamScenario = "ready" | "invite" | "last-admin" | "empty" | "error" | "invite-error"
type Change = { member: TeamMember; kind: "role" | "remove" | "cancel" }
const capabilities = [
  ["Read reports and history", true, true, true],
  ["Assign and resolve reports", true, true, false],
  ["Hide games and comments", true, true, false],
  ["Restrict hosted game access", true, false, false],
  ["Invite or remove teammates", true, false, false],
  ["Change team permissions", true, false, false]
] as const
export function TeamPreview({ scenario = "ready", role = "Admin" }: { scenario?: TeamScenario; role?: SafetyRole }) {
  const [members, setMembers] = useState<TeamMember[]>(
    scenario === "empty"
      ? [teamSeeds[0]!]
      : teamSeeds.map((member) =>
          scenario === "last-admin" && member.id === "alex" ? { ...member, role: "Moderator" } : member
        )
  )
  const [tab, setTab] = useState("members")
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [invite, setInvite] = useState(scenario === "invite" || scenario === "invite-error")
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<SafetyRole>("Moderator")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [notice, setNotice] = useState("")
  const [change, setChange] = useState<Change | null>(null)
  const [nextRole, setNextRole] = useState<SafetyRole>("Moderator")
  const [note, setNote] = useState("")
  const [permissions, setPermissions] = useState(false)
  const [failed, setFailed] = useState(scenario === "error")
  const [resent, setResent] = useState<string[]>([])
  const [events, setEvents] = useState([
    {
      id: "t1",
      actor: "You",
      action: "Invited Sam Rivera",
      detail: "sam@example.com (Moderator)",
      time: "Yesterday, 2:40 PM"
    },
    {
      id: "t2",
      actor: "You",
      action: "Added Jamie Chen to the team",
      detail: "Moderator access accepted.",
      time: "Oct 15, 9:12 AM"
    }
  ])
  const admins = members.filter((member) => member.state === "Active" && member.role === "Admin").length
  const editable = role === "Admin"
  const shown = members.filter(
    (member) =>
      member.state !== "Removed" &&
      (filter === "all" ||
        (filter === "active" ? member.state === "Active" : member.state === "Invited" || member.state === "Expired")) &&
      `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(query.toLowerCase())
  )
  function record(action: string, detail: string) {
    setEvents((current) => [{ id: crypto.randomUUID(), actor: "You", action, detail, time: "Just now" }, ...current])
  }
  function openInvite() {
    setInvite(true)
    setEmail("")
    setInviteRole("Moderator")
    setError("")
    setAttempted(false)
  }
  async function send(event: FormEvent) {
    event.preventDefault()
    const address = email.trim().toLowerCase()
    if (members.some((member) => member.email.toLowerCase() === address && member.state !== "Removed")) {
      setError("Already a member or invited.")
      return
    }
    setBusy(true)
    setError("")
    await new Promise((resolve) => setTimeout(resolve, 450))
    setBusy(false)
    if (scenario === "invite-error" && !attempted) {
      setAttempted(true)
      setError("Invitation could not be sent. Try again.")
      return
    }
    setMembers((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        name: address.split("@")[0]!,
        email: address,
        role: inviteRole,
        state: "Invited",
        activity: "Expires in 7 days",
        cases: 0
      }
    ])
    record(`Invited ${address}`, `${inviteRole} access. Expires in 7 days.`)
    setInvite(false)
    setNotice("Invitation added.")
    setFilter("pending")
  }
  function propose(member: TeamMember, kind: Change["kind"]) {
    setChange({ member, kind })
    setNextRole(member.role)
    setNote("")
  }
  function apply(event: FormEvent) {
    event.preventDefault()
    if (!change) return
    setMembers((items) =>
      items.map((member) =>
        member.id === change.member.id
          ? { ...member, ...(change.kind === "role" ? { role: nextRole } : { state: "Removed" as const }) }
          : member
      )
    )
    record(
      change.kind === "role"
        ? `Changed ${change.member.name}’s role`
        : change.kind === "cancel"
          ? `Cancelled invitation for ${change.member.name}`
          : `Removed ${change.member.name}’s access`,
      `${change.kind === "role" ? `${change.member.role} → ${nextRole}. ` : ""}${note.trim()}`
    )
    setNotice(change.kind === "role" ? "Role updated." : "Access updated.")
    setChange(null)
  }
  function rolePicker(value: SafetyRole, onChange: (value: SafetyRole) => void) {
    return (
      <RadioGroup value={value} onValueChange={(next) => onChange(next as SafetyRole)} className="safety-role-options">
        {(["Moderator", "Admin", "Observer"] as const).map((item) => (
          <label key={item} htmlFor={`team-role-${item}`} data-selected={value === item}>
            <RadioGroupItem id={`team-role-${item}`} value={item} aria-label={item} />
            <span>
              <strong>
                {item}
                {item === "Moderator" && <small>Recommended</small>}
              </strong>
              <span>{roleDescriptions[item]}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
    )
  }
  return (
    <SafetyShell
      page="Team"
      accountRole={role}
      actions={
        <>
          <Button variant="outline" onClick={() => setPermissions(true)}>
            <ShieldCheck />
            Permissions
          </Button>
          {editable && (
            <Button onClick={openInvite}>
              <UserPlus />
              Invite teammate
            </Button>
          )}
        </>
      }
    >
      {notice && (
        <Notice tone="green" close={() => setNotice("")}>
          {notice}
        </Notice>
      )}
      {!editable && <Notice>Read-only access.</Notice>}
      <div className="safety-team-layout">
        <div>
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
              <TabsContent value={tab}>
                {tab === "members" ? (
                  <>
                    <div className="safety-team-tools">
                      <div className="safety-search">
                        <Search />
                        <Input
                          aria-label="Search teammates"
                          placeholder="Search name, email or role"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                        {query && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Clear team search"
                            onClick={() => setQuery("")}
                          >
                            <X />
                          </Button>
                        )}
                      </div>
                      <FilterSegments
                        value={filter}
                        onChange={setFilter}
                        label="Team membership"
                        items={[
                          { value: "all", label: "All" },
                          { value: "active", label: "Active" },
                          { value: "pending", label: "Invitations" }
                        ]}
                      />
                    </div>
                    {failed ? (
                      <Empty
                        title="Your team couldn’t load"
                        action={<Button onClick={() => setFailed(false)}>Try again</Button>}
                      >
                        Permissions haven’t changed. Reconnect to see the latest membership.
                      </Empty>
                    ) : shown.length ? (
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
                            {shown.map((member) => {
                              const protectedAdmin =
                                member.state === "Active" && member.role === "Admin" && admins === 1
                              return (
                                <tr key={member.id}>
                                  <td>
                                    <div className="safety-member">
                                      <Avatar name={member.name} />
                                      <span>
                                        <strong>
                                          {member.name}
                                          {member.you && <small>You</small>}
                                        </strong>
                                        <span>{member.email}</span>
                                        <span className="safety-member-mobile-status">{member.state}</span>
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <StatusPill tone={member.role === "Admin" ? "purple" : "quiet"}>
                                      {member.role === "Admin" ? (
                                        <ShieldCheck size={12} />
                                      ) : member.role === "Observer" ? (
                                        <Eye size={12} />
                                      ) : (
                                        <UserRound size={12} />
                                      )}{" "}
                                      {member.role}
                                    </StatusPill>
                                  </td>
                                  <td>
                                    <StatusPill
                                      tone={
                                        member.state === "Active"
                                          ? "green"
                                          : member.state === "Expired"
                                            ? "amber"
                                            : "quiet"
                                      }
                                    >
                                      {member.state === "Active" ? <Check size={11} /> : <Clock3 size={11} />}{" "}
                                      {member.state}
                                    </StatusPill>
                                  </td>
                                  <td className="safety-team-activity">
                                    <span>{resent.includes(member.id) ? "Invitation just sent" : member.activity}</span>
                                    {member.cases > 0 && (
                                      <small>
                                        {member.cases} assigned {member.cases === 1 ? "case" : "cases"}
                                      </small>
                                    )}
                                  </td>
                                  <td aria-label={`Actions for ${member.name}`}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          aria-label={`Actions for ${member.name}`}
                                          disabled={!editable}
                                        >
                                          <MoreHorizontal />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {member.state === "Active" ? (
                                          <>
                                            <DropdownMenuItem
                                              disabled={protectedAdmin || member.you}
                                              onSelect={() => propose(member, "role")}
                                            >
                                              <ShieldCheck />
                                              Change role
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="text-destructive"
                                              disabled={protectedAdmin || member.you}
                                              onSelect={() => propose(member, "remove")}
                                            >
                                              <LockKeyhole />
                                              Remove access
                                            </DropdownMenuItem>
                                            {protectedAdmin && (
                                              <p className="safety-menu-note">At least one admin must remain.</p>
                                            )}
                                            {member.you && !protectedAdmin && (
                                              <p className="safety-menu-note">Another admin manages your access.</p>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <DropdownMenuItem
                                              disabled={resent.includes(member.id)}
                                              onSelect={() => {
                                                setResent((items) => [...items, member.id])
                                                setMembers((items) =>
                                                  items.map((item) =>
                                                    item.id === member.id
                                                      ? { ...item, state: "Invited", activity: "Expires in 7 days" }
                                                      : item
                                                  )
                                                )
                                                record(
                                                  `Resent invitation to ${member.name}`,
                                                  `${member.role} access. Previous invitation link replaced.`
                                                )
                                                setNotice("Invitation renewed.")
                                              }}
                                            >
                                              <Mail />
                                              Resend invitation
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="text-destructive"
                                              onSelect={() => propose(member, "cancel")}
                                            >
                                              Cancel invitation
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        title="No teammates match"
                        action={
                          <Button
                            variant="outline"
                            onClick={() => {
                              setQuery("")
                              setFilter("all")
                            }}
                          >
                            Clear filters
                          </Button>
                        }
                      ></Empty>
                    )}
                    <div className="safety-team-footer">
                      <span>
                        {shown.length} {shown.length === 1 ? "person" : "people"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="safety-timeline safety-team-timeline">
                    {events.map((event) => (
                      <article key={event.id}>
                        <span>
                          <ShieldCheck size={14} />
                        </span>
                        <div>
                          <header>
                            <strong>{event.action}</strong>
                            <time>{event.time}</time>
                          </header>
                          <p>{event.detail}</p>
                          <small>{event.actor}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <PreviewDialog
        open={invite}
        onClose={() => {
          if (!busy) setInvite(false)
        }}
        title="Invite a teammate"
        description="Choose their role. They’ll need to accept using this email address."
      >
        <form className="safety-dialog-body" onSubmit={(event) => void send(event)}>
          <div className="safety-field">
            <label htmlFor="team-email">Email address</label>
            <Input
              id="team-email"
              type="email"
              required
              placeholder="teammate@example.com"
              autoComplete="email"
              value={email}
              disabled={busy}
              onChange={(event) => {
                setEmail(event.target.value)
                setError("")
              }}
              aria-describedby={error ? "invite-error" : undefined}
              aria-invalid={Boolean(error)}
            />
          </div>
          <fieldset disabled={busy}>
            <legend className="safety-field-label">Role</legend>
            {rolePicker(inviteRole, setInviteRole)}
          </fieldset>
          {error && (
            <p className="safety-form-error" role="alert" id="invite-error">
              {error}
            </p>
          )}
          <div className="safety-dialog-actions">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setInvite(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !email.trim()}>
              <Mail />
              {busy ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </form>
      </PreviewDialog>
      <PreviewDialog
        open={Boolean(change)}
        onClose={() => setChange(null)}
        title={
          change?.kind === "role"
            ? "Change team role"
            : change?.kind === "cancel"
              ? "Cancel invitation"
              : "Remove team access"
        }
        description={
          change?.kind === "role"
            ? ""
            : change?.kind === "cancel"
              ? "The invitation link will stop working."
              : "Removes moderation access. Audit history is retained."
        }
      >
        {change && (
          <form className="safety-dialog-body" onSubmit={apply}>
            <div className="safety-target">
              <Avatar name={change.member.name} />
              <div>
                <strong>{change.member.name}</strong>
                <span>{change.member.email}</span>
              </div>
              <StatusPill>{change.member.role}</StatusPill>
            </div>
            {change.kind === "role" && rolePicker(nextRole, setNextRole)}
            {change.kind === "remove" && change.member.cases > 0 && (
              <Notice tone="amber">{change.member.cases} cases will become unassigned.</Notice>
            )}
            <div className="safety-field">
              <label htmlFor="team-reason">
                Reason <span>Required</span>
              </label>
              <Textarea
                id="team-reason"
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <div className="safety-dialog-actions">
              <Button variant="outline" type="button" onClick={() => setChange(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={change.kind === "role" ? "default" : "destructive"}
                disabled={!note.trim() || (change.kind === "role" && nextRole === change.member.role)}
              >
                {change.kind === "role"
                  ? "Save role"
                  : change.kind === "cancel"
                    ? "Cancel invitation"
                    : "Remove access"}
              </Button>
            </div>
          </form>
        )}
      </PreviewDialog>
      <PreviewDialog open={permissions} onClose={() => setPermissions(false)} title="Moderation permissions">
        <div className="safety-dialog-body">
          <div className="safety-permissions-wrap">
            <table className="safety-permissions">
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>Admin</th>
                  <th>Moderator</th>
                  <th>Observer</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map(([label, ...values]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {values.map((allowed, index) => (
                      <td key={index}>
                        {allowed ? <Check aria-label="Allowed" size={16} /> : <span aria-label="Not allowed">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notice>At least one active admin must remain.</Notice>
          <Button onClick={() => setPermissions(false)}>Done</Button>
        </div>
      </PreviewDialog>
    </SafetyShell>
  )
}
