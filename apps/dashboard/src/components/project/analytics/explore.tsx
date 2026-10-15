import { ArrowUpRight, Download, Search, BookmarkPlus } from "lucide-react"
import { useMemo, useState } from "react"
import { SelectField } from "../../select-field"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet"
import { number, sessionEvents, type AnalyticsSession, type AnalyticsEvent } from "./model"
import { Blank, Panel, Tone } from "./primitives"

export function AnalyticsExplore({
  sessions,
  onSession
}: {
  sessions: AnalyticsSession[]
  onSession: (session: AnalyticsSession) => void
}) {
  const [search, setSearch] = useState(""),
    [level, setLevel] = useState("all"),
    [group, setGroup] = useState("name"),
    [page, setPage] = useState(0)
  const [selected, setSelected] = useState<AnalyticsEvent | null>(null)
  const [views, setViews] = useState<{ name: string; search: string; level: string; group: string }[]>([])
  const [saving, setSaving] = useState(false),
    [name, setName] = useState(""),
    [notice, setNotice] = useState("")
  const events = useMemo(() => sessions.flatMap(sessionEvents).sort((a, b) => b.time - a.time), [sessions])
  const filtered = events.filter(
    (event) =>
      (level === "all" || event.level === level) &&
      `${event.name} ${JSON.stringify(event.attributes)}`.toLowerCase().includes(search.toLowerCase())
  )
  const grouped = Object.entries(
    filtered.reduce<Record<string, number>>((counts, event) => {
      const key = group === "name" ? event.name : String(event.attributes[group])
      counts[key] = (counts[key] ?? 0) + 1
      return counts
    }, {})
  ).sort((a, b) => b[1] - a[1])
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 12) - 1))
  function exportCsv() {
    const cell = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`
    const csv = [
      "time,event,level,session,release,device,scene",
      ...filtered.map((event) =>
        [
          new Date(event.time).toISOString(),
          event.name,
          event.level,
          event.session.id,
          event.session.release,
          event.session.device,
          event.session.scene
        ]
          .map(cell)
          .join(",")
      )
    ].join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "spawn-analytics-events.csv"
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(`Exported ${number(filtered.length)} events.`)
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Events</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setSaving(true)}>
            <BookmarkPlus className="size-3.5" />
            Save view
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>
      <div className="an-filter-row">
        <div className="an-search">
          <Search />
          <Input
            aria-label="Search events"
            placeholder="Search events, scenes, devices or attributes…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
          />
        </div>
        <SelectField
          label="Event severity"
          className="w-36"
          value={level}
          onChange={(value) => {
            setLevel(value)
            setPage(0)
          }}
          options={[
            { label: "All levels", value: "all" },
            { label: "Errors", value: "error" },
            { label: "Info", value: "info" }
          ]}
        />
        <SelectField
          label="Saved event view"
          className="w-44"
          value="choose"
          onChange={(value) => {
            const view = views[Number(value)]
            if (view) {
              setSearch(view.search)
              setLevel(view.level)
              setGroup(view.group)
              setPage(0)
              setNotice(`Opened ${view.name}`)
            }
          }}
          options={[
            { value: "choose", label: "Saved views" },
            ...views.map((view, index) => ({ value: String(index), label: view.name }))
          ]}
        />
      </div>
      <Panel
        title="Event breakdown"
        subtitle={`${number(filtered.length)} matching events from ${number(new Set(filtered.map((event) => event.session.id)).size)} sessions`}
        action={
          <SelectField
            label="Group events by"
            className="w-36"
            value={group}
            onChange={setGroup}
            options={[
              { value: "name", label: "Event name" },
              { value: "device", label: "Device" },
              { value: "release", label: "Release" },
              { value: "scene", label: "Scene" }
            ]}
          />
        }
      >
        <div className="an-event-bars">
          {grouped.map(([key, count]) => (
            <button
              key={key}
              className="an-event-bar"
              onClick={() => {
                setSearch(key)
                setPage(0)
              }}
              aria-label={`Filter events by ${key}`}
            >
              <span>{key}</span>
              <div>
                <i style={{ width: `${(count / Math.max(1, grouped[0]![1])) * 100}%` }} />
              </div>
              <strong>{number(count)}</strong>
            </button>
          ))}
        </div>
        {!grouped.length && (
          <Blank
            title="No events match"
            description="Clear the search or select another severity."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setLevel("all")
                }}
              >
                Clear event filters
              </Button>
            }
          />
        )}
      </Panel>
      <div className="an-panel">
        <div className="an-table-scroll">
          <table className="an-table">
            <thead>
              <tr>
                <th>Time (UTC)</th>
                <th>Event</th>
                <th>Level</th>
                <th>Scene</th>
                <th>Session</th>
                <th>Release</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(currentPage * 12, currentPage * 12 + 12).map((event) => (
                <tr key={event.id}>
                  <td className="font-mono text-xs">{new Date(event.time).toISOString().slice(11, 23)}</td>
                  <td>
                    <button className="an-text-link font-mono" onClick={() => setSelected(event)}>
                      {event.name}
                      <ArrowUpRight className="size-3" />
                    </button>
                  </td>
                  <td>
                    <Tone tone={event.level === "error" ? "bad" : "neutral"}>{event.level}</Tone>
                  </td>
                  <td>{event.session.scene}</td>
                  <td>
                    <button className="an-text-link font-mono" onClick={() => onSession(event.session)}>
                      {event.session.id}
                    </button>
                  </td>
                  <td>{event.session.release}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="an-pagination">
          <span className="an-metadata">
            <span>{number(filtered.length)} events</span>
            <span>
              Page {currentPage + 1} of {Math.max(1, Math.ceil(filtered.length / 12))}
            </span>
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={(currentPage + 1) * 12 >= filtered.length}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      <output className="block text-xs text-muted-foreground">{notice}</output>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent className="w-full overflow-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
            <SheetDescription>Event attributes</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-5 px-5 pb-5">
              <Tone tone={selected.level === "error" ? "bad" : "neutral"}>{selected.level}</Tone>
              <dl className="an-detail-list">
                {Object.entries(selected.attributes).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
              <Button
                variant="outline"
                onClick={() => {
                  onSession(selected.session)
                  setSelected(null)
                }}
              >
                Open session
                <ArrowUpRight className="size-4" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={saving} onOpenChange={setSaving}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Save this event view</SheetTitle>
            <SheetDescription>Save these search and grouping filters.</SheetDescription>
          </SheetHeader>
          <form
            className="space-y-5 px-5"
            onSubmit={(event) => {
              event.preventDefault()
              if (!name.trim()) return
              setViews((previous) => [...previous, { name: name.trim(), search, level, group }])
              setNotice(`Saved ${name.trim()}.`)
              setName("")
              setSaving(false)
            }}
          >
            <label className="an-field" htmlFor="analytics-view-name">
              View name
              <Input
                id="analytics-view-name"
                required
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Mobile checkpoint failures"
              />
            </label>
            <div className="rounded-lg border p-4 text-xs leading-6 text-muted-foreground">
              Search: {search || "All events"}
              <br />
              Level: {level}
              <br />
              Group by: {group}
            </div>
            <Button type="submit" disabled={!name.trim()}>
              Save view
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
