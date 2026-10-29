import { ArrowRight, Check, ChevronDown, GitBranch, Globe2, Layers3, Server, CloudDownload, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { multiplayerBundleFee, singlePlayerAddonFee } from "@/lib/pricing"
import { CloudComputePricing } from "./cloud-compute-pricing"
import "./cloud-scenes.css"

const faqs = [
  [
    "What’s included for free?",
    "Host a single-player web game with a production address. Starter kits, CLI tooling, managed builds and deployment workflows, version history, and platform telemetry are part of the basics. You can add Sandbox or game services for $5 each per month."
  ],
  [
    "What does the multiplayer price cover?",
    "The $10 monthly bundle includes multiplayer management, Sandbox, and game services. Machines are billed separately for allocated hours, including idle time. Add multiple regions to the estimate, each with its own machine and production and Sandbox hours. The bundle is charged once across all regions. Other metered resources, such as a custom database, are separate."
  ],
  [
    "Does Sandbox cost extra with multiplayer?",
    "No. Sandbox is included in the $10 multiplayer bundle. You pay for any machines allocated to it. For a single-player game, Sandbox is a $5 monthly add-on, plus any metered resources."
  ],
  [
    "Can I host an existing game?",
    "The current build path supports static web games with package.json, game.config.json, and a frozen pnpm-lock.yaml. It runs pnpm run build and serves dist. You can keep your own source and tools; arbitrary backend servers are not supported."
  ],
  [
    "What happens when I roll back?",
    "Production serves an earlier saved build. Rollback does not undo database changes or player data, so your code and data still need to be compatible."
  ],
  [
    "Can I connect GitHub?",
    "Connect your repository to deploy configured production and Sandbox branches. Enable previews to try changes from pull requests within that repository before merging. You can also publish through a generated GitHub Actions workflow."
  ],
  [
    "Are the paid plans available yet?",
    "Managed multiplayer and game services are coming soon. Machine rates shown here are estimates from the current SpawnKit catalog. Hosting allowances, service quotas, and the final usage schedule will be published before paid activation."
  ]
]

export function CloudPricing() {
  return (
    <section id="pricing" className="p-cloud-pricing" aria-labelledby="pricing-title">
      <div className="p-pricing-heading">
        <h2 id="pricing-title">Cloud pricing</h2>
        <p>
          The basics are free. Pay for extra environments, game services, or multiplayer machines when you need them.
        </p>
      </div>
      <div className="p-pricing-grid mk-plan-grid">
        <article className="p-price-card p-price-featured">
          <Globe2 size={25} />
          <h3>Single-player</h3>
          <div className="p-price">
            <span>$</span>0<small>Free hosting for your web game</small>
          </div>
          <ul>
            {[
              "Game templates and CLI",
              "Managed builds and CI/CD workflows",
              "Production hosting",
              "Version history and rollback",
              "Errors, logs, and game events"
            ].map((feature) => (
              <li key={feature}>
                <Check size={16} />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mk-addon-list">
            <a href="/cloud#release-heading">
              <GitBranch size={17} />
              <span>
                Sandbox<small>A separate environment to test updates</small>
              </span>
              <b>
                +${singlePlayerAddonFee}
                <small>/ month</small>
              </b>
            </a>
            <a href="/cloud#services">
              <Layers3 size={17} />
              <span>
                Managed game services<small>Cloud saves, leaderboards, and player accounts. Coming soon.</small>
              </span>
              <b>
                +${singlePlayerAddonFee}
                <small>/ month</small>
              </b>
            </a>
          </div>
          <Button asChild>
            <a href="/templates" className="p-button">
              Start with a kit
            </a>
          </Button>
        </article>
        <article className="p-price-card">
          <Server size={25} />
          <h3>Multiplayer</h3>
          <span className="mk-plan-status">Coming soon</span>
          <div className="p-price">
            <span>$</span>
            {multiplayerBundleFee}
            <small>per game / month + machine usage</small>
          </div>
          <p>Everything in single-player, with the infrastructure for a connected game.</p>
          <ul>
            {["Managed Colyseus multiplayer servers", "Rooms, matchmaking, and state synchronization"].map(
              (feature) => (
                <li key={feature}>
                  <Check size={16} />
                  {feature}
                </li>
              )
            )}
          </ul>
          <div className="mk-bundle-inclusions" aria-label="Included in the multiplayer bundle">
            <a href="/cloud#release-heading">
              <GitBranch size={24} />
              <strong>Sandbox</strong>
              <small>Test updates in a separate staging environment.</small>
              <span>
                <Check size={12} />
                Sandbox included
              </span>
            </a>
            <a href="/cloud#services">
              <span className="mk-bundle-service-icons">
                <CloudDownload size={20} />
                <Trophy size={20} />
              </span>
              <strong>Managed game services</strong>
              <small>Cloud saves, leaderboards, player accounts, and more.</small>
              <span>
                <Check size={12} />
                Services included
              </span>
            </a>
          </div>
          <a href="#compute-pricing" className="mk-secondary mk-compute-link">
            Choose your machine below <ArrowRight size={16} />
          </a>
        </article>
      </div>
      <CloudComputePricing />
      <section className="p-faq">
        <div>
          <h2>Questions about hosting</h2>
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
