import {
  colyseusServices,
  hostingPlans,
  hostingRegions,
  hostingSystems,
  type ServiceId
} from "@spawn/templates/catalog"
import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { OptionInfo } from "./addon-info"
import { SelectField } from "./select-field"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
export interface HostingSelection {
  region: string
  planId: string
}
export function MultiplayerConfig({
  hosting,
  onChange,
  sandboxEnvironment = false,
  excludedRegions = [],
  children
}: {
  hosting: HostingSelection
  onChange: (selection: HostingSelection) => void
  sandboxEnvironment?: boolean
  excludedRegions?: string[]
  children?: ReactNode
}) {
  const prefix = useId()
  const plan = hostingPlans.find((p) => p.id === hosting.planId)!
  const regionPlans = hostingPlans.filter((p) => p.regions.includes(hosting.region))
  const systemPlans = regionPlans.filter((p) => p.system === plan.system)
  const cores = [...new Set(systemPlans.map((p) => p.cores))]
  const sizes = systemPlans.filter((p) => p.cores === plan.cores)
  return (
    <div
      aria-label={sandboxEnvironment ? "Sandbox compute" : "Production compute"}
      className="grid min-w-0 grid-cols-6 gap-3"
    >
      <div className="col-span-6 min-w-0 space-y-1.5 sm:col-span-3">
        <Label htmlFor={prefix + "-region"} className="text-xs">
          Region
        </Label>
        <SelectField
          id={prefix + "-region"}
          label="Region"
          value={hosting.region}
          onChange={(region) => {
            const available = hostingPlans.filter((p) => p.regions.includes(region))
            const next =
              available.find((p) => p.id === plan.id) ??
              available.find((p) => p.system === plan.system && p.cores === 1 && p.ramGb === 2) ??
              available[0]!
            onChange({ region, planId: next.id })
          }}
          options={hostingRegions
            .filter(
              (region) =>
                !excludedRegions.includes(region.id) && hostingPlans.some((p) => p.regions.includes(region.id))
            )
            .map((region) => ({ value: region.id, label: region.city + ", " + region.country }))}
        />
      </div>
      <div className="col-span-6 min-w-0 space-y-1.5 sm:col-span-3">
        <Label htmlFor={prefix + "-system"} className="text-xs">
          Cloud system
        </Label>
        <SelectField
          id={prefix + "-system"}
          label="Cloud system"
          value={plan.system}
          onChange={(system) => {
            const candidates = regionPlans.filter((p) => p.system === system)
            const next =
              candidates.find((p) => p.cores === plan.cores && p.ramGb === plan.ramGb) ??
              candidates.find((p) => p.cores === 1 && p.ramGb === 2) ??
              candidates[0]!
            onChange({ ...hosting, planId: next.id })
          }}
          options={hostingSystems
            .filter((system) => regionPlans.some((p) => p.system === system.id))
            .map((system) => ({ value: system.id, label: system.name }))}
        />
      </div>
      <div className="col-span-2 min-w-0 space-y-1.5">
        <Label htmlFor={prefix + "-cores"} className="text-xs">
          CPU cores
        </Label>
        <SelectField
          id={prefix + "-cores"}
          label="CPU cores"
          className="gap-1 px-2 text-xs"
          value={String(plan.cores)}
          onChange={(value) => onChange({ ...hosting, planId: systemPlans.find((p) => p.cores === Number(value))!.id })}
          options={cores.map((count) => ({ value: String(count), label: count + " vCPU" }))}
        />
      </div>
      <div className="col-span-2 min-w-0 space-y-1.5">
        <Label htmlFor={prefix + "-ram"} className="text-xs">
          RAM
        </Label>
        <SelectField
          id={prefix + "-ram"}
          label="RAM"
          className="gap-1 px-2 text-xs"
          value={String(plan.ramGb)}
          onChange={(value) => onChange({ ...hosting, planId: sizes.find((p) => p.ramGb === Number(value))!.id })}
          options={sizes.map((p) => ({ value: String(p.ramGb), label: p.ramGb + " GB" }))}
        />
      </div>
      {children}
    </div>
  )
}

export function ServiceCards({
  enabled,
  selected,
  onChange
}: {
  enabled: boolean
  selected: ServiceId[]
  onChange: (value: ServiceId[]) => void
}) {
  return (
    <section aria-label="Services" className="mt-7">
      <h2 className="mb-4 text-sm font-semibold">Services</h2>
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        {enabled
          ? "Colyseus services for your configuration draft. These require backend integration and persistent storage."
          : "Select multiplayer to configure backend services. Single-player stays frontend-only."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {colyseusServices.map((service) => (
          <div
            key={service.id}
            className={cn(
              "flex items-start gap-2 rounded-lg border bg-card p-4",
              enabled && selected.includes(service.id) && "border-primary/30 bg-accent/30"
            )}
          >
            <Label className={cn("flex flex-1 items-start gap-3", !enabled && "opacity-50")}>
              <Checkbox
                className="mt-0.5"
                aria-label={service.name}
                disabled={!enabled}
                checked={enabled && selected.includes(service.id)}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...selected, service.id] : selected.filter((id) => id !== service.id))
                }
              />
              <span>
                <span className="block text-xs font-medium">{service.name}</span>
                <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                  {service.description}
                </span>
              </span>
            </Label>
            <OptionInfo
              name={service.name}
              links={[
                { label: "Documentation", href: service.source },
                { label: "GitHub", href: "https://github.com/colyseus/colyseus" }
              ]}
              what={service.description}
              why={service.why}
              includes="Selection is saved in the draft only. The Colyseus service adapter and database setup are not generated yet."
            />
          </div>
        ))}
      </div>
    </section>
  )
}
