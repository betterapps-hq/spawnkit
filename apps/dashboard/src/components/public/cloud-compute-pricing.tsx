import { hostingPlans, hostingRegions } from "@spawn/templates/catalog"
import { Check, Cpu, Globe2, MapPin, Plus, Trash2 } from "lucide-react"
import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectItem } from "@/components/ui/select"
import { estimateProject } from "@/lib/pricing"
import { FieldSelect } from "./field-select"
import "./cloud-pricing-calculator.css"

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
const computePlans = hostingPlans.filter((plan) => plan.system === "standard" && plan.cores <= 4)
const computeRegions = hostingRegions.filter((region) => computePlans.some((plan) => plan.rates[region.id]))
type RegionEstimate = { id: string; region: string; planId: string; productionHours: string; sandboxHours: string }
const parseHours = (value: string) => (value.trim() === "" ? NaN : Number(value))
const validHours = (value: string) =>
  Number.isFinite(parseHours(value)) && parseHours(value) >= 0 && parseHours(value) <= 744
const location = (region: string) => computeRegions.find((item) => item.id === region)!
const defaultPlan = (region: string) => computePlans.find((plan) => plan.rates[region])!.id
const planLabel = (plan: (typeof computePlans)[number]) => `${plan.cores} vCPU / ${plan.ramGb} GB RAM`

export function CloudComputePricing() {
  const prefix = useId()
  const nextId = useRef(1)
  const addButton = useRef<HTMLButtonElement>(null)
  const regionHeadings = useRef(new Map<string, HTMLHeadingElement>())
  const [regions, setRegions] = useState<RegionEstimate[]>([
    {
      id: "0",
      region: "us-new-jersey",
      planId: defaultPlan("us-new-jersey"),
      productionHours: "730",
      sandboxHours: "0"
    }
  ])
  const [draftRegion, setDraftRegion] = useState("nl-amsterdam")
  const [draftPlan, setDraftPlan] = useState(defaultPlan("nl-amsterdam"))
  const unusedRegions = computeRegions.filter((item) => !regions.some((row) => row.region === item.id))
  const invalid = regions.filter((row) => !validHours(row.productionHours) || !validHours(row.sandboxHours))
  const allocations = regions.flatMap((row) => {
    const rate = computePlans.find((plan) => plan.id === row.planId)!.rates[row.region]!
    return [
      { environment: "production" as const, rate: rate.production, hours: parseHours(row.productionHours) },
      { environment: "sandbox" as const, rate: rate.sandbox, hours: parseHours(row.sandboxHours) }
    ]
  })
  const estimate = invalid.length
    ? null
    : estimateProject({ multiplayer: true, services: true, sandbox: true, locations: allocations })
  const draftRate = computePlans.find((plan) => plan.id === draftPlan)!.rates[draftRegion]!
  function update(id: string, patch: Partial<RegionEstimate>) {
    setRegions((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }
  function addRegion() {
    const id = String(nextId.current++)
    setRegions((current) => [
      ...current,
      { id, region: draftRegion, planId: draftPlan, productionHours: "730", sandboxHours: "0" }
    ])
    const next = unusedRegions.find((item) => item.id !== draftRegion)
    if (next) {
      setDraftRegion(next.id)
      setDraftPlan(defaultPlan(next.id))
    }
    requestAnimationFrame(() => regionHeadings.current.get(id)?.focus())
  }
  return (
    <section id="compute-pricing" className="mk-compute-pricing" aria-labelledby="compute-title">
      <div className="mk-compute-heading">
        <div>
          <span className="mk-eyebrow">
            <Globe2 size={16} /> MULTIPLAYER COMPUTE
          </span>
          <h3 id="compute-title">Build your global setup.</h3>
          <p>
            Add a server region wherever your players are. Each region has its own machine cost. Your $10 multiplayer
            bundle is charged once per game.
          </p>
        </div>
      </div>
      <div className="mk-calculator-layout">
        <div className="mk-region-configurations">
          <div className="mk-region-count">
            <MapPin size={16} />
            <strong>
              {regions.length} {regions.length === 1 ? "server region" : "server regions"}
            </strong>
            <span>Standard shared CPU</span>
          </div>
          <div className="mk-region-cards">
            {regions.map((row) => {
              const place = location(row.region)
              const plan = computePlans.find((item) => item.id === row.planId)!
              const rate = plan.rates[row.region]!
              const cost =
                validHours(row.productionHours) && validHours(row.sandboxHours)
                  ? rate.production * parseHours(row.productionHours) + rate.sandbox * parseHours(row.sandboxHours)
                  : null
              return (
                <article className="mk-region-card" key={row.id} aria-labelledby={prefix + "-heading-" + row.id}>
                  <header>
                    <span className="mk-region-country">{place.country}</span>
                    <div>
                      <h4
                        ref={(element) => {
                          if (element) regionHeadings.current.set(row.id, element)
                          else regionHeadings.current.delete(row.id)
                        }}
                        tabIndex={-1}
                        id={prefix + "-heading-" + row.id}
                      >
                        {place.city}
                      </h4>
                      <span>{place.continent}</span>
                    </div>
                    <strong className="mk-region-price">
                      {cost === null ? "Check hours" : money(cost)}
                      <small>/ month</small>
                    </strong>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={regions.length === 1}
                      aria-label={`Remove ${place.city} region`}
                      onClick={() => {
                        setRegions((current) => current.filter((item) => item.id !== row.id))
                        if (!unusedRegions.length) {
                          setDraftRegion(row.region)
                          setDraftPlan(row.planId)
                        }
                        addButton.current?.focus()
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </header>
                  <div className="mk-region-machine">
                    <label htmlFor={prefix + "-machine-" + row.id}>
                      <Cpu size={14} /> Machine size
                    </label>
                    <FieldSelect
                      id={prefix + "-machine-" + row.id}
                      value={row.planId}
                      onValueChange={(value) => update(row.id, { planId: value })}
                    >
                      {computePlans
                        .filter((item) => item.rates[row.region])
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {planLabel(item)}
                          </SelectItem>
                        ))}
                    </FieldSelect>
                  </div>
                  <div className="mk-region-runtime">
                    <label htmlFor={prefix + "-production-" + row.id}>
                      Production hours / month<small>${rate.production.toFixed(4)} / hour</small>
                      <Input
                        id={prefix + "-production-" + row.id}
                        type="number"
                        min="0"
                        max="744"
                        step="any"
                        value={row.productionHours}
                        aria-label="Production hours / month"
                        aria-invalid={!validHours(row.productionHours)}
                        onChange={(event) => update(row.id, { productionHours: event.target.value })}
                      />
                    </label>
                    <label htmlFor={prefix + "-sandbox-" + row.id}>
                      Sandbox hours / month<small>${rate.sandbox.toFixed(4)} / hour</small>
                      <Input
                        id={prefix + "-sandbox-" + row.id}
                        type="number"
                        min="0"
                        max="744"
                        step="any"
                        value={row.sandboxHours}
                        aria-label="Sandbox hours / month"
                        aria-invalid={!validHours(row.sandboxHours)}
                        onChange={(event) => update(row.id, { sandboxHours: event.target.value })}
                      />
                    </label>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="mk-add-region">
            <div className="mk-add-region-heading">
              <span>
                <Plus size={18} />
              </span>
              <div>
                <h4>Add another region</h4>
                <p>Put a server closer to more of your players.</p>
              </div>
            </div>
            {unusedRegions.length > 0 && (
              <div className="mk-add-region-fields">
                <label htmlFor={prefix + "-new-region"}>
                  Server location
                  <FieldSelect
                    id={prefix + "-new-region"}
                    value={draftRegion}
                    onValueChange={(value) => {
                      setDraftRegion(value)
                      setDraftPlan(defaultPlan(value))
                    }}
                  >
                    {unusedRegions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.city}, {item.country}
                      </SelectItem>
                    ))}
                  </FieldSelect>
                </label>
                <label htmlFor={prefix + "-new-plan"}>
                  Machine size
                  <FieldSelect id={prefix + "-new-plan"} value={draftPlan} onValueChange={setDraftPlan}>
                    {computePlans
                      .filter((item) => item.rates[draftRegion])
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {planLabel(item)}
                        </SelectItem>
                      ))}
                  </FieldSelect>
                </label>
              </div>
            )}
            <Button
              ref={addButton}
              variant="outline"
              disabled={!unusedRegions.length}
              onClick={addRegion}
              aria-label="Add region"
            >
              <Plus size={15} /> {unusedRegions.length ? `Add ${location(draftRegion).city}` : "All regions added"}
              {unusedRegions.length > 0 && <span>+{money(draftRate.production * 730)} / mo</span>}
            </Button>
          </div>
          <p className="mk-region-hours-note">
            A full month is estimated at 730 hours. Allocated time includes idle hours.
          </p>
        </div>
        <aside className="mk-calculator-summary" aria-label="Monthly estimate">
          <span className="mk-estimate-label">YOUR MONTHLY ESTIMATE</span>
          <div className="mk-estimate-amount" aria-live="polite">
            {estimate ? (
              <>
                <strong className="p-estimate-total">{money(estimate.total)}</strong>
                <span>/ month</span>
              </>
            ) : (
              <strong>Check runtime hours</strong>
            )}
          </div>
          <p>
            Across {regions.length} {regions.length === 1 ? "region" : "regions"}
          </p>
          <dl>
            <div className="mk-estimate-bundle">
              <dt>
                Multiplayer bundle<small>Once per game</small>
              </dt>
              <dd>$10.00</dd>
            </div>
            {regions.map((row, index) => (
              <div key={row.id}>
                <dt>
                  <MapPin size={13} />
                  {location(row.region).city}
                </dt>
                <dd>
                  {estimate
                    ? money(estimate.locations[index * 2]!.compute + estimate.locations[index * 2 + 1]!.compute)
                    : "Check hours"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mk-estimate-included">
            <span>
              <Check size={14} /> Sandbox included
            </span>
            <span>
              <Check size={14} /> Managed game services included
            </span>
            <small>Machine usage is calculated above.</small>
          </div>
          {invalid.length > 0 && (
            <p role="alert">
              Enter hours from 0 to 744 for each environment in{" "}
              {invalid.map((row) => location(row.region).city).join(", ")}.
            </p>
          )}
          <p className="mk-estimate-note">
            USD estimate. Other metered resources are separate. Rates and capacity are subject to availability. Paid
            activation is coming soon.
          </p>
        </aside>
      </div>
    </section>
  )
}
