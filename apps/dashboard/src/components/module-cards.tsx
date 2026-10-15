import { libraryLinks } from "@/lib/library-links"
import { cn } from "@/lib/utils"
import { OptionInfo } from "./addon-info"
const details = {
  platform: {
    web: ["Runs in a browser.", "Choose web to distribute your game with a link.", "A browser game built with Vite."],
    desktop: [
      "Windows, macOS, and Linux.",
      "Native desktop packaging is outside the current template scope.",
      "Not selectable. No desktop runtime or packaging is generated."
    ],
    mobile: [
      "iOS and Android apps.",
      "Native mobile packaging is outside the current template scope. Web games can still run in mobile browsers.",
      "Not selectable. No native app packaging is generated."
    ]
  },
  mode: {
    single: [
      "A game for one player.",
      "Choose it for a game played locally in the browser.",
      "Frontend-only by default, with optional paid game services and sandbox."
    ],
    multiplayer: [
      "Authoritative Colyseus server.",
      "Choose it for players who share a live game session.",
      "A configuration draft for a Node.js / Colyseus runtime on SpawnKit. Provisioning is not connected."
    ]
  },
  physics: {
    none: [
      "No physics engine.",
      "Use custom movement when you do not need rigid-body collisions.",
      "The starter movement simulation."
    ],
    rapier2d: [
      "2D rigid-body physics.",
      "Choose it for gravity, bouncing objects, and collision detection in PixiJS.",
      "A Rapier world, fixed-step updates, and a falling-ball example."
    ],
    arcade: [
      "Lightweight Phaser physics.",
      "Choose it for simple arcade movement and rectangular or circular collisions.",
      "Phaser Arcade Physics and a falling-ball collision example."
    ],
    matter: [
      "Rigid-body physics in Phaser.",
      "Choose it for richer body shapes and physical interactions.",
      "Phaser Matter physics and a falling-ball collision example."
    ],
    havok: [
      "Physics integrated with Babylon.js.",
      "Choose it for gravity and rigid-body collisions in a Babylon scene.",
      "Havok initialization, bodies, and a falling-ball example."
    ],
    rapier3d: [
      "3D rigid-body physics.",
      "Choose it for gravity and collision detection in Three.js.",
      "A Rapier world, fixed-step updates, and a falling-ball example."
    ]
  },
  ui: {
    react: [
      "Component-based game interfaces.",
      "React game overlays are deferred. Use HTML/CSS or an engine interface for now.",
      "Not selectable. React is not added to generated games."
    ],
    none: [
      "No generated game interface.",
      "Choose it if you plan to build your own HUD and controls.",
      "A canvas without the starter HUD."
    ],
    html: [
      "HTML and CSS controls outside the canvas.",
      "Choose it for a simple interface styled with familiar web tools.",
      "A HUD and a pause/resume control with Escape support."
    ],
    pixi: [
      "Controls rendered inside PixiJS.",
      "Choose it to keep game controls within your 2D canvas.",
      "Pixi UI pause/resume control with Escape support."
    ],
    babylon: [
      "Controls rendered with Babylon GUI.",
      "Choose it for an interface integrated with your Babylon scene.",
      "A Babylon GUI pause/resume control with Escape support."
    ]
  },
  telemetry: {
    none: [
      "No telemetry integration.",
      "Choose it when you do not want an instrumentation adapter.",
      "No telemetry package or data collection."
    ],
    platform: [
      "An adapter for SpawnKit telemetry.",
      "Choose it to prepare instrumentation hooks for the future platform SDK.",
      "Typed no-op hooks only. No transport or data collection."
    ],
    sentry: [
      "Browser error reporting.",
      "Choose it to diagnose errors from players using your game.",
      "A Sentry adapter that activates only after you supply your own DSN."
    ]
  }
} as const
export function ModuleCards<T extends string>({
  title,
  kind,
  value,
  options,
  onChange
}: {
  title: string
  kind: keyof typeof details
  value: T
  options: readonly { id: T; name: string; disabled?: boolean }[]
  onChange: (value: T) => void
}) {
  const descriptions = details[kind] as Record<string, readonly [string, string, string]>
  return (
    <fieldset className="mt-7">
      <legend className="mb-4 text-sm font-semibold">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const [what, why, includes] = descriptions[option.id]!
          return (
            <div
              key={option.id}
              className={cn(
                "relative flex items-start gap-2 rounded-lg border bg-card p-4 transition-colors focus-within:ring-2 focus-within:ring-ring",
                value === option.id && "border-primary/30 bg-accent/30"
              )}
            >
              <label
                className={cn(
                  "flex flex-1 items-start gap-3",
                  option.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
                )}
              >
                <input
                  type="radio"
                  disabled={option.disabled}
                  name={kind}
                  value={option.id}
                  checked={value === option.id}
                  onChange={() => onChange(option.id)}
                  aria-label={option.name}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                />
                <span>
                  <span className="block text-xs font-medium">{option.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{what}</span>
                </span>
              </label>
              <OptionInfo
                name={option.name}
                what={what}
                why={why}
                includes={includes}
                links={libraryLinks[`${kind}:${option.id}`] ?? []}
              />
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
