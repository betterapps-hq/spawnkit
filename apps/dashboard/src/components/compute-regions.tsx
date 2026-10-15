import { hostingPlans, hostingRegions } from "@spawn/templates/catalog"
import { Plus, Trash2 } from "lucide-react"
import { OptionInfo } from "./addon-info"
import { MultiplayerConfig, type HostingSelection } from "./multiplayer-config"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
export interface ComputeLocation extends HostingSelection {
  id: string
  hours: number
}
export function ComputeRegions({
  environment,
  locations,
  onChange
}: {
  environment: "production" | "sandbox"
  locations: ComputeLocation[]
  onChange: (locations: ComputeLocation[]) => void
}) {
  const title = environment === "production" ? "Production" : "Sandbox"
  const available = hostingRegions.filter(
    (region) =>
      !locations.some((location) => location.region === region.id) &&
      hostingPlans.some((plan) => plan.regions.includes(region.id))
  )
  return (
    <section aria-label={`${title} regions`} className="mt-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold">{title} regions</h2>
          <OptionInfo
            name={`${title} regions`}
            what="Choose where your multiplayer servers run so players can connect nearby."
            why="Each region has its own server size and estimated runtime hours. More regions add compute costs."
            includes={
              environment === "sandbox"
                ? "All regions belong to one Sandbox. Its $5 monthly fee is charged once, plus regional usage."
                : "Each region runs your production build. Availability is checked at deployment."
            }
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!available.length}
          onClick={() => {
            const region = available[0]!.id
            const plan = hostingPlans.find(
              (plan) => plan.regions.includes(region) && plan.cores === 1 && plan.ramGb === 2
            )!
            onChange([
              ...locations,
              { id: crypto.randomUUID(), region, planId: plan.id, hours: environment === "production" ? 730 : 100 }
            ])
          }}
        >
          <Plus />
          Add region
        </Button>
      </div>
      <div className="mt-3 divide-y rounded-xl border bg-card">
        {locations.map((location, index) => (
          <div key={location.id} className="flex items-start gap-2 p-3 sm:p-4">
            <div className="min-w-0 flex-1">
              <MultiplayerConfig
                hosting={location}
                sandboxEnvironment={environment === "sandbox"}
                excludedRegions={locations.filter((entry) => entry.id !== location.id).map((entry) => entry.region)}
                onChange={(value) =>
                  onChange(locations.map((entry) => (entry.id === location.id ? { ...entry, ...value } : entry)))
                }
              >
                <div className="col-span-2 min-w-0 space-y-1.5">
                  <Label htmlFor={`${location.id}-hours`} className="text-xs">
                    Hours / mo
                  </Label>
                  <Input
                    id={`${location.id}-hours`}
                    aria-label="Runtime hours / month"
                    type="number"
                    min={0}
                    max={744}
                    value={location.hours}
                    onChange={(event) => {
                      const hours = event.target.valueAsNumber
                      onChange(
                        locations.map((entry) =>
                          entry.id === location.id
                            ? { ...entry, hours: Number.isFinite(hours) ? Math.min(744, Math.max(0, hours)) : 0 }
                            : entry
                        )
                      )
                    }}
                  />
                </div>
              </MultiplayerConfig>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="mt-6 shrink-0 text-muted-foreground"
              aria-label={`Remove ${title.toLowerCase()} location ${index + 1}`}
              disabled={locations.length === 1}
              onClick={() => onChange(locations.filter((entry) => entry.id !== location.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
