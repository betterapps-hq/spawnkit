import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { Pause, Play, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { CopyButton } from "../copy-button"
import { SelectField } from "../select-field"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import { Notice } from "./primitives"

interface Event {
  id: string
  time: number
  received: number
  level: string
  kind: string
  name: string
  body: string
  service: string
  release: string
  environment: string
  attributes: Record<string, string | number | boolean>
  traceId: string | null
  spanId: string | null
  flags: number
  fingerprint: string | null
}
interface Usage {
  dailyLimit: number
  used: number
  resetsAt: string
  retentionDays: number
}
interface Page extends Usage {
  events: Event[]
  nextCursor: string | null
  since: number
  until: number
  summary: { total: number; errors: number }
  groups: { fingerprint: string; count: number; message: string; lastSeen: number }[]
}
interface Settings extends Usage {
  configured: boolean
  origins: string[]
  key?: string
  endpoint?: string
}

async function telemetryApi<T>(
  project: string,
  environment: string,
  operation: string,
  options: { signal?: AbortSignal; method?: string; body?: unknown; params?: URLSearchParams } = {}
): Promise<T> {
  const params = options.params ?? new URLSearchParams()
  params.set("environment", environment)
  const response = await fetch(
    `/api/platform/v1/projects/${encodeURIComponent(project)}/telemetry/${operation}?${params}`,
    {
      method: options.method ?? "GET",
      headers: { "content-type": "application/json" },
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
    }
  )
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.message ?? result.message ?? "Telemetry service unavailable.")
  return result as T
}

/** An isolated cache is discarded on project/account navigation, including all captured records. */
export function LiveTelemetry({
  projectId,
  sandbox,
  canEdit
}: {
  projectId: string
  sandbox: boolean
  canEdit: boolean
}) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnWindowFocus: false } } })
  )
  useEffect(
    () => () => {
      client.clear()
    },
    [client]
  )
  const [environment, setEnvironment] = useState("production")
  return (
    <QueryClientProvider client={client}>
      <section aria-label="Game telemetry" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Game telemetry</h2>
            <p className="text-sm text-muted-foreground">Events, errors and measurements reported by your game.</p>
            <p className="text-xs text-muted-foreground">
              Telemetry runs independently of hosting. Disable ingestion here to stop collection.
            </p>
          </div>
          <SelectField
            label="Telemetry environment"
            value={environment}
            onChange={setEnvironment}
            className="w-40"
            options={[
              { value: "production", label: "Production" },
              { value: "sandbox", label: sandbox ? "Sandbox" : "Sandbox (inactive)" }
            ]}
          />
        </div>
        <TelemetryFeed
          key={`${projectId}:${environment}`}
          projectId={projectId}
          environment={environment}
          canEdit={canEdit}
        />
      </section>
    </QueryClientProvider>
  )
}

function TelemetryFeed({
  projectId,
  environment,
  canEdit
}: {
  projectId: string
  environment: string
  canEdit: boolean
}) {
  const [paused, setPaused] = useState(false)
  const [level, setLevel] = useState("all")
  const [kind, setKind] = useState("all")
  const [hours, setHours] = useState("1")
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [release, setRelease] = useState("")
  const [cursor, setCursor] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<{ since: number; until: number } | null>(null)
  const [selected, setSelected] = useState<Event | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search)
      setCursor(null)
      setSnapshot(null)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])
  const queryKey = ["telemetry", projectId, environment, level, kind, hours, query, release, cursor, snapshot]
  const feed = useQuery({
    queryKey,
    refetchInterval: paused || cursor ? false : 10_000,
    refetchIntervalInBackground: false,
    queryFn: ({ signal }) => {
      const until = snapshot?.until ?? Date.now()
      const since = snapshot?.since ?? until - Number(hours) * 3_600_000
      const params = new URLSearchParams({ since: String(since), until: String(until), limit: "50" })
      if (level !== "all") params.set("level", level)
      if (kind !== "all") params.set("kind", kind)
      if (query) params.set("query", query)
      if (release) params.set("release", release)
      if (cursor) params.set("cursor", cursor)
      return telemetryApi<Page>(projectId, environment, "events", { params, signal })
    }
  })
  const settings = useQuery({
    queryKey: ["telemetry-settings", projectId, environment],
    queryFn: ({ signal }) => telemetryApi<Settings>(projectId, environment, "settings", { signal })
  })
  function filter(set: (value: string) => void, value: string) {
    set(value)
    setCursor(null)
    setSnapshot(null)
    setSelected(null)
  }
  return (
    <>
      <TelemetrySetup
        projectId={projectId}
        environment={environment}
        canEdit={canEdit}
        settings={settings.data}
        error={settings.error?.message}
        refresh={() => {
          void settings.refetch()
          void feed.refetch()
        }}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Records in range", feed.data?.summary.total],
          ["Errors in range", feed.data?.summary.errors],
          [
            "Today's quota",
            feed.data ? `${feed.data.used.toLocaleString()} / ${feed.data.dailyLimit.toLocaleString()}` : undefined
          ]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-2 text-xl font-semibold">{value ?? "—"}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Search telemetry"
          placeholder="Search events and messages"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          maxLength={100}
          className="w-full sm:w-64"
        />
        <SelectField
          label="Telemetry level"
          value={level}
          onChange={(value) => filter(setLevel, value)}
          className="w-36"
          options={[
            { value: "all", label: "All levels" },
            ...["trace", "debug", "info", "warn", "error", "fatal"].map((value) => ({ value, label: value }))
          ]}
        />
        <SelectField
          label="Telemetry kind"
          value={kind}
          onChange={(value) => filter(setKind, value)}
          className="w-40"
          options={[
            { value: "all", label: "All kinds" },
            ...["event", "log", "error", "measurement"].map((value) => ({ value, label: value }))
          ]}
        />
        <SelectField
          label="Telemetry time range"
          value={hours}
          onChange={(value) => filter(setHours, value)}
          className="w-36"
          options={[
            { value: "1", label: "Last hour" },
            { value: "24", label: "Last day" },
            { value: "168", label: "Last 7 days" }
          ]}
        />
        <Input
          aria-label="Telemetry release"
          placeholder="Exact release"
          value={release}
          onChange={(event) => filter(setRelease, event.target.value)}
          maxLength={128}
          className="w-40"
        />
        <Button variant="outline" onClick={() => setPaused(!paused)}>
          {paused ? <Play /> : <Pause />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          variant="outline"
          aria-label="Refresh telemetry"
          disabled={feed.isFetching}
          onClick={() => {
            setCursor(null)
            setSnapshot(null)
            void feed.refetch()
          }}
        >
          <RefreshCw />
        </Button>
      </div>
      {feed.error && (
        <Notice>
          Telemetry connection interrupted. {feed.error.message}{" "}
          <button className="underline" onClick={() => void feed.refetch()}>
            Try again
          </button>
        </Notice>
      )}
      {feed.isPending ? (
        <output className="text-sm text-muted-foreground">Loading telemetry…</output>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3 text-xs text-muted-foreground">
            {paused ? "Polling paused" : cursor ? "Viewing older records" : "Updates every 10 seconds"} · Times in UTC ·{" "}
            {feed.data?.retentionDays ?? 7}-day retention
          </div>
          {!feed.data?.events.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {feed.error
                ? "Telemetry could not be loaded."
                : "No telemetry in this range. Configure the package, allow capture in your game, and send an event."}
            </p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto" aria-label="Telemetry records">
              {feed.data.events.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left text-xs last:border-0 hover:bg-muted/50"
                  onClick={() => setSelected(event)}
                >
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {new Date(event.time).toISOString().slice(11, 23)}
                  </span>
                  <span
                    className={`w-10 shrink-0 uppercase ${["error", "fatal"].includes(event.level) ? "text-red-500" : "text-muted-foreground"}`}
                  >
                    {event.level}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{event.name}</span>
                    <span className="mt-1 block break-words text-muted-foreground">{event.body}</span>
                    <span className="mt-1 block text-muted-foreground">
                      {event.kind} · {event.release}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-between border-t p-3">
            <Button
              variant="outline"
              disabled={!cursor}
              onClick={() => {
                setCursor(null)
                setSnapshot(null)
              }}
            >
              Latest records
            </Button>
            <Button
              variant="outline"
              disabled={!feed.data?.nextCursor || feed.isFetching}
              onClick={() => {
                if (feed.data) {
                  setSnapshot({ since: feed.data.since, until: feed.data.until })
                  setCursor(feed.data.nextCursor)
                }
              }}
            >
              Older records
            </Button>
          </div>
        </div>
      )}
      {feed.data && (
        <p className="text-xs text-muted-foreground">
          Daily quota resets {new Date(feed.data.resetsAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. Counts
          reflect accepted, sampled records.
        </p>
      )}
      {Boolean(feed.data?.groups.length) && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Error groups in this range</h3>
          <div className="space-y-2">
            {feed.data?.groups.map((group) => (
              <div key={group.fingerprint} className="flex gap-3 text-xs">
                <strong>{group.count}×</strong>
                <span className="break-words">{group.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Telemetry event</SheetTitle>
            <SheetDescription>Recorded message, attributes and trace context</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 p-4">
              <h3 className="font-semibold">{selected.name}</h3>
              <p className="whitespace-pre-wrap break-words text-sm">{selected.body}</p>
              <dl className="grid grid-cols-2 gap-4 text-xs">
                {Object.entries({
                  ID: selected.id,
                  Time: new Date(selected.time).toISOString(),
                  Received: new Date(selected.received).toISOString(),
                  Level: selected.level,
                  Kind: selected.kind,
                  Environment: selected.environment,
                  Service: selected.service,
                  Release: selected.release,
                  Trace: selected.traceId ?? "None",
                  Span: selected.spanId ?? "None",
                  "Trace flags": selected.flags
                }).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="mt-1 break-all font-mono">{value}</dd>
                  </div>
                ))}
              </dl>
              <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(selected.attributes, null, 2)}
              </pre>
              <CopyButton value={JSON.stringify(selected, null, 2)} label="Copy telemetry event" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function TelemetrySetup({
  projectId,
  environment,
  canEdit,
  settings,
  error,
  refresh
}: {
  projectId: string
  environment: string
  canEdit: boolean
  settings: Settings | undefined
  error: string | undefined
  refresh: () => void
}) {
  const [originDraft, setOrigins] = useState<string | null>(null)
  const origins = originDraft ?? settings?.origins.join(", ") ?? ""
  const [configuration, setConfiguration] = useState<Settings | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [confirm, setConfirm] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)
  async function configure(method: "PUT" | "DELETE", operation = "settings") {
    setPending(true)
    setMessage("")
    try {
      const result = await telemetryApi<Settings>(projectId, environment, operation, {
        method,
        ...(method === "PUT"
          ? {
              body: {
                origins: origins
                  .split(",")
                  .map((origin) => origin.trim())
                  .filter(Boolean)
              }
            }
          : {})
      })
      setConfiguration(method === "PUT" ? result : null)
      setConfirm(false)
      setConfirmErase(false)
      refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save telemetry configuration.")
    } finally {
      setPending(false)
    }
  }
  const env = configuration?.key
    ? `VITE_SPAWN_TELEMETRY_ENABLED=true\nVITE_SPAWN_TELEMETRY_ENDPOINT=${configuration.endpoint}\nVITE_SPAWN_TELEMETRY_KEY=${configuration.key}\nVITE_SPAWN_ENVIRONMENT=${environment}\nVITE_SPAWN_RELEASE=your-release`
    : ""
  return (
    <details
      className="rounded-xl border bg-card p-4"
      open={settings ? !settings.configured || Boolean(configuration) : false}
    >
      <summary className="cursor-pointer text-sm font-medium">
        Telemetry setup ·{" "}
        {error ? "Unavailable" : !settings ? "Loading" : settings.configured ? "Enabled" : "Not configured"}
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Create the game with <code>--telemetry platform-telemetry</code>, or run{" "}
          <code>spawn add platform-telemetry</code> in an existing one and then <code>pnpm install</code>, committing
          the updated <code>pnpm-lock.yaml</code>. Add your game origins, then copy the public configuration into the
          game&apos;s .env file and redeploy. Capture starts only after your game calls{" "}
          <code>setTelemetryConsent(true)</code> according to its collection policy.
        </p>
        <Label htmlFor="telemetry-origins">Allowed game origins (comma separated)</Label>
        <Input
          id="telemetry-origins"
          value={origins}
          onChange={(event) => setOrigins(event.target.value)}
          placeholder="https://game.example, http://localhost:5173"
          disabled={!canEdit || pending}
        />
        {settings?.configured && (
          <p className="text-sm text-muted-foreground">
            Rotating immediately invalidates the key in existing game bundles. Update the configuration and redeploy
            each affected build.
          </p>
        )}
        {error && <Notice>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canEdit || pending || !settings}
            onClick={() => {
              setConfirmErase(false)
              if (settings?.configured && !confirm) setConfirm(true)
              else void configure("PUT")
            }}
          >
            {pending
              ? "Saving…"
              : confirm
                ? "Confirm rotation"
                : settings?.configured
                  ? "Rotate write key"
                  : "Enable telemetry"}
          </Button>
          {settings?.configured && (
            <Button variant="outline" disabled={!canEdit || pending} onClick={() => void configure("DELETE")}>
              Disable ingestion
            </Button>
          )}
          <Button
            variant="outline"
            disabled={!canEdit || pending || !settings}
            onClick={() => {
              setConfirm(false)
              setConfirmErase(true)
            }}
          >
            Erase telemetry
          </Button>
          {confirm && (
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          )}
        </div>
        {confirmErase && (
          <div className="space-y-2 rounded-lg border border-destructive/40 p-3">
            <p className="text-sm">
              Erase all telemetry for {environment} and disable ingestion? This cannot be undone in the dashboard.
              Today's quota remains used; recovery copies follow the storage provider's retention.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" disabled={pending} onClick={() => void configure("DELETE", "events")}>
                Confirm erasure
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => setConfirmErase(false)}>
                Cancel erasure
              </Button>
            </div>
          </div>
        )}
        {env && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              This public key permits writes only. Copy it now; it is not displayed again.
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">{env}</pre>
            <CopyButton value={env} label="Copy telemetry configuration" />
          </div>
        )}
      </div>
    </details>
  )
}
