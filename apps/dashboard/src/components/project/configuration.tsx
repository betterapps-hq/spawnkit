import { hostingRegions } from "@spawn/templates/catalog"
import { Database, GitBranch, Globe2, KeyRound, LoaderCircle, Plus, Server, ShieldCheck, Trash2 } from "lucide-react"
import { useState } from "react"
import { CopyButton } from "../copy-button"
import { SelectField } from "../select-field"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import type { ActionHandler, EnvironmentName, ProjectModel, Region } from "./model"
import { EmptyState, Notice, Panel, StatusBadge } from "./primitives"

export function ProjectSettings({
  project,
  canEdit,
  onAction,
  onConfigureSource
}: {
  project: ProjectModel
  canEdit: boolean
  onAction?: ActionHandler | undefined
  onConfigureSource?: (() => void) | undefined
}) {
  const [name, setName] = useState(project.name)
  const [branch, setBranch] = useState(project.productionBranch ?? "main")
  const [telemetry, setTelemetry] = useState<string>(project.configuration?.telemetry ?? "platform")
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle")
  const [error, setError] = useState("")
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit || !onAction || state === "pending") return
    if (!name.trim() || name.trim().length > 64) {
      setError("Use a project name between 1 and 64 characters.")
      return
    }
    if (project.repository && !branch.trim()) {
      setError("Enter a production branch.")
      return
    }
    setError("")
    setState("pending")
    try {
      await onAction({
        kind: "save-settings",
        projectId: project.id,
        values: { name: name.trim(), branch: branch.trim(), telemetry }
      })
      setState("success")
    } catch {
      setState("error")
      setError("Settings could not be saved. Your edits are still here.")
    }
  }
  return (
    <form id="project-settings-form" onSubmit={(event) => void submit(event)} className="space-y-5">
      {error && <Notice>{error}</Notice>}
      {state === "success" && <Notice tone="success">Settings saved.</Notice>}
      {state === "pending" && (
        <Notice tone="info">
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            Saving settings…
          </span>
        </Notice>
      )}
      <fieldset disabled={!canEdit || state === "pending"} className="space-y-5">
        <Panel title="General">
          <div className="grid gap-6 p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Project name</Label>
              <Input
                id="settings-name"
                value={name}
                maxLength={64}
                onChange={(event) => {
                  setName(event.target.value)
                  setState("idle")
                }}
              />
              <p className="text-xs text-muted-foreground">Shown in your project list and dashboard.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-id">Project ID</Label>
              <div className="flex items-center gap-2">
                <Input id="settings-id" readOnly value={project.id} className="font-mono text-xs" />
                <CopyButton label="Copy project ID" value={project.id} compact />
              </div>
              <p className="text-xs text-muted-foreground">Used by the CLI and deployment workflows.</p>
            </div>
          </div>
        </Panel>
        <Panel title="Source">
          <div className="space-y-5 p-5">
            {project.repository ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-muted">
                    <GitBranch className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{project.repository}</p>
                    <p className="mt-1 text-xs text-muted-foreground">GitHub repository</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    Connected
                  </Badge>
                </div>
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="settings-branch">Production branch</Label>
                  <Input
                    id="settings-branch"
                    value={branch}
                    onChange={(event) => {
                      setBranch(event.target.value)
                      setState("idle")
                    }}
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Releases from this branch can target production.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <GitBranch className="mt-1 size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">CLI publishing</p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {project.configuration?.github.mode && project.configuration.github.mode !== "none"
                      ? "Repository configuration saved. GitHub is not connected."
                      : "Publish with the CLI or configure a GitHub repository."}
                  </p>
                  {onConfigureSource && (
                    <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onConfigureSource}>
                      <GitBranch />
                      Configure GitHub
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Observability">
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-telemetry">Telemetry</Label>
              <SelectField
                id="settings-telemetry"
                label="Telemetry provider"
                value={telemetry}
                onChange={(value) => {
                  setTelemetry(value)
                  setState("idle")
                }}
                options={[
                  { value: "platform", label: "SpawnKit telemetry" },
                  { value: "sentry", label: "Sentry" },
                  { value: "none", label: "None" }
                ]}
              />
            </div>
            <p className="self-center text-xs leading-6 text-muted-foreground">
              {telemetry === "sentry"
                ? "Use your Sentry project to track errors. Its DSN must be configured separately for each environment."
                : telemetry === "platform"
                  ? "Adds instrumentation hooks for SpawnKit telemetry to your template configuration."
                  : "Application error reporting is disabled. Deployment logs remain available."}
            </p>
          </div>
        </Panel>
      </fieldset>
      <Panel title="Environment variables" action={<Badge variant="secondary">Production</Badge>}>
        <div className="space-y-4 p-5">
          {project.connected !== false && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <KeyRound className="size-4" />
              Values are encrypted and never displayed here.
            </div>
          )}
          {project.database !== "none" && project.connected !== false ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <code className="text-xs">DATABASE_URL</code>
              <span className="font-mono text-xs text-muted-foreground">••••••••••••••••</span>
              <Badge variant="outline">Managed</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No environment variables configured.</p>
          )}
          <p className="text-xs leading-6 text-muted-foreground">
            Production and Sandbox keep separate values. Promoting a build does not copy secrets.
          </p>
        </div>
      </Panel>
    </form>
  )
}

function ResourceMeter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <meter
        aria-label={label}
        value={value}
        min={0}
        max={100}
        high={85}
        optimum={25}
        className="block h-2 w-full [&::-webkit-meter-bar]:border-0 [&::-webkit-meter-bar]:bg-muted [&::-webkit-meter-optimum-value]:bg-primary/65 [&::-webkit-meter-suboptimum-value]:bg-amber-500"
      />
    </div>
  )
}

export function Backend({
  project,
  canEdit,
  onAction
}: {
  project: ProjectModel
  canEdit: boolean
  onAction?: ActionHandler | undefined
}) {
  const [environment, setEnvironment] = useState<EnvironmentName>("production")
  const [regions, setRegions] = useState({
    production: project.production.regions,
    sandbox: project.sandbox?.regions ?? []
  })
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle")
  const [addRegion, setAddRegion] = useState(false)
  const [newRegion, setNewRegion] = useState("")
  const current = regions[environment]
  const available = hostingRegions.filter((region) => !current.some((item) => item.id === region.id))
  function update(next: Region[]) {
    setRegions({ ...regions, [environment]: next })
    setState("idle")
  }
  function add() {
    const region = available.find((item) => item.id === (newRegion || available[0]?.id))
    if (!region) return
    update([
      ...current,
      { id: region.id, city: region.city, cores: 1, ram: 2, cpu: 0, memory: 0, players: 0, status: "paused" }
    ])
    setAddRegion(false)
    setNewRegion("")
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit || !onAction || state === "pending") return
    setState("pending")
    try {
      await onAction({
        kind: "save-backend",
        projectId: project.id,
        values: {
          production: regions.production.map(({ id, cores, ram }) => ({ id, cores, ram })),
          sandbox: project.sandbox ? regions.sandbox.map(({ id, cores, ram }) => ({ id, cores, ram })) : null
        }
      })
      setState("success")
    } catch {
      setState("error")
    }
  }
  if (project.mode === "single" && !project.services.length && project.database === "none")
    return (
      <Card className="p-0">
        <EmptyState
          icon={<Globe2 />}
          title="Your game runs in the browser"
          description="Global frontend hosting is included. No multiplayer runtime or database is configured."
        />
      </Card>
    )
  return (
    <form id="project-backend-form" onSubmit={(event) => void submit(event)} className="space-y-5">
      {state === "success" && (
        <Notice tone="success">
          Configuration saved. Resource changes will be applied by the deployment coordinator.
        </Notice>
      )}
      {state === "error" && <Notice>Configuration could not be saved. Your edits are still here.</Notice>}
      {state === "pending" && <Notice tone="info">Saving configuration…</Notice>}
      <Tabs
        value={environment}
        onValueChange={(value) => {
          if (value === "production" || value === "sandbox") {
            setEnvironment(value)
            setAddRegion(false)
            setNewRegion("")
          }
        }}
      >
        <TabsList aria-label="Backend environment">
          <TabsTrigger value="production">Production</TabsTrigger>
          {project.sandbox && <TabsTrigger value="sandbox">Sandbox</TabsTrigger>}
        </TabsList>
        <TabsContent value={environment} className="space-y-5">
          <fieldset disabled={!canEdit || state === "pending"} className="space-y-5">
            {project.mode === "multiplayer" ? (
              <Panel
                title="Runtime regions"
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!available.length}
                    onClick={() => setAddRegion(!addRegion)}
                  >
                    <Plus />
                    Add region
                  </Button>
                }
              >
                <div className="divide-y">
                  {current.map((region) => (
                    <div
                      key={region.id}
                      className="grid items-center gap-5 p-5 lg:grid-cols-[minmax(160px,1fr)_170px_minmax(140px,1fr)_32px]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-accent/40 text-primary">
                          <Server className="size-4" />
                        </span>
                        <div>
                          <p className="mb-2 text-sm font-medium">{region.city}</p>
                          <StatusBadge status={region.status} />
                        </div>
                      </div>
                      <div>
                        <SelectField
                          label={`${region.city} compute`}
                          value={`${region.cores}/${region.ram}`}
                          onChange={(value) => {
                            const [cores, ram] = value.split("/").map(Number)
                            update(
                              current.map((item) =>
                                item.id === region.id ? { ...item, cores: cores!, ram: ram! } : item
                              )
                            )
                          }}
                          options={[
                            { value: "1/2", label: "1 vCPU / 2 GB" },
                            { value: "2/4", label: "2 vCPU / 4 GB" },
                            { value: "4/8", label: "4 vCPU / 8 GB" }
                          ]}
                        />
                        <p className="mt-2 text-[10px] text-muted-foreground">{region.players} connected players</p>
                      </div>
                      {project.connected !== false ? (
                        <div className="grid grid-cols-2 gap-4">
                          <ResourceMeter label={`${region.city} CPU`} value={region.cpu} />
                          <ResourceMeter label={`${region.city} memory`} value={region.memory} />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Resources haven't been provisioned.</p>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={current.length === 1}
                        aria-label={`Remove ${region.city}`}
                        onClick={() => update(current.filter((item) => item.id !== region.id))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                {addRegion && (
                  <div className="flex flex-wrap gap-3 border-t bg-muted/20 p-5">
                    <div className="min-w-40 flex-1">
                      <SelectField
                        label="New runtime region"
                        value={newRegion || available[0]?.id || ""}
                        onChange={setNewRegion}
                        options={available.map((region) => ({ value: region.id, label: region.city }))}
                      />
                    </div>
                    <Button type="button" onClick={add}>
                      Add to configuration
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setAddRegion(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
                <p className="border-t px-5 py-3 text-[11px] text-muted-foreground">
                  Colyseus / Node.js.{" "}
                  {environment === "sandbox"
                    ? "Sandbox compute is independent from production."
                    : "Each region runs its own isolated game runtime."}
                </p>
              </Panel>
            ) : (
              <Panel title={project.services.length ? "Managed game services" : "Frontend hosting"}>
                <div className="flex items-center gap-4 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {project.services.length ? "Single-player services" : "Global delivery"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {project.services.length
                        ? "$5/month includes game service usage."
                        : "No multiplayer runtime is needed."}
                    </p>
                  </div>
                </div>
              </Panel>
            )}
          </fieldset>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Game services">
              <div className="space-y-4 p-5">
                {project.services.length ? (
                  project.services.map((service) => (
                    <div key={service} className="flex items-center justify-between gap-3">
                      <span className="text-xs">{service}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        {project.connected === false ? "Configured" : "Enabled"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No game services configured.</p>
                )}
              </div>
            </Panel>
            <Panel title="Database">
              <div className="flex items-start gap-3 p-5">
                <Database className="mt-1 size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    {project.database === "postgresql"
                      ? "PostgreSQL"
                      : project.database === "sqlite"
                        ? "SQLite"
                        : "No custom database"}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {project.database !== "none"
                      ? project.connected === false
                        ? "Drizzle ORM selected. Database provisioning hasn't started."
                        : "Drizzle ORM. Isolated data and credentials for each environment."
                      : project.services.length
                        ? "Game services manage their own persistence."
                        : "Add persistent storage when your game needs it."}
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  )
}
