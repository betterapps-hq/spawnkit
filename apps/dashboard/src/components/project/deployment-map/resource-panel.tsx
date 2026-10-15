/* oxlint-disable jsx-a11y/prefer-tag-over-role -- This searchable ARIA combobox composes shared shadcn controls with a popup listbox; native select/option cannot provide the search input and city/country layout. */
import { hostingRegions } from "@spawn/templates/catalog"
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Database,
  Globe2,
  HardDrive,
  Network,
  Plus,
  Server,
  Trash2,
  Zap
} from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Input } from "../../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import type { DeploymentConfiguration, ResourceSettings } from "./configuration"

function Choice({
  label,
  value,
  options,
  onChange,
  disabled
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
function AddRegion({
  active,
  onAdd,
  disabled
}: {
  active: string[]
  onAdd: (city: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  const options = hostingRegions.filter(
    (region) =>
      !active.includes(region.city) &&
      normalize(`${region.city} ${region.country} ${region.continent}`).includes(normalize(search))
  )
  useEffect(() => {
    const list = listRef.current
    const option = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!list || !option) return
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
  }, [activeIndex])
  const add = (city: string) => {
    onAdd(city)
    setOpen(false)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        setSearch("")
        setActiveIndex(0)
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Plus />
          Add region
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <Input
          aria-label="Search regions"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={options[activeIndex] ? `${listId}-${options[activeIndex].id}` : undefined}
          placeholder={`Search ${hostingRegions.length} regions…`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setActiveIndex(0)
            if (listRef.current) listRef.current.scrollTop = 0
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              setActiveIndex((index) =>
                options.length ? (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length : 0
              )
            } else if (event.key === "Enter" && options[activeIndex]) {
              event.preventDefault()
              add(options[activeIndex].city)
            }
          }}
        />
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="relative mt-2 max-h-52 overflow-y-auto"
          aria-label="Available regions"
        >
          {options.map((region, index) => (
            <Button
              key={region.id}
              id={`${listId}-${region.id}`}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={-1}
              variant="ghost"
              className="h-auto w-full justify-between px-2 py-2 text-left aria-selected:bg-accent"
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => add(region.city)}
            >
              <span>{region.city}</span>
              <span className="text-xs font-normal text-muted-foreground">{region.country}</span>
            </Button>
          ))}
          {options.length === 0 && <p className="p-3 text-sm text-muted-foreground">No matching regions</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}
export function ResourcePanel({
  environment,
  release,
  settings,
  configuration,
  canEdit,
  onSave,
  onEditingChange,
  initialResource = null
}: {
  environment: string
  release: string
  settings: ResourceSettings
  configuration: DeploymentConfiguration
  canEdit: boolean
  onSave: (settings: ResourceSettings) => void
  onEditingChange: (editing: boolean) => void
  initialResource?: string | null
}) {
  const [resource, setResource] = useState<string | null>(initialResource)
  const [mode, setMode] = useState<"up" | "out" | null>(null)
  const [draft, setDraft] = useState(settings)
  const [review, setReview] = useState(false)
  const [saved, setSaved] = useState(false)
  const total = (value: ResourceSettings) => Object.values(value.regions).reduce((sum, count) => sum + count, 0)
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)
  const valid = !configuration.servers || Object.keys(draft.regions).length > 0
  const reset = () => {
    setDraft(settings)
    setMode(null)
    setReview(false)
  }
  const rows = [
    { name: "Game client", icon: Globe2, detail: "Global edge", visible: true },
    { name: "API", icon: Zap, detail: "Edge function", visible: configuration.api },
    {
      name: "Game servers",
      icon: Server,
      detail: `${total(settings)} instances · ${Object.keys(settings.regions).length} regions`,
      visible: configuration.servers
    },
    {
      name: "Database",
      icon: Database,
      detail: configuration.database === "neon" ? `Neon Postgres · ${settings.database}` : settings.database,
      visible: Boolean(configuration.database)
    },
    { name: "Asset storage", icon: HardDrive, detail: "2.4 GB", visible: configuration.assets }
  ].filter((row) => row.visible)
  if (!resource)
    return (
      <div className="dm-resource-list">
        {saved && (
          <output className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Check size={13} />
            Changes submitted
          </output>
        )}
        {rows.map(({ name, icon: Icon, detail }) => (
          <Button
            key={name}
            variant="ghost"
            className="dm-resource-row"
            onClick={() => {
              setResource(name)
              onEditingChange(true)
              reset()
            }}
          >
            <span className="dm-resource-icon">
              <Icon />
            </span>
            <span className="text-left">
              <span className="block text-sm font-medium">{name}</span>
              <span className="block text-xs font-normal text-muted-foreground">{detail}</span>
            </span>
            <ChevronRight className="ml-auto text-muted-foreground" />
          </Button>
        ))}
      </div>
    )
  return (
    <div className="dm-resource-editor space-y-5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (mode) reset()
          else {
            reset()
            setResource(null)
            onEditingChange(false)
          }
        }}
      >
        <ArrowLeft />
        {mode ? "Game servers" : "Resources"}
      </Button>
      <h3 className="text-lg font-semibold">
        {mode === "up"
          ? "Scale up"
          : mode === "out"
            ? "Scale out"
            : resource === "Database" && configuration.database === "neon"
              ? "Neon Postgres"
              : resource}
      </h3>
      {resource === "Game servers" && !mode && (
        <>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {total(settings)} instances ·
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-muted-foreground underline decoration-dotted underline-offset-4"
                >
                  {Object.keys(settings.regions).length} regions
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-3">
                <div className="max-h-52 space-y-3 overflow-y-auto" aria-label="Deployed regions">
                  {Object.entries(settings.regions).map(([city, count]) => (
                    <div key={city} className="flex justify-between gap-4 text-sm">
                      <span>{city}</span>
                      <span className="text-muted-foreground">{count}×</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="dm-scaling-options">
            <Button variant="outline" disabled={!canEdit} onClick={() => setMode("up")}>
              <ArrowUp />
              <span>
                <strong>Scale up</strong>
                <small>CPU & memory</small>
              </span>
              <ChevronRight />
            </Button>
            <Button variant="outline" disabled={!canEdit} onClick={() => setMode("out")}>
              <Network />
              <span>
                <strong>Scale out</strong>
                <small>Instances & regions</small>
              </span>
              <ChevronRight />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">{settings.size} per instance</div>
        </>
      )}
      {resource === "Game servers" && mode === "up" && !review && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Size per instance · {total(settings)} instances</p>
          <Choice
            label="Instance size"
            value={draft.size}
            options={["1 vCPU · 2 GB", "2 vCPU · 4 GB", "4 vCPU · 8 GB", "8 vCPU · 16 GB"]}
            onChange={(size) => setDraft((d) => ({ ...d, size }))}
            disabled={!canEdit}
          />
        </div>
      )}
      {resource === "Game servers" && mode === "out" && !review && (
        <>
          <div className="dm-active-regions">
            <div className="mb-2 flex justify-between pr-11 text-xs text-muted-foreground">
              <span>Active regions</span>
              <span>Instances</span>
            </div>
            {Object.entries(draft.regions).map(([city, count]) => (
              <div className="dm-region-row" key={city}>
                <span className="flex-1 text-sm">{city}</span>
                <div className="w-20">
                  <Choice
                    label={`${city} instances`}
                    value={String(count)}
                    options={["1", "2", "3", "4", "6", "8", "12", "16"]}
                    onChange={(value) => setDraft((d) => ({ ...d, regions: { ...d.regions, [city]: Number(value) } }))}
                    disabled={!canEdit}
                  />
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${city}`}
                  disabled={!canEdit}
                  onClick={() =>
                    setDraft((d) => {
                      const regions = { ...d.regions }
                      delete regions[city]
                      return { ...d, regions }
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <AddRegion
            active={Object.keys(draft.regions)}
            disabled={!canEdit}
            onAdd={(city) => setDraft((d) => ({ ...d, regions: { ...d.regions, [city]: 1 } }))}
          />
          {!valid && <p className="text-xs text-destructive">Keep at least one region.</p>}
        </>
      )}
      {resource === "Database" && !review && (
        <>
          <p className="text-xs text-muted-foreground">
            {configuration.database === "neon" ? "Branch" : "Isolated to"} · {environment}
          </p>
          <Choice
            label="Database size"
            value={draft.database}
            options={
              configuration.database === "neon"
                ? ["0.25 CU", "0.5 CU", "1 CU", "2 CU", "4 CU"]
                : ["1 vCPU · 2 GB", "2 vCPU · 4 GB", "4 vCPU · 8 GB"]
            }
            onChange={(database) => setDraft((d) => ({ ...d, database }))}
            disabled={!canEdit}
          />
        </>
      )}
      {["Game client", "API"].includes(resource) && (
        <Card className="gap-3 p-4 text-sm">
          <span>
            Release <code className="float-right">{release}</code>
          </span>
          <span>
            {resource === "API" ? "Runtime" : "Distribution"}
            <span className="float-right text-muted-foreground">
              {resource === "API" ? "Edge function" : "Global edge"}
            </span>
          </span>
        </Card>
      )}
      {resource === "Asset storage" && (
        <Card className="gap-3 p-4 text-sm">
          <span>
            Stored <span className="float-right text-muted-foreground">2.4 GB</span>
          </span>
          <span>
            Scope <span className="float-right text-muted-foreground">{environment}</span>
          </span>
        </Card>
      )}
      {(resource === "Database" || (resource === "Game servers" && mode)) && (
        <>
          {review && (
            <Card className="gap-3 p-4">
              <div className="text-sm font-medium">Review changes</div>
              {resource === "Database" ? (
                <p className="text-xs text-muted-foreground">
                  {settings.database} → {draft.database}
                </p>
              ) : mode === "up" ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {settings.size} → {draft.size}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {total(settings)} instances · active rooms drain first.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {total(settings)} → {total(draft)} instances · {Object.keys(settings.regions).length} →{" "}
                    {Object.keys(draft.regions).length} regions
                  </p>
                  {[...new Set([...Object.keys(settings.regions), ...Object.keys(draft.regions)])]
                    .filter((city) => (settings.regions[city] ?? 0) !== (draft.regions[city] ?? 0))
                    .map((city) => (
                      <p key={city} className="text-xs text-muted-foreground">
                        {city}: {settings.regions[city] ?? 0} → {draft.regions[city] ?? 0}
                      </p>
                    ))}
                  {Object.entries(settings.regions).some(([city, count]) => (draft.regions[city] ?? 0) < count) && (
                    <p className="text-xs text-muted-foreground">
                      Removed instances drain active rooms before stopping.
                    </p>
                  )}
                </>
              )}
            </Card>
          )}
          <div className="dm-resource-actions">
            {review && (
              <Button variant="outline" onClick={() => setReview(false)}>
                Edit changes
              </Button>
            )}
            <Button
              className="w-full"
              disabled={!canEdit || !dirty || !valid}
              onClick={() => {
                if (!review) {
                  setReview(true)
                  return
                }
                onSave(draft)
                reset()
                setSaved(true)
                setResource(null)
                onEditingChange(false)
              }}
            >
              {review ? (
                <>
                  <Check />
                  Apply changes
                </>
              ) : (
                "Review changes"
              )}
            </Button>
            {dirty && (
              <Button variant="ghost" onClick={reset}>
                Discard changes
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
