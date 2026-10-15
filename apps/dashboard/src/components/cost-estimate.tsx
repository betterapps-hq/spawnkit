import { hostingPlans, hostingRegions } from "@spawn/templates/catalog"
import { objectEntries } from "ts-extras"
import { estimateProject } from "@/lib/pricing"
import type { ComputeLocation } from "./compute-regions"
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
export function CostEstimate({
  multiplayer,
  services,
  sandbox,
  customDatabase,
  previews,
  locations
}: {
  multiplayer: boolean
  services: boolean
  sandbox: boolean
  customDatabase: boolean
  previews: boolean
  locations: (ComputeLocation & { environment: "production" | "sandbox" })[]
}) {
  const estimate = estimateProject({
    multiplayer,
    services,
    sandbox,
    locations: locations.map((location) => ({
      ...location,
      rate: hostingPlans.find((plan) => plan.id === location.planId)!.rates[location.region]![location.environment]
    }))
  })
  return (
    <section aria-label="Monthly cost estimate" className="space-y-4 rounded-lg border bg-accent/30 p-4">
      <h3 className="text-sm font-semibold">Monthly estimate</h3>
      <dl className="space-y-3 text-xs">
        {objectEntries({
          [multiplayer ? "Game fee" : "Game services"]: estimate.gameFee,
          "Sandbox fee": estimate.sandboxFee
        })
          .filter(([, fee]) => fee > 0)
          .map(([label, fee]) => (
            <div key={label} className="flex justify-between">
              <dt>{label}</dt>
              <dd>{money(fee)}</dd>
            </div>
          ))}
        {estimate.locations.map(
          (location, index) =>
            location.compute > 0 && (
              <div key={index} className="flex justify-between gap-3">
                <dt>
                  <span className="block">
                    {location.environment === "production" ? "Production" : "Sandbox"} compute
                  </span>
                  <span className="text-muted-foreground">
                    {hostingRegions.find((region) => region.id === locations[index]?.region)?.city} ({location.hours}{" "}
                    hours at ${location.rate.toFixed(4)}/hr)
                  </span>
                </dt>
                <dd className="shrink-0">{money(location.compute)}</dd>
              </div>
            )
        )}
        {customDatabase && (
          <div className="flex justify-between gap-3">
            <dt>Database usage</dt>
            <dd>Usage-based</dd>
          </div>
        )}
        {previews && (
          <div className="flex justify-between gap-3">
            <dt>Preview usage</dt>
            <dd>Not yet priced</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-3 text-sm font-semibold">
          <dt>Estimated total</dt>
          <dd data-testid="estimated-total">
            {estimate.total === 0 ? (customDatabase ? "Usage-based" : "Free") : `${money(estimate.total)}/mo`}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] leading-5 text-muted-foreground">
        {!multiplayer && services ? "Single-player service usage is included. " : ""}
        {customDatabase || multiplayer || sandbox ? "Additional metered usage is not included." : ""}
      </p>
    </section>
  )
}
