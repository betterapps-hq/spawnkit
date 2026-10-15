import { ArrowRight, Check, ChevronDown, Globe2, Layers3, Server } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { estimateProject } from "@/lib/pricing"

const plans = [
  {
    title: "Free",
    icon: Globe2,
    price: "0",
    suffix: "frontend-only production",
    description: "Download a starter kit and build a frontend-only web game.",
    features: [
      "All four web starter kits",
      "Your own standalone source code",
      "Frontend-only production hosting",
      "Optional testing & quality tools"
    ],
    button: "Build a starter kit",
    href: "/templates",
    label: "Starter kits available"
  },
  {
    title: "Game services",
    icon: Layers3,
    price: "5",
    suffix: "per game / month",
    description: "Add accounts, cloud saves, and leaderboards to a single-player game.",
    features: [
      "Everything in Free",
      "Planned Colyseus player services",
      "Cloud saves & leaderboards",
      "Service usage included*"
    ],
    button: "Explore game services",
    href: "/cloud",
    label: "Coming soon"
  },
  {
    title: "Multiplayer",
    icon: Server,
    price: "5",
    suffix: "per game / month + runtime usage",
    description: "Run real-time game rooms with managed Colyseus servers.",
    features: [
      "Everything in Free",
      "Planned managed Colyseus servers",
      "Room-based state synchronization",
      "Runtime billed for allocated hours"
    ],
    button: "Explore multiplayer",
    href: "/cloud",
    label: "Coming soon"
  }
]
const faqs = [
  [
    "Is playing a game really free?",
    "Yes. The browser demos on Discover are free to play, with no account or download. Game concepts are previews of ideas, not yet published games."
  ],
  [
    "Do I own the games I make?",
    "Your starter kit is a standalone project. You can edit it, use your favorite AI coding tools, and host it yourself. Each engine and dependency retains its own open-source license."
  ],
  [
    "What does the $5 multiplayer fee include?",
    "It is the planned monthly game fee. Provisioned runtime is billed separately, including idle allocated time. Production infrastructure is priced at 2× attributable provider cost; Sandbox infrastructure at 1.5×. Final quotas and some resource charges are still being defined."
  ],
  [
    "How do staging and previews work?",
    "The optional Sandbox is a separate staging environment for $5/month plus usage. Multiple Sandbox regions do not multiply that base fee. Managed GitHub previews are in development, and preview pricing is not finalized."
  ],
  [
    "Can I build for desktop or mobile?",
    "The starter kits currently target the web. Native desktop and mobile project templates are coming soon. Browser games can support mobile play when you design touch controls and responsive gameplay."
  ],
  [
    "Can I subscribe to a paid plan now?",
    "Paid plans are a pricing preview. Checkout is not available here, and configuring a project does not start billing. Free starter-kit downloads work now."
  ]
]
export function CloudPricing() {
  const [mode, setMode] = useState("free")
  const [sandbox, setSandbox] = useState(false)
  const estimate = estimateProject({
    multiplayer: mode === "multiplayer",
    services: mode === "services",
    sandbox,
    locations: []
  })
  return (
    <section id="pricing" className="p-cloud-pricing" aria-labelledby="pricing-title">
      <section className="p-pricing-heading">
        <h2 id="pricing-title">Cloud pricing</h2>
        <p>Free starter kits and frontend hosting. Paid services when your game needs them.</p>
      </section>
      <div className="p-pricing-grid">
        {plans.map((plan, index) => (
          <article key={plan.title} className={`p-price-card ${index === 0 ? "p-price-featured" : ""}`}>
            <span className="p-price-label">{plan.label}</span>
            <plan.icon size={25} />
            <h2>{plan.title}</h2>

            <div className="p-price">
              <span>$</span>
              {plan.price}
              <small>{plan.suffix}</small>
            </div>
            <p>{plan.description}</p>
            <Button asChild>
              <a href={plan.href} className={`p-button ${index === 0 ? "" : "p-button-outline"}`}>
                {plan.button}
                <ArrowRight size={17} />
              </a>
            </Button>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="p-pricing-note">
        Paid plans are a preview; checkout is not yet available. *Service quotas, abuse limits, build minutes,
        bandwidth, storage, and preview pricing are still being finalized. No unlimited-use promise.
      </p>
      <section className="p-cost-builder">
        <div>
          <h2>Estimate your monthly fees</h2>
          <p>See your fixed monthly fees. Runtime and other metered resources are added separately.</p>
          <label className="p-field" htmlFor="game-type">
            Game type
            <NativeSelect id="game-type" value={mode} onChange={(event) => setMode(event.target.value)}>
              <NativeSelectOption value="free">Frontend-only game</NativeSelectOption>
              <NativeSelectOption value="services">Single-player + services</NativeSelectOption>
              <NativeSelectOption value="multiplayer">Multiplayer</NativeSelectOption>
            </NativeSelect>
          </label>
          <label htmlFor="pricing-sandbox" className="p-checkbox-line" aria-label="Add a Sandbox">
            <Checkbox
              id="pricing-sandbox"
              aria-label="Add a Sandbox"
              checked={sandbox}
              onCheckedChange={(checked) => setSandbox(checked === true)}
            />
            <div>
              <b>Add a Sandbox</b>
              <span>A separate staging environment · $5/month + usage</span>
            </div>
          </label>
        </div>
        <div className="p-cost-result">
          <span>YOUR FIXED MONTHLY FEES</span>
          <div className="p-estimate-total" aria-live="polite">
            ${estimate.total}
            <small>/ month</small>
          </div>
          <div>
            <span>Game fee</span>
            <b>${estimate.gameFee}</b>
          </div>
          <div>
            <span>Sandbox</span>
            <b>${estimate.sandboxFee}</b>
          </div>
          <hr />
          <p>
            {mode === "multiplayer"
              ? "Plus allocated runtime (including idle hours) and other metered usage."
              : sandbox
                ? "Plus Sandbox usage and any separately metered resources."
                : mode === "services"
                  ? "Service usage included within quotas to be defined. Custom databases are separate."
                  : "Frontend-only production hosting. Free-plan quotas are being finalized."}
          </p>
          <Badge variant="outline" className="p-tag">
            Illustrative estimate · before tax
          </Badge>
        </div>
      </section>
      <section className="p-faq">
        <div>
          <h2>Questions about pricing</h2>
        </div>
        <div>
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <ChevronDown size={18} />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </section>
  )
}
