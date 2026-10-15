# Project dashboard design

The project dashboard is designed in Storybook before connecting control-plane operations. Open `Project dashboard` at https://stories.local.spawnkit.cloud after `pnpm storybook`. The dashboard uses https://local.spawnkit.cloud; E2E owns separate app and Storybook origins. See [domains](domains.md).

## Information model

- **Project:** one game, its source, environment configuration, versions, and deployment history. Workspace is not a second container.
- **Version:** an immutable build identity with source commit, origin, build configuration, logs, checks, artifact digest, changed-file metadata, and retention state. Reusing a version never rebuilds it or changes its identity.
- **Deployment:** a separate attempt to activate a version in an environment. Records the previous/target version, actor, action, region outcomes, and activation/draining state.
- **Production:** the live environment, with one current version pointer and one or more multiplayer regions.
- **Sandbox:** one optional persistent staging environment per project. Its regions, runtime allocation, secrets, and data are independent from production.
- **PR preview:** an optional temporary environment belonging to an open pull request in a connected GitHub repository. It points to a version, rather than creating a second artifact model. A preview is not another Sandbox.

The current prototype retains `Release` and `releases` as internal type/property names for the version records; `deployments` records activation attempts separately. These are UI contracts, not a deployed API schema.

## Screen hierarchy

Project navigation uses distinct icons for Overview, Deployments, Domains, Logs, Users, Backend, and Settings. Page-level actions live beside the page title. Contextual version actions appear on the relevant row and version-detail page.

The overview puts the production version and address first, alongside project artwork. One integrated metric strip replaces separate statistic cards. Recent versions, compact Sandbox and PR-preview controls, domain status, and optional runtime health follow. A selected custom primary domain becomes the overview's game link; the managed address remains available.

## Template-based project creation

Project creation is a full-page flow, available from the project collection and project switcher:

1. **Starter kit:** choose PixiJS, Phaser, Babylon.js, or Three.js from the shared template catalog. Search and dimension filters are available. Example games remain concepts, not selectable templates.
2. **Configure:** enter a display name, review the derived local folder name, then choose platform and game mode. Advanced stack controls expose the existing shared toolchain, ECS, testing, physics, interface, and telemetry options. Changing engine clears incompatible physics/interface selections while retaining independent choices. React, Playwright, and Storybook remain disabled in the dashboard picker.
3. **Hosting:** repository choice precedes environments. Production is included, one Sandbox is optional, and PR previews depend on GitHub. Multiplayer has separate production/Sandbox region configurations. Single-player Sandbox never allocates multiplayer VMs. Game services and an optional database follow; a database includes Drizzle.
4. **Review:** inspect the configuration, client scaffold command, and paid-only estimate. Creation validates the template plan, saves the configuration, and returns the new project identity. Opening it shows an empty deployment history with the chosen engine and environments. It does not invent a successful first build.

The catalog, cards, option controls, compatibility resolver, and pricing component are shared with the existing composer. The name field is managed by TanStack Form. Storybook creation retains the draft in memory on failure and simulates the project result. Real repository authorization, generation jobs, durable project creation, uniqueness checks, and paid-resource consent belong to the control API. Creation requests need idempotency and recoverable status before retries can safely create billable resources.

## Domain setup

Every persistent environment retains a managed SpawnKit address. Custom hostnames are assigned to either Production or the existing Sandbox. PR previews retain generated addresses. Hostnames follow environment pointers through promotion and rollback, rather than belonging to a particular version.

The Domains page shows environment tabs, the managed address, custom-hostname status, and a page-level Connect domain action. Setup collects a hostname and environment, then displays copyable DNS records and separate ownership, routing, and HTTPS checks. The sample flow progresses from awaiting DNS to certificate issuance to connected. A hostname cannot become primary until all DNS checks and the certificate are ready. Primary means the default address used by dashboard open/share actions; the prototype does not silently add redirects to other hostnames.

The domain-detail sheet supports rechecking, selecting a primary address, certificate/DNS remediation, and disconnect review. Disconnecting removes the custom route while preserving game data, versions, and the managed address. Removing the primary hostname falls back to the managed address. Viewer access permits inspection/copying but disables mutation.

`domain-fixtures.ts` supplies fictional records under example.com. Storybook's Check status advances sample responses; it performs no DNS lookup or provider call. Actual DNS records must be returned by the provider adapter, and status must reflect provider validation rather than elapsed time or button clicks. The control API must enforce hostname ownership, cross-project uniqueness, permissions, environment validity, and certificate readiness; prevent hostname takeover; and durably reconcile disconnects. Root-domain support, wildcard support, hostname quotas, certificate issuer/error details, redirect policy, and custom-domain charging remain open. The examples exercise subdomains only.

Provider semantics were checked against [custom hostname validation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/). Ownership and certificate validation are distinct concerns; adding a hostname is not sufficient to mark it ready.

Deployments shows current Production and Sandbox versions, PR preview count, and four tabs:

| Tab | Purpose |
| --- | --- |
| Versions | Search by version, commit, branch, or title; filter status/origin; inspect or act on a particular version |
| Environments | Shared environment URLs, current state, regions, and isolation boundaries |
| PR previews | Pull-request identity, latest commit, preview version, URL, state, and lifecycle actions |
| Activity | Audited deploy/promote/rollback attempts and per-region activation or room-draining results |

A version opens a full inspection page with Overview, Build logs, Checks, Changes, and Compare. Compare shows version metadata side by side. Changes currently describes the target commit; it is not presented as a computed Git diff between arbitrary commits.

## Version operations

Creating a version resolves source, builds/tests in isolation, stores an immutable artifact, then requests activation in the chosen environment. Direct CLI source upload remains a separate input to the same build path.

Promotion reuses a retained compatible version. The normal path is PR preview to Sandbox, then Sandbox to Production. Explicit direct production deployment remains possible under the eventual permission policy. The review shows the exact current/target version, destination domain/regions, artifact readiness, and what stays in place: destination configuration, secrets, database records, accounts, and saves.

Rollback can choose any earlier retained compatible version, including one originally built in Sandbox or a PR preview. It is not limited to the last production deployment. Failed builds, expired artifacts, and incompatible schemas remain inspectable but cannot be activated. A code rollback never reverses database migrations.

For multiplayer, review whether existing rooms finish on their current version or players reconnect after activation. New rooms use the new serving version. Activation and completion of old-room draining are distinct states. Reconnection is an explicit choice because it interrupts play. The control plane must enforce rollout feasibility and concurrent-version resource accounting before this can provision real resources.

Mutation requests include the expected current destination version to detect concurrent changes. A network error cannot prove that activation did not occur; the UI asks the developer to check durable deployment status before retrying. The eventual API must also provide idempotency, server-side permissions, operation IDs, conflict refresh, and resumable progress.

## Pull-request lifecycle

1. Enable previews on a connected repository. Define eligible branches and trusted-PR rules before enabling real builds.
2. An eligible open PR creates its own environment. Each new commit creates a new version and updates that preview after checks pass.
3. A failing replacement build must not silently remove a previously working preview. Represent the currently served version separately from the latest requested commit.
4. Preview states include ready, building, failed, outdated, closing, and cleanup failed. An outdated preview cannot be mistaken for validation of the latest commit.
5. A ready retained compatible preview version can be deployed unchanged to the existing Sandbox. The preview and its data remain separate.
6. Closing/merging the PR schedules runtime shutdown and route removal. Cleanup failures must remain visible because resources may still be running. Artifact retention is independent of preview-environment retirement.

Single-player previews use static hosting without multiplayer compute. Multiplayer previews need isolated runtime allocation and data. Preview secrets must never inherit production credentials. Fork PRs require an explicit trust policy before secret access or paid execution.

Preview pricing, retention durations, quotas, idle suspension, and fork approval rules are unresolved. Storybook explicitly leaves preview pricing pending; it neither applies the Sandbox fee automatically nor invents a preview price.

## Story matrix

| Group | Coverage |
| --- | --- |
| Projects | Populated, empty, needs attention, create-project interaction |
| Create project | Starter selection, configuration, hosting, multiplayer, review, services with Sandbox, failed creation, viewer |
| Overview | Frontend-only, single-player services, frontend Sandbox, multiplayer production-only, multiplayer Sandbox, multiple regions, paused, degraded, building, first deployment, empty Sandbox, loading, failure, viewer |
| Deployments | Version list/detail, failed/building version, environment inventory, activity/draining, create version, promotion, blocked promotion, arbitrary rollback, unavailable rollback, pending, submitted, conflict, request failure, viewer |
| PR previews | Open PRs, none open, GitHub disconnected, previews disabled, static preview, newer commit pending, cleanup/cleanup failure, viewer |
| Domains | Connected, first hostname, connection form, DNS instructions, certificate issuing/failed, DNS mismatch, request failure, viewer |
| Management | Logs/live/pause/filter/disconnected/empty, player list/detail/moderation/empty/disabled/viewer, settings/repository disconnected/failed save/viewer, backend single/multiple regions/degraded/managed services/frontend-only/PostgreSQL/SQLite/failed save/viewer/restart |

## Implementation and verification boundary

The page components accept typed data and action callbacks. `fixtures.ts` and `story-fixture.tsx` are imported only by stories. The latter simulates coordinator responses in memory so promotion changes environment pointers, rollback records a new attempt, settings update, and preview closure enters cleanup. Refreshing a story resets these examples. Generated domains, artifacts, logs, and player records are illustrative.

No Storybook action provisions infrastructure, changes billing, authorizes GitHub, deploys code, or modifies real player accounts. Actual project persistence, service adapters, deployment jobs, custom-domain management, secret editing, pricing enforcement, streaming telemetry, and durable operation recovery remain control-plane work. Authentication remains on the real application routes; Storybook is isolated from them.

Shared shadcn primitives power menus, selectors, sheets, tabs, and buttons. Tabs use one baseline and connected panels. Browser acceptance covers desktop/mobile navigation, form failures and permissions, independent environment configuration, immutable-artifact promotion, rollback to an older Sandbox version, PR cleanup, logs, and player actions. The Storybook accessibility addon remains enabled; targeted axe checks cover the new pages and release sheets.

Runtime logs use 26px single-line rows in a fixed-height scrolling viewport. A fixed-row window renders the visible entries plus overscan; a 10,000-entry Storybook case exercises scrolling, filtering, keyboard navigation, and full-message inspection. Rows reserve most of the width for the message, with only time and level alongside it. Environment, region, version, and full messages or multiline traces appear in the details sheet. Mobile timestamps omit milliseconds in the row; inspection and copying preserve them. Scrolling up stops following new entries; Jump to latest resumes following. Pause freezes the received snapshot while keeping search, copy, and inspection available. Copy includes all filtered entries, not just the rendered window. A separate live-traffic story appends simulated entries and bounds its sample buffer to 2,000 entries. These stories do not connect to a real log transport.

TanStack Virtual and React LogViewer remain candidates for the production log pipeline; neither is installed. The current fixed-row window needs no additional dependency. Build output still uses custom React rendering. Server retention, cursor pagination, and a bounded transport buffer must be implemented when connecting real logs.

Design references reviewed: [Vercel deployment management](https://vercel.com/docs/deployments/managing-deployments), [promotion](https://vercel.com/docs/deployments/promoting-a-deployment), and [rollback](https://vercel.com/docs/instant-rollback). SpawnKit's game-room lifecycle, pricing, and environment rules are its own requirements.

## Application integration

The signed-in app renders the same page components with project data from the control API. Storybook fixtures and its simulated coordinator remain excluded from the app. The adapter maps saved configurations, environment pointers, retained releases, deployment attempts, and GitHub preview events into the shared model. Capabilities determine whether hosted builds and other operations are available; missing services never produce synthetic runtime health, logs, or successful deployments. The old workspace storage key and project IDs remain intact. Project/page/version/environment navigation is reflected in the URL, including back/forward and refresh. Storybook’s Dashboard stories exercise the persistence adapter; Project dashboard stories retain isolated operational scenarios.

### Connected deployment canvas

The authenticated Deployments page uses the shared draggable environment graph with compact shadcn segmented tabs for Environments, Releases, and Activity. The selected view is retained in the dashboard URL with `tab=environments|releases|activity`, including refresh and browser history. View all versions and the version-detail return action open Releases. Each PR keeps a stable environment identity while build attempts retain their own event IDs. Serving health is separate from a pending or failed replacement build. Infrastructure cards distinguish saved configuration from provisioned resources. Game-server scaling and managed database controls remain unavailable until their provider operations exist.

Environment links open the existing scoped VersionConsole; release links open VersionDetail. The Production connection opens the release chooser. Promotion reviews the retained release currently in Staging against the current Production version. Rollback reviews an older retained compatible version. Both submit the existing control API operation with the expected current Production version. A Production change invalidates the review until refreshed; loading, request failures, permissions, and competing deployments prevent premature confirmation. An accepted request directs the user to durable deployment activity rather than claiming activation succeeded.

`GET /api/platform/v1/projects/:projectId/release-changes?from=:releaseId&to=:releaseId` resolves release IDs inside the authorized project and uses its GitHub installation. Comparisons show added commits for promotion and removed commits for rollback. Commit hashes always link to GitHub, associated PRs and closing issues are inspectable in the sheet, and full author names occupy their own line. History is bounded to 100 commits; truncated or incomplete linked work is explicitly identified with a GitHub comparison link. Diverged histories are rejected rather than described as a linear release change. CLI uploads without GitHub provenance remain deployable with an explicit unavailable-history message.

Commit history uses the installation’s Contents read permission. Associated PRs and issues additionally require Pull requests and Issues read permissions already granted to the GitHub App installation. Missing linked-work permissions leave commit review available and show a partial-data notice; this endpoint does not grant permissions or change installation settings.

Preview deletion calls the existing environment cleanup operation without closing the GitHub PR or deleting retained artifacts. The UI uses the event identity required by that operation, independently of the stable graph identity.

`Project dashboard/Connected deployments` exercises these application components with isolated API-shaped fixtures: frontend deployment, configured multiplayer infrastructure, first deployment, viewer access, failed mutation, and a Production change during review. `tests/connected-deployments.spec.ts` covers these workflows on desktop and mobile. The separate `Deployment map` stories below retain the complete resource-management design exploration; their simulated scaling is not advertised as a live capability.

## Deployment canvas concept

`Project dashboard/Deployment map` links individual PR preview environments to Staging and Production. The connections are unlabeled; a release control on the Production connection opens a version panel with the live release, promotion candidate, and rollback choices. Selecting an action opens the existing review step before changing the release. Staging and Production show their infrastructure inside the environment cards by default: game client, regional server counts, database, and assets. Individual PR environments expand the same way. Environment links remain separate from internal resource dependencies. Resource buttons open the corresponding editor directly for server size, regional counts, or database sizing. Changes have review/apply/discard controls; scale-down retains serving capacity until rooms drain and blocks competing release operations. Failed preview updates preserve the serving commit. The release view tracks both staging and production placement. Shared shadcn Card, Tabs, Sheet, Button, Select, Popover, and Input components provide the controls. Scale up changes CPU and memory; Scale out changes instance counts and active regions. Add region searches the shared 33-region catalog, with keyboard selection and accent-insensitive matching. The graph shows at most three region names with a remainder count; the server summary exposes the full deployed inventory to viewers as well as editors. A twelve-PR story exercises pagination on desktop and a PR picker on mobile. Headers support dragging, positions persist through inspection, and Reset layout restores the arrangement. A subtle dot grid and animated connections support the spatial view; reduced motion disables these animations, and active rollout receives stronger emphasis. Additional stories cover frontend-only, frontend with assets, an API with Neon Postgres, multiplayer with Neon, and an eight-region deployment. Frontend-only release changes do not simulate game-room draining. All mutations remain local Storybook demonstrations.

Release rows use the shared `EnvironmentBadge` also used by the existing version console: green Production, violet Staging/Sandbox, and neutral PR previews. Version identities show commit count and SHA. The release review shows Staging and its version on the left, with Production and its current version on the right, connected by a static directional arrow. Both sides use shared environment badges and commit links. Retained versions use a neutral source label when they are not running in Staging. Commit, PR, and issue counts appear once in their tabs; the change list shows commits added on promotion or removed on rollback. PR and issue records are local fixtures and open inside the review. Commit links illustrate GitHub URLs using the fixture repository and hashes; no connected repository is claimed. Commit rows place the PR number before the linked SHA, with the full author name on its own line. Five-digit PR numbers and long author names exercise wrapping. Only the final action changes the serving version, and viewers can inspect all change details.

Previews can be deleted independently of their GitHub PR, with a confirmation naming the environment and resources. Deletion removes the graph node, connections, pagination/picker entry, and in-memory resource settings. Environment and release inspectors reuse the existing VersionConsole environment/PR preview views and VersionDetail page, retaining the selected version, commit, and environment. Hash URLs retain the Storybook story/preset and support reload, browser history, and copying. These demonstrate navigation; they do not introduce production environment routes. Mock mutations reset on reload. React Flow attribution is hidden using its supported `proOptions.hideAttribution` setting.

All resource, build and deployment changes are Storybook-only in-memory simulations. No provider API is called. Run `SPAWN_STORYBOOK_PORT=6009 pnpm exec playwright test tests/deployment-map.spec.ts` against the Storybook preview for desktop/mobile acceptance.
