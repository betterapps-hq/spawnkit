/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The virtual log viewport supports keyboard scrolling. */
import { ArrowDown, Pause, Play, Terminal } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "../copy-button"
import { SelectField } from "../select-field"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import type { ProjectModel } from "./model"
import { Notice } from "./primitives"

type LogEntry = ProjectModel["logs"][number]
const ROW_HEIGHT = 32
const OVERSCAN = 8
const columns =
  "grid grid-cols-[8ch_5ch_minmax(0,1fr)] items-center gap-2 px-3 sm:grid-cols-[12ch_5ch_minmax(0,1fr)] sm:gap-3 sm:px-4"
function logTime(value: string) {
  const iso = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/.exec(value)
  return iso?.[1]?.slice(0, 12) ?? value
}
function logText(log: LogEntry) {
  return `${log.time} ${log.level.toUpperCase()} [${log.environment}/${log.region}] [${log.release}] ${log.message}`
}
function levelColor(level: LogEntry["level"]) {
  return level === "error" ? "text-rose-300" : level === "warn" ? "text-amber-300" : "text-sky-300"
}

export function Logs({
  project,
  disconnected = false,
  onReconnect
}: {
  project: ProjectModel
  disconnected?: boolean
  onReconnect?: () => void
}) {
  const [query, setQuery] = useState("")
  const [level, setLevel] = useState("all")
  const [environment, setEnvironment] = useState("all")
  const [paused, setPaused] = useState(false)
  const [snapshot, setSnapshot] = useState(project.logs)
  const [selected, setSelected] = useState<LogEntry | null>(null)
  const [viewport, setViewport] = useState({ top: 0, height: 480 })
  const [following, setFollowing] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const followRef = useRef(true)
  const pendingFocus = useRef<number | null>(null)
  const source = paused ? snapshot : project.logs
  const entries = useMemo(() => {
    const search = query.trim().toLowerCase()
    return source.filter(
      (log) =>
        (environment === "all" || log.environment === environment) &&
        (level === "all" || log.level === level) &&
        `${log.message} ${log.region} ${log.release}`.toLowerCase().includes(search)
    )
  }, [source, environment, level, query])
  const copiedLogs = useMemo(() => entries.map(logText).join("\n"), [entries])
  const start = Math.max(0, Math.min(entries.length - 1, Math.floor(viewport.top / ROW_HEIGHT) - OVERSCAN))
  const end = Math.min(entries.length, start + Math.ceil(viewport.height / ROW_HEIGHT) + OVERSCAN * 2)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      setViewport({ top: element.scrollTop, height: element.clientHeight })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (element && followRef.current) element.scrollTop = element.scrollHeight
  }, [entries])
  useLayoutEffect(() => {
    if (pendingFocus.current === null) return
    const button = scrollRef.current?.querySelector<HTMLButtonElement>(`[data-log-index="${pendingFocus.current}"]`)
    if (button) {
      button.focus({ preventScroll: true })
      pendingFocus.current = null
    }
  }, [start, end])

  function resetScroll() {
    followRef.current = true
    setFollowing(true)
  }
  function latest() {
    resetScroll()
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }
  function togglePause() {
    if (!paused) setSnapshot(project.logs)
    setPaused(!paused)
  }
  function focusEntry(index: number) {
    const element = scrollRef.current
    if (!element) return
    const next = Math.max(0, Math.min(entries.length - 1, index))
    if (next * ROW_HEIGHT < element.scrollTop) element.scrollTop = next * ROW_HEIGHT
    else if ((next + 1) * ROW_HEIGHT > element.scrollTop + element.clientHeight - 26)
      element.scrollTop = (next + 1) * ROW_HEIGHT - element.clientHeight + 26
    const button = element.querySelector<HTMLButtonElement>(`[data-log-index="${next}"]`)
    if (button) button.focus({ preventScroll: true })
    else {
      pendingFocus.current = next
      setViewport({ top: element.scrollTop, height: element.clientHeight })
    }
  }

  return (
    <div className="space-y-5">
      {disconnected && (
        <Notice>
          Log connection interrupted. Existing entries remain available.{" "}
          <button className="ml-1 font-medium underline" onClick={onReconnect}>
            Reconnect
          </button>
        </Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(event) => {
            resetScroll()
            setQuery(event.target.value)
          }}
          className="min-w-48 flex-1 bg-card"
          aria-label="Search logs"
          placeholder="Search messages, region, or version…"
        />
        <div className="w-40">
          <SelectField
            label="Log environment"
            value={environment}
            onChange={(value) => {
              resetScroll()
              setEnvironment(value)
            }}
            options={[
              { value: "all", label: "All environments" },
              { value: "production", label: "Production" },
              ...(project.sandbox ? [{ value: "sandbox", label: "Sandbox" }] : [])
            ]}
          />
        </div>
        <div className="w-32">
          <SelectField
            label="Log level"
            value={level}
            onChange={(value) => {
              resetScroll()
              setLevel(value)
            }}
            options={[
              { value: "all", label: "All levels" },
              { value: "info", label: "Info" },
              { value: "warn", label: "Warnings" },
              { value: "error", label: "Errors" }
            ]}
          />
        </div>
      </div>
      <section
        aria-label="Project log stream"
        className="overflow-hidden rounded-xl border border-slate-700 bg-[#1e1b29] text-slate-200 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Terminal className="size-3.5 text-violet-300" />
            <span>
              {project.connected === false
                ? "No deployment"
                : disconnected
                  ? "Disconnected"
                  : paused
                    ? "Stream paused"
                    : "Live stream"}
            </span>
            <span className="border-l border-white/20 pl-2 text-slate-400">
              {entries.length.toLocaleString("en-US")} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
              disabled={disconnected || project.connected === false}
              onClick={togglePause}
            >
              {paused ? <Play /> : <Pause />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <CopyButton label="Copy filtered logs" value={copiedLogs} compact disabled={!entries.length} />
          </div>
        </div>
        <div
          ref={scrollRef}
          className="h-[clamp(280px,55vh,640px)] overflow-auto overscroll-contain font-mono text-[11px] leading-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300"
          tabIndex={0}
          aria-label="Log entries"
          onScroll={(event) => {
            const element = event.currentTarget
            const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= ROW_HEIGHT
            followRef.current = atBottom
            setFollowing(atBottom)
            setViewport({ top: element.scrollTop, height: element.clientHeight })
          }}
        >
          <div
            aria-hidden="true"
            className={cn(
              columns,
              "sticky top-0 z-10 h-[26px] border-b border-white/10 bg-[#252131] text-[10px] text-slate-400"
            )}
          >
            <span>Time (UTC)</span>
            <span>Level</span>
            <span>Message</span>
          </div>
          {entries.length ? (
            <ul
              aria-label="Filtered log entries"
              className="relative m-0 list-none p-0"
              style={{ height: entries.length * ROW_HEIGHT }}
            >
              {entries.slice(start, end).map((log, offset) => {
                const index = start + offset
                return (
                  <li
                    key={log.id}
                    aria-setsize={entries.length}
                    aria-posinset={index + 1}
                    className="absolute inset-x-0"
                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    <button
                      type="button"
                      data-log-index={index}
                      onClick={() => setSelected(log)}
                      onKeyDown={(event) => {
                        const next =
                          event.key === "ArrowDown"
                            ? index + 1
                            : event.key === "ArrowUp"
                              ? index - 1
                              : event.key === "Home"
                                ? 0
                                : event.key === "End"
                                  ? entries.length - 1
                                  : null
                        if (next !== null) {
                          event.preventDefault()
                          focusEntry(next)
                        }
                      }}
                      className={cn(
                        columns,
                        "h-full w-full text-left hover:bg-white/5 focus-visible:bg-white/10 focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-violet-300",
                        log.level === "error" && "bg-rose-400/5",
                        selected?.id === log.id && "bg-white/10"
                      )}
                    >
                      <time
                        className="min-w-0 truncate whitespace-nowrap text-slate-400 tabular-nums"
                        title={`${log.time} UTC`}
                      >
                        <span className="sm:hidden">{logTime(log.time).slice(0, 8)}</span>
                        <span className="hidden sm:inline">{logTime(log.time)}</span>
                      </time>
                      <span className={cn("uppercase", levelColor(log.level))}>{log.level}</span>
                      <span className="truncate">{log.message}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 px-5 text-center font-sans">
              <Terminal className="size-6 text-slate-400" />
              <p className="text-sm">{project.logs.length ? "No matching log entries" : "No logs yet"}</p>
              <p className="text-xs text-slate-400">
                {project.logs.length
                  ? "Try a different search or filter."
                  : "Logs will appear after the first deployment."}
              </p>
            </div>
          )}
        </div>
        <div className="flex min-h-9 items-center justify-between gap-2 border-t border-white/10 px-4 text-[10px] text-slate-400">
          <span>
            {!entries.length
              ? "No entries"
              : paused
                ? "New entries are paused."
                : following
                  ? "Following latest"
                  : "Viewing earlier entries"}
          </span>
          {!following ? (
            <button
              type="button"
              className="flex items-center gap-1 py-2 text-violet-200 hover:text-white"
              onClick={latest}
            >
              <ArrowDown className="size-3" />
              Jump to latest
            </button>
          ) : (
            <span>{entries.length ? "Select an entry to inspect" : ""}</span>
          )}
        </div>
      </section>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent
          className="w-full overflow-y-auto sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            scrollRef.current?.focus({ preventScroll: true })
          }}
        >
          <SheetHeader>
            <SheetTitle>Log entry</SheetTitle>
            <SheetDescription>Message and runtime context</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-6 px-4 pb-6">
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-xs">
                {[
                  ["Time (UTC)", selected.time],
                  ["Level", selected.level.toUpperCase()],
                  ["Environment", selected.environment],
                  ["Region", selected.region],
                  ["Version", selected.release],
                  ["Entry ID", selected.id]
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-1.5 break-all font-mono">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="overflow-hidden rounded-lg border border-slate-700 bg-[#1e1b29] text-slate-200">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                  <h3 className="text-xs font-medium">Message</h3>
                  <CopyButton value={selected.message} label="Copy log message" compact />
                </div>
                <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6">
                  {selected.message}
                </pre>
              </div>
              <CopyButton value={logText(selected)} label="Copy full entry" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
