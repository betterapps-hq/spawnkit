# Project template process

## Purpose

Generate editable, ordinary TypeScript projects that developers can understand locally and publish through the platform. Support presets, advanced compatible choices, source import, and incremental CLI install/add.

Do not hide proprietary deployment assumptions inside game logic. AI coding tools should receive clear commands, explicit contracts, useful examples, and structured errors.

## Presets

Implementation status: single-player PixiJS, Phaser, Babylon.js, and Three.js starter kits support optional bitECS, Vitest, Playwright, Storybook, compatible physics/UI modules, and none/platform-stub/Sentry telemetry. These are renderer choices, not completion of all four player-mode presets below. Ownership-aware add is implemented for newly generated projects. Multiplayer, import, install, and publishing remain planned. See [development](development.md) for working commands.

| Preset | Default client | Backend |
| --- | --- | --- |
| 2D single-player | PixiJS | None; frontend-only |
| 3D single-player | Babylon.js | None; frontend-only |
| 2D multiplayer | PixiJS | Node.js + Colyseus |
| 3D multiplayer | Babylon.js | Node.js + Colyseus |

Each preset produces a minimal playable example, a local run path, a hosted build script, and a project manifest. Multiplayer examples demonstrate two clients, authoritative movement/state, room join, disconnect, and reconnection.

## Advanced stack picker

Launch renderer options: PixiJS (default) and Phaser for 2D; Babylon.js (default) and Three.js for 3D. PlayCanvas is outside the current launch scope. PixiJS is the preferred composable renderer; this is not a claim that it outperforms every alternative in every game.

Proposed selection axes:

- Dimension: 2D or 3D.
- Player model: single-player or multiplayer.
- Renderer/engine: compatible choice for the selected dimension.
- UI: HTML/CSS, none, or a validated engine-specific interface. React-based game UI is deferred.
- Physics: none, compatible engine-native physics, or a verified module.
- ECS: none or bitECS; Koota is the proposed additional choice described below.
- Services: official Colyseus modules with dependency/resource disclosure.
- Storage: none or a supported environment database/object store.

The picker enforces a compatibility graph. It does not present every Cartesian combination as supported. Game-engine and separate physics selections need explicit integration rules.

## Current option matrix

Renderer defaults, bitECS, physics/UI modules, optional Storybook, and deferred React/R3F/Bun reflect the current implementation scope. Koota remains an unconfirmed proposal. Supported browser combinations are verified by generated-project smoke tests; multiplayer adapters remain unimplemented.

| Category | Choices | Default or recommendation | Status |
| --- | --- | --- | --- |
| Dimension | 2D, 3D | Chosen by developer | Agreed |
| Game mode | Single-player, multiplayer | Chosen by developer | Agreed |
| 2D renderer/engine | PixiJS, Phaser | PixiJS | Current direction |
| 3D renderer/engine | Babylon.js, Three.js | Babylon.js | Agreed |
| ECS | None, bitECS; proposed Koota | None; recommend Koota when enabling ECS if adopted | bitECS agreed; Koota/default pending confirmation |
| Physics | None or a compatible physics module | None until enabled | Implemented for single-player |
| UI | None, HTML/CSS, Pixi UI, Babylon GUI | HTML/CSS | Implemented for single-player |
| Multiplayer runtime | Colyseus | Required for multiplayer | Agreed |
| Server runtime | Node.js | Node.js | Agreed |
| Database | None, Neon PostgreSQL, Cloudflare D1 | None unless required by a selected service | Providers agreed; Colyseus/D1 adapter unverified |
| Object storage | None, Cloudflare R2 | None unless required | Agreed |
| Game services | Official Colyseus auth, saves, leaderboards, live configuration, analytics/moderation capabilities | Optional modules | Scope agreed; individual integrations require verification |
| Auth methods | Anonymous, email/password, OAuth | To be selected | Launch methods open |
| Error reporting | None, platform telemetry stub, Sentry | None until selected in the generator | Platform transport deferred; Sentry uses developer DSN |
| Component workshop | Storybook (HTML/Vite) | Off; CLI asks during guided setup | Implemented, development-only |
| Publishing | CLI, optional generated GitHub Actions workflows | CLI | Agreed |
| Environments | Sandbox/staging, production | Both supported | Agreed |

## ECS selection

- **bitECS:** agreed optional module for explicit, data-oriented entity/component management.
- **Koota:** recommended additional module with typed traits, queries, and relationships. Its core can be used without React, so the React deferral does not exclude it. Await confirmation before treating it as a launch commitment or default.
- **Miniplex:** evaluated as another TypeScript-friendly alternative; not selected for the initial option list.
- **None:** a valid choice for projects that do not need an ECS. Proposed default for minimal presets.

Select one ECS per generated project. Keep simulation data separate from renderer objects and physics handles. A template adapter connects these systems explicitly; ECS is not a substitute for physics. Benchmark representative simulations before making comparative performance claims.

References: [bitECS](https://github.com/NateTheGreatt/bitECS), [Koota](https://github.com/pmndrs/koota), [Miniplex](https://github.com/hmans/miniplex).

## Physics selection

Implemented single-player compatibility matrix:

| Renderer/engine | Physics choices | Recommendation when enabled |
| --- | --- | --- |
| PixiJS | None, Rapier 2D | Rapier 2D |
| Phaser | None, Arcade Physics, Matter.js | Arcade for simple collisions; Matter for richer rigid-body behavior |
| Babylon.js | None, Havok; Rapier 3D as a later adapter candidate | Havok through Babylon's integration |
| Three.js | None, Rapier 3D | Rapier 3D |

Default to no physics until explicitly selected. Generate one physics system, with initialization, a fixed-step simulation loop, a working collision example, transform synchronization, and cleanup. Do not silently add an external physics library to an engine-native physics template.

For multiplayer, authoritative gameplay physics belongs on the Colyseus server. Client prediction and visual physics are separate concerns. Validate headless Node.js support, browser support, WASM packaging, and lifecycle behavior for each combination before exposing it as supported.

Prioritize Rapier adapters for PixiJS/Three.js and native integrations for Phaser/Babylon. Babylon + Rapier remains a later adapter candidate, not an initially supported combination.

References: [Rapier JavaScript setup](https://rapier.rs/docs/user_guides/javascript/getting_started_js/), [Phaser physics](https://docs.phaser.io/phaser/concepts/physics), [Babylon physics](https://doc.babylonjs.com/features/featuresDeepDive/physics/usingPhysicsEngine/).

## UI selection

UI is independent of dimension, ECS, and physics. Implemented choices:

| UI option | Compatible renderers | Intended use |
| --- | --- | --- |
| None | All | Developer supplies the interface |
| HTML/CSS | All | Lightweight HUDs, menus, settings, and touch controls |
| Pixi UI (`@pixi/ui`) | PixiJS | Interactive controls inside the game canvas |
| Babylon GUI (`@babylonjs/gui`) | Babylon.js | Screen-space or world-space interfaces |

HTML/CSS is the current default. Engine-specific UI adapters are included. React game overlays and React Three Fiber are deferred; the dashboard's React implementation is a separate choice.

UI-enabled templates should demonstrate a HUD, pause/settings panel, responsive layout, keyboard focus handling, and input coordination with gameplay. Subscribe to relevant state changes rather than rerendering the entire UI every frame. Do not equate pausing a local menu with pausing an authoritative multiplayer server.

References: [Pixi UI](https://github.com/pixijs/ui), [Babylon GUI](https://www.babylonjs.com/Demos/GUI/source/).

## Starter kits and example games

The dashboard separates **Starter kits** (four composable renderer starters) from **Example games** (fourteen catalog-only concepts). Both use shared card and toolbar components: matching artwork proportions, engine overlays, dimension badges, concise descriptions, and consistent spacing. Starter kits use two columns on desktop; example games use three, with responsive single/two-column layouts. Examples support text, genre, and 2D/3D filters.

Named concepts include Clockwork Courier, Tiny Treasures, Iron Frontier, Kingdoms at War, Sector Zero, Prism Break, Orchard Trail, Starfall Squadron, Thornwatch, Alpine Rally, Embervault, Distant Orbit, Steel Circuit, and Relic Run. Generated WebP genre artwork is illustrative; badges identify the planned engine. Examples cannot generate or launch games and have no CLI generator IDs. Implement each game before enabling creation.

Starter kits contain a minimal movement/collection scene for validating the selected runtime, not a complete genre game. Optional physics adds a separate collision example. Storybook adds HTML score-display stories rather than importing the running game canvas or automatically generating stories for engine-native UI widgets.

## Telemetry modules

Expose none, platform, and Sentry in both dashboard and CLI. Platform generates initializeTelemetry, track, and captureError hooks as explicit no-ops until the platform SDK/transport exists. It must not silently transmit data. Sentry initializes only with VITE_SENTRY_DSN and suppresses PII-related collection. Runtime provisioning, telemetry retention, and billing remain control-plane work.

## Deferred options

These options are planned for later consideration and are not included in launch game templates or the launch stack picker.

| Option | Deferred scope | Launch alternative |
| --- | --- | --- |
| React | React-based game UI and overlays | HTML/CSS or validated engine-specific UI |
| React Three Fiber (R3F) | React-based Three.js rendering; requires React | Direct Three.js or Babylon.js |
| Bun | Alternative JavaScript runtime and associated template tooling | Node.js with pnpm |

The React deferral applies to generated games. The management dashboard can use React independently. Deferred choices must not be installed implicitly by another launch template module.

## Toolchain constraints

Use TypeScript, Node.js, Vite/Rolldown, Oxlint, Oxfmt, Vitest, Playwright, and Drizzle where persistence is selected. Bun is deferred. Exclude Webpack, Prettier, Biome, Rsbuild, Cypress, Jest, and Prisma from generated dependencies/configuration.

Pin compatible versions and record the package-manager lockfile. Validate Vite/Rolldown integration and Colyseus/Drizzle versions before choosing release pins. Do not install an excluded tool merely because a third-party starter includes it.

Imported projects using excluded tools must receive an explicit compatibility report and migration steps; do not silently rewrite their stack or claim full support.

## Composable module model

Proposed module metadata:

```text
id / version
supported dimensions / renderers / runtimes
requires / conflicts
dependencies / development dependencies
file additions / structured edits
scripts / environment declarations
resource intents / migrations
local verification / build verification
```

Prefer structured edits to configuration over concatenating arbitrary text. Each module has versioned fixtures and a record of generated-file ownership. Generated projects must remain editable without re-running the generator.

## New project workflow

1. Select preset or provide noninteractive options.
2. Resolve module graph and explain incompatible selections.
3. Preview target path, dependencies, files, scripts, and resource intentions.
4. Generate without overwriting existing files unexpectedly.
5. Install dependencies with the selected supported package manager.
6. Run proportionate verification and print local run/publish instructions.

Proposed project layout:

```text
game.config.json
package.json
<package-manager lockfile>
client/src/
client/public/
server/src/          # multiplayer or explicit service backend only
shared/              # messages/schema contracts when needed
db/migrations/       # persistence module only
tests/
.github/workflows/   # opt-in CI generation
```

Exact layout and manifest schema are proposals. Resource references and secret names belong in the manifest; actual secrets do not.

## Install and add

Proposed CLI distinction:

- `install`: resolve/install the modules already declared by a project, including their configuration requirements.
- `add <module>`: add a capability, resolve compatible dependencies, and apply reviewable file/configuration changes.

Show a change plan before applying modifications. Repeating the same add operation is idempotent. Preserve custom code; report conflicts instead of overwriting it. An upgrade of a previously added module uses an explicit versioned migration rather than treating the project as a fresh template.

Adding a persistence/auth module must disclose paid backend/storage requirements. Installing dependencies does not provision provider resources; deployment planning is the provisioning boundary.

## Import and inference

1. Detect project roots, package manager/lockfile, Vite output, Node entrypoint, renderer, and Colyseus imports.
2. Parse source imports/configuration with an AST or equivalent reliable parser; do not execute imported customer configuration in the control plane.
3. Identify supported imports for database/auth/storage and generate a capability report with evidence paths and confidence.
4. Flag dynamic imports, monorepo ambiguity, missing scripts, unsupported frameworks, and conflicting outputs.
5. Propose a manifest with explicit overrides; preserve existing source and lockfiles.
6. Validate via an isolated platform build after the developer publishes.

Inference describes intent, not guaranteed runtime behavior. A dependency in `package.json` alone does not prove a resource is used. Unknown capabilities must not silently trigger provisioning or billing.

## Environment configuration

Generate runtime endpoint discovery so the same frontend artifacts work in sandbox and production. Resolve backend URLs, public game settings, and release identity through an environment-specific public configuration response.

Never embed database URLs, signing secrets, or provider tokens. Build-time public values are immutable artifact inputs; explain that changing them requires a new build and prevents unchanged-artifact promotion if they differ by environment.

## GitHub Actions generation

Offer sandbox source deployment, production promotion by build ID, and optional direct production source deployment workflows. Use scoped OIDC authorization, environment concurrency, explicit target IDs, pinned action/CLI versions, and structured deployment results.

Workflow generation does not grant repository authorization automatically. Platform settings establish trust for the intended repository, workflow/ref, game, and environments. [Deployment process](deployment.md) defines release behavior.

## Verification and acceptance criteria

- All four presets install, run locally, and build with the pinned toolchain.
- Multiplayer defaults pass a two-client join/state/reconnection scenario.
- Representative supported advanced combinations build and pass their smoke tests; unsupported combinations are rejected before file generation.
- Renderer, ECS, physics, and UI selections are validated together; selecting an unsupported combination does not generate a partially configured project.
- Physics modules include a working simulation/collision example, and UI modules handle focus and gameplay input correctly.
- Deferred React, R3F, and Bun options are unavailable in launch generation and are not installed transitively by template modules.
- An add operation preserves custom code, reports conflicts, and does not duplicate scripts/dependencies on repetition.
- Import reports source evidence and produces a manifest without silently replacing the project's tools.
- Templates contain none of the excluded tools or committed secret values.
- The same frontend artifact digest can serve sandbox and production with their distinct runtime endpoints.
- Generated CI workflows invoke hosted builds and cannot deploy from unauthorized forks.

## Dashboard configuration groups

The composer groups Playwright, Storybook, and Vitest under Testing; bitECS under Code architecture; and physics, game interface, and telemetry as single-choice cards. Every optional card provides an icon-only explanatory popover. Single-player generates a CLI command. Multiplayer currently produces a configuration draft with SpawnKit-branded region arrays, system family, coupled CPU/RAM, and Colyseus service choices. One Sandbox supports multiple regions, with compute configured independently from production. Hosting and service adapters must be implemented before these draft selections become executable templates.

Platform choices are Web, Desktop (cross-platform: Windows/macOS/Linux), and Mobile (iOS/Android). Only Web is enabled. Desktop and Mobile are visible disabled options; they do not add runtime dependencies or imply native packaging support. Generated manifests and multiplayer drafts identify platform as web.

Info popovers link to each applicable library’s official website/documentation and/or GitHub repository. No fabricated external links are provided for None or the internal platform telemetry stub.

The example gallery also contains 3D platformer, first-person shooter, racing, dungeon crawler, space flight, and arena combat concepts, alongside the original endless runner. All/2D/3D filters expose the seven 3D concepts separately. Images are original static SVG concepts; no games are implemented by these cards.


## Current composer sequence

Starter kit, Platform, Game mode, Language and Linting/formatting, Testing and Code architecture, Physics, Game interface, Telemetry, GitHub repository, Database, conditional ORM, Environments, multiplayer region configuration, Services. Web is enabled; desktop/mobile are disabled. React UI, Storybook, and Playwright are visible but disabled in the dashboard; Storybook/Playwright remain working CLI options. Selecting a custom database reveals Drizzle as an included ORM card. No database means no ORM section. Previews requires a repository selection and has no committed price. The estimate lists only paid items; see decisions.md for fees and usage rules.
