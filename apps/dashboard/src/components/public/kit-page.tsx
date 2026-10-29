import { templates } from "@spawn/templates/catalog"
import { starterKits } from "@spawn/templates/kits"
import { useState } from "react"
import type { getStarterKitDetails } from "@/lib/kits"
import { PublicShell } from "./shell"
import "./kit-page.css"

export function KitPage({
  kit,
  details
}: {
  kit: (typeof starterKits)[number]
  details: Awaited<ReturnType<typeof getStarterKitDetails>>
}) {
  const [attribution, setAttribution] = useState(false)
  const engine = templates.find((item) => item.id === kit.template)!
  const related = starterKits.filter((item) => item.id !== kit.id && item.template === kit.template)
  return (
    <PublicShell active="/create">
      <article className="p-container kit-page">
        <nav aria-label="Breadcrumb">
          <a href="/create">For creators</a>
          <span> / </span>
          <a href="/templates">Starter kits</a>
          <span> / {kit.name}</span>
        </nav>
        <header className="kit-hero">
          <div>
            <p className="kit-eyebrow">{engine.dimension.toUpperCase()} · TypeScript · Free download</p>
            <h1>{kit.name}</h1>
            <p>{kit.description}</p>
            <p>
              Build locally with your preferred editor or AI coding agent. You keep the source and choose where to
              publish.
            </p>
            <div className="kit-actions">
              <a className="p-button" href={`/downloads/kits/${kit.id}.zip${attribution ? "?attribution=1" : ""}`}>
                Download {kit.name}
              </a>
              <a className="p-text-link" href={`/templates?engine=${kit.template}`}>
                Customize a {engine.name} kit
              </a>
            </div>
            <p className="kit-note">
              No account needed. Extract into a new folder to keep your existing projects safe.
            </p>
            <label>
              <input type="checkbox" checked={attribution} onChange={(event) => setAttribution(event.target.checked)} />{" "}
              Help measure whether this download leads to a first deployment.
            </label>
            <p className="kit-note">
              Optional. Adds a random download ID to the project for 90-day measurement. Copied folders share the
              original download; each hosted project counts once. No browsing history, source code or credentials are
              collected for analytics. Delete spawnkit-attribution.json before uploading to opt out. Local development
              is not tracked. <a href="/privacy">Privacy details</a>
            </p>
          </div>
          <img
            src={`/templates/${kit.template}.webp`}
            srcSet={`/templates/${kit.template}-320.webp 320w, /templates/${kit.template}-640.webp 640w, /templates/${kit.template}.webp 960w`}
            sizes="(max-width: 760px) 90vw, 420px"
            width="960"
            height="540"
            alt={`${engine.name} starter illustration`}
          />
        </header>
        <div className="kit-columns">
          <section>
            <h2>What you can build</h2>
            <p>
              {kit.useCase}. The starter includes a minimal movement and collection scene so you can verify the runtime
              before adding your own rules, artwork and levels.
            </p>
            <h2>Included in this kit</h2>
            <ul>
              <li>
                {engine.name} for {engine.dimension.toUpperCase()} rendering
              </li>
              <li>
                {kit.physics === "none"
                  ? "Plain movement without a separate physics integration"
                  : `${kit.physics === "arcade" ? "Arcade Physics" : "Rapier 3D"} integration`}
              </li>
              <li>HTML/CSS interface, keyboard input and editable game logic</li>
              <li>Vite development server, TypeScript, linting and Vitest checks</li>
            </ul>
            <p>Browser games are the supported target. Native desktop and mobile packaging are not included.</p>
          </section>
          <section>
            <h2>Run your game</h2>
            <p>
              Requires Node.js {details.setup.engines.node} and {details.setup.packageManager}.
            </p>
            <ol>
              <li>Download and extract the kit into a new folder.</li>
              <li>
                Open that folder in your editor and run <code>pnpm install</code>.
              </li>
              <li>
                Run <code>pnpm dev</code> and open the address shown in your terminal.
              </li>
            </ol>
            <p>
              To create the same files with the CLI instead, run <code>{details.command}</code>.
            </p>
            <p>
              The local HTTPS setup may ask you to trust its development certificate. See the included README for setup
              and troubleshooting.
            </p>
            <p>
              Run <code>pnpm build</code> to prepare a release. <a href="/cloud">Explore hosting</a> when you are ready
              to share it.
            </p>
          </section>
        </div>
        <section>
          <h2>Preview the generated project</h2>
          <p>These {details.files.length} files and commands come from the same configuration used by the download.</p>
          <div className="kit-columns">
            <details>
              <summary>Project files</summary>
              <ul className="kit-files">
                {details.files.map((file) => (
                  <li key={file}>
                    <code>{file}</code>
                  </li>
                ))}
              </ul>
            </details>
            <details>
              <summary>Available commands</summary>
              <dl>
                {Object.entries(details.setup.scripts).map(([name, command]) => (
                  <div key={name}>
                    <dt>
                      <code>pnpm {name}</code>
                    </dt>
                    <dd>
                      <code>{command}</code>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
          <details>
            <summary>Entry point: src/main.ts</summary>
            <pre>
              <code>{details.source}</code>
            </pre>
          </details>
        </section>
        <section>
          <h2>{related.length ? "Related kits" : "Explore other engines"}</h2>
          <div className="kit-related">
            {(related.length
              ? related
              : starterKits.filter((item) => item.physics === "none" && item.id !== kit.id)
            ).map((item) => (
              <a key={item.id} href={`/kits/${item.id}`}>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </a>
            ))}
          </div>
        </section>
      </article>
    </PublicShell>
  )
}
