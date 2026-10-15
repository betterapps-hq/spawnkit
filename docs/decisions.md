# Decisions and open questions

## Agreed product decisions

| Area | Decision |
| --- | --- |
| Users | Developers building web games locally, including with AI coding tools |
| Provider ownership | Platform-owned Cloudflare, Neon, and Vultr accounts; developers sign into our platform |
| Presets | 2D/3D × single-player/multiplayer, plus advanced composable stack selection |
| Runtime | TypeScript and Node.js initially; Bun deferred |
| Multiplayer | Colyseus is the only multiplayer runtime |
| Default engines | PixiJS for 2D (updated direction), Babylon.js for 3D |
| Engine alternatives | Phaser for 2D, Three.js for 3D; PlayCanvas outside current launch scope |
| ECS | bitECS is an optional choice; Koota is a proposed additional choice awaiting confirmation |
| UI and physics | Independent template selections; proposed compatibility matrices are recorded in the project template spec |
| Deferred game template options | React UI, React Three Fiber (R3F), and Bun; dashboard React is independent |
| Toolchain | Vite/Rolldown, Oxlint, Oxfmt, Vitest, Playwright, Drizzle |
| Excluded tools | Webpack, Prettier, Biome, Rsbuild, Cypress, Jest, Prisma |
| Hosting | Cloudflare static game hosting, D1, R2, and domains |
| Optional database | Neon PostgreSQL |
| Compute | Shared Vultr VMs hosting isolated Colyseus containers; base 1 vCPU/2 GB per game, with optional higher paid tiers |
| Publishing | CLI uploads source; platform runs isolated builds |
| Environments | One optional Sandbox (staging) and one production environment, each supporting multiple multiplayer regions |
| Releases | Promote sandbox builds to production and roll back builds |
| CI | GitHub Actions workflows can trigger builds/releases to either environment |
| Single-player | Frontend-only production is free; optional game services cost $5/month including service usage |
| Game services | Official Colyseus capabilities only at launch |
| Telemetry | Platform-managed operational telemetry, optional Sentry |
| Regional telemetry | Add EU ingestion endpoints and select telemetry endpoints from game-server deployment location; implementation pending |
| Templates | Composable generator with CLI install/add and import-based resource inference |
| Void | Investigate use for Cloudflare deployment; our coordinator owns cross-provider orchestration |

## Scope revisions

Earlier discussion included a custom shared API for auth, saves, leaderboards, achievements, economy, and other game services, plus platform-branded managed player auth and Clerk/WorkOS/Better Auth integrations. The later decision limits launch game services to those provided by Colyseus and keeps the free single-player preset frontend-only.

Consequently, a separate shared game-service platform and those additional auth integrations are deferred. Developer authentication for the hosting platform is still required and is independent of player authentication inside games.

GitHub Actions workflows are included at launch. A managed GitHub App, automatic repository connections, and a hosted browser editor are not required for launch.

## Agreed pricing

- Frontend-only single-player production is free.
- Single-player game services cost $5/month, including their service usage. Included quotas and abuse limits still need definition.
- Multiplayer costs one $5/month game fee plus provisioned runtime hours, including idle allocated time.
- Enabling the single Sandbox adds another $5/month for either player mode, plus usage. Multiple Sandbox regions do not multiply that fee.
- Production Neon/Vultr/D1 usage has 100% markup; Sandbox usage has 50% markup. The single-player service bundle is an explicit inclusion exception; custom databases are separately metered.

For multiplayer, before taxes and any separately defined charges:

```text
bill = $5 game fee
     + ($5 if Sandbox is enabled)
     + 1.5 × attributable Sandbox Neon/Vultr/D1 costs
     + 2.0 × attributable production Neon/Vultr/D1 costs
```

A single-player game with services and Sandbox has $10/month fixed fees, plus billable Sandbox/custom-database usage. Single-player Sandbox does not allocate a Colyseus game server. Builds, R2, networking, previews, discounts, provider free allowances, and operational overhead still require explicit pricing policies.

## Proposed operating defaults

- One optional Sandbox and one production environment per project; multiple regions are agreed.
- Proposed: one active Colyseus process per region allocation initially; horizontal scaling within a region remains separate scope.
- Configure region and CPU/RAM independently for production and Sandbox. Automatic sleep, cross-region matchmaking, and autoscaling are not specified.
- Separate environment secrets and persistent resources.
- Promotion reuses immutable sandbox artifacts; environment values are injected at runtime.
- Publish a versioned machine-readable manifest and expose structured CLI output.
- Track usage separately by environment, resource, tier, and time interval.

These defaults require review. In particular, allocating 1 vCPU/2 GB to each concurrent environment, temporary rollout capacity, and the charge for draining servers must be settled.

## Dashboard and tooling follow-up decisions

- The dashboard is the management product, not a reusable generated starter.
- Use TanStack Start/Form/Query/Table, shadcn, Tailwind 4, tablecn patterns, Zustand, Mantine hooks, ts-extras, ts-pattern, tiny-invariant, and Clerk developer authentication with a custom login UI.
- CLI presentation uses Clack; noninteractive JSON commands remain prompt-free.
- Add physics and UI modules to game templates; React, R3F, and Bun remain deferred for generated games.
- Initially stub platform telemetry and offer optional Sentry integration. Superseded 2026-10-14 by the implemented [telemetry design](telemetry-design.md): consent-gated OTLP/HTTP logging, tenant Cloudflare storage, authenticated dashboard queries, and a standalone scaffold package.
- Separate Starter kits from fourteen named example-game concepts, with descriptive synopses, genre artwork, and engine logos. Share card components; use two starter-kit columns and three example-game columns on desktop.
- Use Agency's shared Storybook configuration for dashboard development. CLI guided setup asks about optional Storybook for generated games, using HTML/Vite rather than adding React.
- Keep dashboard copy functional; remove slogans, duplicate headings, and the homepage storage notice. Cost summaries list paid items only.
- Use project consistently: a workspace is the same entity, not a parent of projects. Dashboard lists projects; the sidebar switcher selects one; deployments belong to it.
- Database selection reveals a selected Drizzle ORM card, matching the included linting tools.
- The developer account uses email or social sign-in; do not collect usernames.

## Open decisions

The proposed [telemetry analytics architecture](telemetry-analytics-architecture.md) uses self-hosted ClickHouse/ClickStack with regional Cloudflare ingestion and R2 archives. Production topology, region defaults for frontend-only games, retention, migration and end-to-end regional processing policy remain open. The EU endpoint/server-location requirement above is agreed; the proposal is not a deployed capability.

| ID | Question | Affected specification |
| --- | --- | --- |
| O-01 | What activates/deactivates a paid game's $5 fee, and how is a partial month handled? | Platform, dashboard |
| O-02 | How are build minutes, R2, bandwidth, and other hosting resources priced or included? | Deployment, billing |
| O-03 | How are shared VM costs allocated, including unused capacity, host overhead, and provider discounts/free allowances? | Platform |
| O-04 | Are both environments allocated a full base tier? What are the higher tiers? | Platform |
| O-05 | What are room-drain deadlines, forced shutdown rules, and rollout overlap charges? | Deployment |
| O-06 | Which regions, availability targets, backup targets, and recovery objectives apply? | Platform |
| O-07 | Confirm Koota and expand verified compatibility to multiplayer; current single-player physics/UI adapters are implemented. | Templates |
| O-08 | What are free hosting/build quotas, abuse limits, and paid usage caps? | Platform |
| O-09 | Which Colyseus auth methods ship, and who supplies email and OAuth credentials? | Services |
| O-10 | Is D1 compatible with the pinned Colyseus database package in a Node.js deployment, and through which supported adapter? | Services |
| O-11 | What quotas and abuse limits apply to the $5 single-player service bundle? | Services, templates |
| O-12 | What roles and approval gates apply to production CI releases? | Dashboard, deployment |
| O-13 | Is Void's current source accessible, appropriately licensed, and usable behind our adapter? | Deployment |
| O-14 | What retention, deletion, export, and suspension policies apply to games, data, artifacts, and logs? | All |

## Evidence and verification limits

The prior conversation's accessible assistant replies were reference placeholders. Decisions above come from the user's explicit carried-forward summary and subsequent answers.

- [Void deployment](https://void.cloud/guide/deployment) documents deployment, logs, and rollback.
- [Void self-hosted platform](https://void.cloud/guide/self-hosted-platform) documents a core installation but excludes the user dashboard, managed GitHub builds, and custom project domains from that installation.
- [Void development](https://void.cloud/guide/platform-development) describes a shared source repository; `https://github.com/voidzero-dev/void` returned 404 during investigation. Source and license remain unverified; MIT licensing of other VoidZero tools does not establish Void's license.
- [Colyseus database](https://docs.colyseus.io/database) documents official persistence introduced in 0.18 and a Drizzle release-candidate dependency.
- [Colyseus auth](https://docs.colyseus.io/auth/module) marks the auth module beta and requires external email wiring.

Verify pinned releases and source before implementing integrations. No provider resources have been provisioned.

## Configuration UI additions

Testing contains Playwright, Storybook, and Vitest; ECS is separate. Physics/interface/telemetry use cards with icon-only popovers. The dashboard exposes single-player and multiplayer, with SpawnKit-branded regions, system family, CPU, and RAM for multiplayer. Provider identity stays private. Verified Vultr plan IDs are reference configurations; this does not replace the agreed shared-container architecture or settle higher-tier pricing. Backend service cards reflect [official Colyseus services](https://docs.colyseus.io/database/services). Draft selections are not yet generated or provisioned.

Vultr catalog evidence: [regions API](https://api.vultr.com/v2/regions), [plans API](https://api.vultr.com/v2/plans), and [Colyseus compute families](https://docs.colyseus.io/cloud/compute-plans), verified 2026-10-13. Region capacity must be checked at deployment.
