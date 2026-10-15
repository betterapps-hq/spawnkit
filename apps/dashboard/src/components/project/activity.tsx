import { getCoreRowModel, getPaginationRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { ArrowRight, Ban, Check, ShieldCheck, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { DataTable } from "../data-table"
import { SelectField } from "../select-field"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Input } from "../ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import type { ActionHandler, Player, ProjectModel } from "./model"
import { EmptyState, Metric, Notice, Panel, StatusBadge } from "./primitives"

export function ProjectUsers({
  project,
  canEdit,
  onAction
}: {
  project: ProjectModel
  canEdit: boolean
  onAction?: ActionHandler | undefined
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<Player | null>(null)
  const [request, setRequest] = useState<"idle" | "pending" | "success" | "error">("idle")
  const enabled = project.services.includes("Player authentication")
  const rows = useMemo(
    () =>
      project.players.filter(
        (player) =>
          (status === "all" || player.status === status) &&
          `${player.name} ${player.email} ${player.id}`.toLowerCase().includes(query.toLowerCase())
      ),
    [project.players, query, status]
  )
  const columns = useMemo<ColumnDef<Player>[]>(
    () => [
      {
        id: "player",
        header: "Player",
        cell: ({ row }) => (
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => {
              setSelected(row.original)
              setRequest("idle")
            }}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-accent text-xs font-semibold text-primary">
              {row.original.name.slice(0, 2)}
            </span>
            <span>
              <span className="block text-xs font-medium">{row.original.name}</span>
              <span className="mt-1 block text-[11px] text-muted-foreground">{row.original.email}</span>
            </span>
          </button>
        )
      },
      { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "joined",
        header: "Joined",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.joined}</span>
      },
      {
        id: "seen",
        header: "Last seen",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.lastSeen}</span>
      },
      {
        id: "details",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`View ${row.original.name}`}
            onClick={() => {
              setSelected(row.original)
              setRequest("idle")
            }}
          >
            <ArrowRight />
          </Button>
        )
      }
    ],
    []
  )
  // oxlint-disable-next-line react/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  })
  async function moderate() {
    if (!selected || !onAction || !canEdit) return
    setRequest("pending")
    try {
      await onAction({
        kind: "moderate-player",
        projectId: project.id,
        values: { playerId: selected.id, status: selected.status === "banned" ? "active" : "banned" }
      })
      setRequest("success")
    } catch {
      setRequest("error")
    }
  }
  if (!enabled)
    return (
      <Card className="p-0">
        <EmptyState
          icon={<ShieldCheck />}
          title="Player accounts are not enabled"
          description="Enable player authentication in game services to manage your game's users here."
        />
      </Card>
    )
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Registered players" value={String(project.players.length)} detail="Production accounts" />
        <Metric
          label="Active accounts"
          value={String(project.players.filter((p) => p.status === "active").length)}
          detail="Able to sign in"
        />
        <Metric
          label="Banned accounts"
          value={String(project.players.filter((p) => p.status === "banned").length)}
          detail="Access restricted"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Search players"
          placeholder="Search name, email, or player ID…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-48 flex-1 bg-card"
        />
        <div className="w-40">
          <SelectField
            label="Player status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All players" },
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" }
            ]}
          />
        </div>
      </div>
      <Panel title="Players" action={<Badge variant="secondary">Production</Badge>}>
        {project.players.length ? (
          <div className="p-3">
            <DataTable table={table} entityLabel="players" emptyMessage="No players match your search." />
          </div>
        ) : (
          <EmptyState
            icon={<Users />}
            title="Waiting for your first player"
            description="Player accounts appear here when someone signs in to your game."
          />
        )}
      </Panel>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Player details</SheetTitle>
            <SheetDescription>Production game account</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-6 px-6 pb-6">
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-accent text-lg font-semibold text-primary">
                  {selected.name.slice(0, 2)}
                </span>
                <div>
                  <h2 className="font-semibold">{selected.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{selected.email}</p>
                </div>
              </div>
              <StatusBadge status={selected.status} />
              <dl className="space-y-4 text-sm">
                {[
                  ["Player ID", selected.id],
                  ["Joined", selected.joined],
                  ["Last seen", selected.lastSeen],
                  ["Cloud saves", String(selected.saves)]
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-3 border-b pb-3" key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs leading-6 text-muted-foreground">
                {selected.status === "banned"
                  ? "Restoring access lets this player sign in again."
                  : "Banning blocks this player's access. Their account and saved data are retained."}
              </p>
              {request === "error" && <Notice>The moderation request failed. Try again.</Notice>}
              {request === "success" && <Notice tone="success">Moderation request submitted.</Notice>}
              <Button
                variant="outline"
                className="w-full"
                disabled={!canEdit || !onAction || request === "pending" || request === "success"}
                onClick={() => void moderate()}
              >
                {selected.status === "banned" ? <Check /> : <Ban />}
                {request === "pending" ? "Submitting…" : selected.status === "banned" ? "Restore access" : "Ban player"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
