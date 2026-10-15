import { Bell, Pause, Play, Plus, Settings2 } from "lucide-react"
import { useState } from "react"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet"
import { health, type AnalyticsSession } from "./model"
import { Panel, Tone } from "./primitives"

type Rule = { id: string; name: string; metric: "save" | "affected" | "frame"; threshold: number; enabled: boolean }
const metricNames = { save: "Checkpoint save p95", affected: "Sessions with issues", frame: "Frame time p95" }
const defaults: Rule[] = [
  { id: "save-latency", name: "Checkpoint saves are slowing down", metric: "save", threshold: 500, enabled: true },
  { id: "session-health", name: "Too many sessions hit an issue", metric: "affected", threshold: 10, enabled: true }
]

export function AnalyticsAlerts({ sessions, canEdit }: { sessions: AnalyticsSession[]; canEdit: boolean }) {
  const [rules, setRules] = useState(defaults),
    [editing, setEditing] = useState<Rule | null>(null),
    [notice, setNotice] = useState("")
  const [preview, setPreview] = useState<string | null>(null),
    [validation, setValidation] = useState("")
  const stats = health(sessions)
  const value = (rule: Rule) => (rule.metric === "affected" ? 100 - stats.errorFree : stats[rule.metric])
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Alerts</h2>
        </div>
        <Button
          size="sm"
          disabled={!canEdit}
          onClick={() => {
            setValidation("")
            setEditing({ id: "", name: "", metric: "save", threshold: 500, enabled: true })
          }}
        >
          <Plus className="size-3.5" />
          Create alert
        </Button>
      </div>

      <Panel title="Alert rules" action={<Tone>Delivery not connected</Tone>}>
        {rules.map((rule) => (
          <div className="an-alert-row" key={rule.id}>
            <div className="an-alert-icon">
              <Bell className="size-4" />
            </div>
            <div className="flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <strong className="text-sm font-medium">{rule.name}</strong>
                <Tone tone={rule.enabled ? "good" : "neutral"}>{rule.enabled ? "Ready" : "Paused"}</Tone>
              </div>
              <p className="text-xs text-muted-foreground">
                {metricNames[rule.metric]} above {rule.threshold}
                {rule.metric === "affected" ? "%" : " ms"}
              </p>
              {preview === rule.id && (
                <output className="an-alert-result">
                  <Tone tone={value(rule) > rule.threshold ? "warning" : "good"}>
                    {value(rule) > rule.threshold ? "Would trigger" : "Would stay quiet"}
                  </Tone>
                  <span>
                    {value(rule).toFixed(1)}
                    {rule.metric === "affected" ? "%" : " ms"}. {!rule.enabled && "Paused"}
                  </span>
                </output>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setPreview(rule.id)}>
                Test
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${rule.name}`}
                disabled={!canEdit}
                onClick={() => {
                  setEditing({ ...rule })
                  setValidation("")
                }}
              >
                <Settings2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${rule.enabled ? "Pause" : "Resume"} ${rule.name}`}
                disabled={!canEdit}
                onClick={() => {
                  setRules((previous) =>
                    previous.map((item) => (item.id === rule.id ? { ...item, enabled: !item.enabled } : item))
                  )
                  setNotice(`${rule.name} ${rule.enabled ? "paused" : "ready"}.`)
                }}
              >
                {rule.enabled ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
            </div>
          </div>
        ))}
      </Panel>
      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          You can inspect and test conditions. Editing requires project administrator access.
        </p>
      )}
      <output className="block text-xs text-muted-foreground">{notice}</output>
      <Sheet
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <SheetContent className="w-full overflow-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing?.id ? "Edit alert" : "Create alert"}</SheetTitle>
            <SheetDescription>Choose a metric and threshold.</SheetDescription>
          </SheetHeader>
          {editing && (
            <form
              className="space-y-5 px-5 pb-5"
              onSubmit={(event) => {
                event.preventDefault()
                if (
                  !editing.name.trim() ||
                  !Number.isFinite(editing.threshold) ||
                  editing.threshold <= 0 ||
                  (editing.metric === "affected" && editing.threshold > 100)
                ) {
                  setValidation("Enter a name and a positive threshold. Percentages cannot exceed 100.")
                  return
                }
                const rule = { ...editing, name: editing.name.trim(), id: editing.id || `rule-${crypto.randomUUID()}` }
                setRules((previous) =>
                  editing.id ? previous.map((item) => (item.id === editing.id ? rule : item)) : [...previous, rule]
                )
                setNotice(`${rule.name} saved.`)
                setEditing(null)
              }}
            >
              <label className="an-field" htmlFor="analytics-alert-name">
                Alert name
                <Input
                  id="analytics-alert-name"
                  required
                  maxLength={80}
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                  placeholder="Describe the problem to catch"
                />
              </label>
              <label className="an-field">
                Signal
                <select
                  className="an-native-select"
                  value={editing.metric}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      metric: event.target.value as Rule["metric"],
                      threshold: event.target.value === "affected" ? 10 : event.target.value === "frame" ? 16.7 : 500
                    })
                  }
                >
                  {Object.entries(metricNames).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="an-field" htmlFor="analytics-alert-threshold">
                Threshold ({editing.metric === "affected" ? "%" : "ms"})
                <Input
                  id="analytics-alert-threshold"
                  type="number"
                  step="any"
                  required
                  value={Number.isNaN(editing.threshold) ? "" : editing.threshold}
                  onChange={(event) => setEditing({ ...editing, threshold: event.target.valueAsNumber })}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Evaluated against the selected time range. Delivery not connected.
              </p>
              {validation && (
                <p role="alert" className="text-sm text-destructive">
                  {validation}
                </p>
              )}
              <Button type="submit" disabled={!canEdit}>
                Save alert
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
