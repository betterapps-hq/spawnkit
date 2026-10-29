# Management dashboard process

## Purpose

Give developers control of their games, environments, deployments, resources, and charges. The dashboard is a client of the same control API used by CLI and CI; it must not introduce a separate deployment implementation.

Agreed launch scope: platform-owned infrastructure, sandbox and production, hosted builds, promotion, rollback, operational telemetry, and billing. Proposed UI organization and permissions below require review.

## Implemented foundation

The dashboard is SpawnKit's actual product application. It uses TanStack Start, Query, Form, and Table; Zustand; shadcn/Radix; Tailwind 4; tablecn-derived table patterns; Mantine hooks; ts-extras; ts-pattern; and tiny-invariant. Clerk handles developer identity, independently of game-player auth. Storybook uses Agency's shared configuration with actual dashboard components.

The current UI has Starter kit composition, fourteen example-game concepts, shared searchable card layouts, compatible modules, animated command copying, and a custom Clerk sign-in route. The domain root requires sign-in. Dashboard lists projects; the sidebar uses a compact shadcn project dropdown with switching and creation. Workspace and project refer to the same entity: use project in the interface and draft contract. Deployments are scoped to the selected project. Existing local entries are preserved. Project/deployment persistence and mutations await the control API. Example games are placeholders only. Keep copy functional: labels, instructions, validation, and meaningful state; omit promotional slogans, decorative footer text, and developer-preview/coming-soon labels.

## Developer onboarding

The expanded project screens and interactive release workflows are implemented first as isolated [Storybook designs](project-dashboard-storybook.md). Versions are immutable build records; deployments are separate activation attempts. PR previews are temporary environments distinct from the single persistent Sandbox. Their controls currently use sample data and an in-memory coordinator, pending the actual control API.

1. Sign into the platform to see the project dashboard. No username is required.
2. Create or select a project with a stable ID and editable display name/slug. A project contains its environments and deployments, not another project layer.
3. Show local CLI setup and the four presets/import path.
4. Connect a CLI session through a short-lived browser authorization flow.
5. Enable paid usage before sandbox or compute provisioning; disclose the per-game fee and usage multipliers.

Developer identity is separate from player identity. Platform login does not automatically give a developer access to a game's player credentials or confer game administrator privileges.

## Proposed views

| View | Information and actions |
| --- | --- |
| Game overview | Environment URLs, active releases, health, recent deployments, current cost estimate |
| Environment | Tier, state, resources, secrets, configuration, domains, pause/start where supported |
| Deployment history | Source revision/digest, actor, trigger, checks, logs, artifacts, promotion/rollback eligibility |
| Deployment detail | Live step progress, errors, resource changes, activation/drain status |
| Runtime | CPU/memory, restarts, room/connection counts, logs, health, draining processes |
| Resources | Environment-owned Neon/D1/R2 references, status, usage, migrations, backup metadata |
| Billing | Applicable game/service fee, one Sandbox fee, regional usage, totals, reconciliation status |
| Settings | Membership/roles when supported, CI authorization, retention, deletion, telemetry integration |

The UI uses product language. Compute provider names, costs, and identifiers stay private; show SpawnKit plan names and city/region labels.

## Deploy, promote, and roll back

- Show a deployment's durable status even after the initiating session closes.
- Promotion selects a successful sandbox build and shows production resource/configuration changes and estimated charges.
- Rollback lists retained eligible releases and explains schema/artifact incompatibility.
- A concurrent operation cannot silently replace a newer release; report an environment conflict and refresh current state.
- Show running/draining backend versions separately rather than reporting activation as total completion.
- Direct production CI releases and manual approvals follow the same eventual role policy.

## Secrets and public configuration

- Separate sandbox and production values.
- Distinguish build secrets, runtime secrets, and public runtime configuration.
- Secret values are write-only after entry; show name, scope, version, and update metadata.
- Warn at the point of entry that frontend/public values are visible to players.
- Changing a value creates a configuration version and explicitly indicates whether a rebuild or restart is required.
- Promotion does not copy sandbox secrets into production.

## Domains

Provide a platform URL for each environment. Custom domain workflow: add hostname, display verification/DNS instructions, poll validation/TLS status, then activate routing after ownership verification. Show pending and failed states with remediation.

Domain configuration, DNS verification, certificate setup, and Sandbox configuration do not require an existing deployment. Assign domains to environments independently of their current version. Serving the game at a verified address requires a deployed version. Sandbox can be configured before the first build: $5/month plus usage for single-player, or included in the multiplayer bundle with separate compute choices and usage.

Removal detaches routing and certificates as appropriate; it does not delete game data. Apex-domain support, hostname quotas, and charging policy remain open. [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/) is the candidate service for customer hostnames.

## Runtime and service administration

- Restrict logs and operational actions to authorized developers.
- Expose game room counts and backend health without publishing Colyseus administration endpoints publicly.
- Optional Colyseus admin/monitor tools require game-scoped access through the platform; exact integration is a compatibility task.
- Clearly distinguish platform operational metrics from developer-defined game analytics.
- Restart/shutdown controls explain effects on connected players and provisioned billing.
- Stopping compute preserves databases unless the developer explicitly requests deletion.

## Billing presentation

The setup summary includes only paid selections: one $10 multiplayer bundle including Sandbox and game services, or separate $5 single-player service and Sandbox add-ons, plus nonzero compute estimates for each region. Do not repeat renderer, language, UI, physics, or other free stack choices in this tally. Show Free for single-player production; label custom database usage separately and previews as unpriced until policy exists.

Production metered rates include 100% markup, Sandbox rates 50%. Single-player services include service usage. Sandbox is one environment with multiple independently configured regions; its fee is charged once. Single-player Sandbox uses static hosting without multiplayer compute. Extra storage/build/network charges require explicit policy. Mark totals as estimates; show reconciliation adjustments and measurement lag when billing exists. Do not equate player counts to provisioned runtime hours.



Proposed: budget alerts and configurable hard caps. The suspension/grace behavior after a cap or payment failure is open and must be visible before enabling paid usage.

## Permissions and audit

Community moderation is live at `/dashboard/manage`, with an admin-only navigation item. It searches deployed games and comments, provides audited hide/restrict/restore decisions and paginated history. Platform administration uses the existing server-checked `platform_admins` membership and is separate from the proposed project roles below. See [Game publishing](game-publishing.md#community-moderation) for the API, visibility rules and audit retention behavior.

Proposed roles: owner, deployer, viewer. Final membership scope and roles are open. Validate permissions server-side for every game/environment action, including log streams. Production release, secrets, billing, CI authorization, and deletion may need distinct permissions.

Audit each mutation with actor, game, environment, operation ID, timestamp, previous/new references, and result. Never record secret values. Destructive data deletion requires an explicit separate action and a disclosed retention/recovery policy.

## Failure and empty states

- Empty game: show local creation/import instructions and first deploy action.
- Build failure: show failed command, sanitized logs, and a local reproduction hint.
- Provider outage: distinguish platform/provider unavailability from game application failure.
- Unhealthy backend: show current serving release, restart history, and recovery status.
- Unpaid account: explain which operations are blocked and the effect on running environments.
- Expired artifact: explain why rollback is unavailable.

## Acceptance criteria

- A developer can identify which release is serving in each environment.
- Promotion/rollback invokes the coordinator and produces an audited operation.
- A viewer cannot change secrets or release code through UI or direct API requests.
- Environment secrets never appear in public configuration, logs, or billing records.
- Billing shows the applicable game/service fee, one additional Sandbox fee, and correct region totals/environment multipliers.
- Live status recovers after refresh without starting duplicate operations.
- Game administration and runtime logs are inaccessible to unrelated accounts.
