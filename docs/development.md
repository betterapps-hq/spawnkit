# Development

## Workspace

The monorepo follows Agency's pnpm/Turborepo and shared-configuration conventions. Agency remains an independent reference repository.

SpawnKit is prelaunch and has no users. Update code, templates, tests, and documentation directly to the current contract; do not add backward-compatibility layers or user migration guidance.

| Location | Responsibility |
| --- | --- |
| `apps/dashboard` | TanStack Start product dashboard for projects, deployments, and template composition |
| `packages/cli` | Argument parsing, plans, safe file generation, bundled executable |
| `packages/templates` | Shared catalog, dependency graph, renderer examples, composable source modules |
| `packages/typescript-config` | Strict shared TypeScript settings |
| `packages/storybook-config` | Agency-derived shared Storybook configuration |
| `packages/oxlint-config` | Shared lint rules |
| `tests` | Dashboard browser acceptance tests |

React is used by the dashboard only. Generated game projects do not include React, R3F, or Bun.

## Commands

Local services share the existing Portless proxy on port 443. `pnpm dev:setup` starts it if needed; trust its local CA once on a new machine. `pnpm dev:database` applies migrations only to the checkout's local database. Use `pnpm dev:api` and `pnpm dev:telemetry` in separate terminals. The dashboard defaults to staging services; set `SPAWN_CONTROL_API_URL=https://api.local.spawnkit.cloud` to use the local API. Local Workers have isolated local storage and development credentials.

`pnpm dev:urls` prints all checkout origins. The typed `dev-domains.config.ts` defines all endpoints through `@buildkitgg/dev-domains`. Primary checkout names stay unchanged. Linked worktrees use their normalized directory name without a hash; branches do not affect domains. Configure endpoint `name` templates to override them. Complete-hostname collisions fail instead of taking over another server. Use `pnpm dev:register` followed by a staging-services deployment to add that checkout's exact origins to the staging API allowlist. Production never accepts these origins. Browser tests start separate app and Storybook instances. CI uses loopback origins; `SPAWN_E2E_LOOPBACK=1` also selects that mode explicitly.

`pnpm dev:hooks:setup` reserves a named public tunnel; `--slot`, `--target`, and `--path` select a slot, local service, and exact webhook path. Deploy staging services for the shared webhook certificate and production services for the slot routing registry. Restart the API, then run `pnpm dev:hooks`. Only the selected path is exposed; other paths return 404. The tunnel validates Portless TLS. Tunnel credentials and the local signing secret remain in ignored local files. Register the printed URL with the provider. Signed GitHub ping checks work before App authorization; processing repository events requires GitHub App credentials.

Generated games include pinned `@buildkitgg/dev-domains` configuration, with Portless supplied by the library. `pnpm dev` runs the app at a named HTTPS origin, starting or reusing the shared proxy. `pnpm exec dev-domains setup`, `pnpm exec dev-domains urls`, and `pnpm exec dev-domains doctor` provide machine setup, address discovery, and diagnostics. Generated scripts are limited to `dev`, `build`, `preview`, and `lint`, plus `storybook`, `test`, and `e2e` when their respective add-ons are selected. Either test add-on adds `setup` (local HTTPS and Chromium) and `test:setup` (Chromium only); Playwright also adds `e2e:ui`. Storybook uses `dev-domains run stories`; Playwright starts an isolated loopback server by default; SPAWN_E2E_HTTPS=1 opts into the library helper for a named HTTPS endpoint after machine setup. CI and SPAWN_E2E_LOOPBACK=1 always use loopback. Verified CLI linking saves the assigned `.games` hostname in `.spawn/project.json`, and the generated config uses `local.<assigned-hostname>`, `stories.local.<assigned-hostname>`, and `e2e.local.<assigned-hostname>` automatically. `SPAWN_GAME_DOMAIN` in `.env` remains an explicit override; only assigned `.spawnkit.games` hostnames are accepted. Until linked, the package name supplies `<project>.local.spawnkit.games`. Git worktrees prefix their folder name; independent clones can set `SPAWN_LOCAL_NAME`. Running servers retain their routes on naming conflicts. Endpoint configuration lives in `dev-domains.config.mjs`; generated projects remain standalone and require no BuildKit account.

```sh
pnpm install
pnpm dev:setup
pnpm dev:database
pnpm dev
pnpm storybook
pnpm build:storybook
pnpm cli catalog
pnpm cli init babylon ../my-game --simulation bitecs --with vitest
pnpm cli init babylon ../my-game --simulation bitecs --with vitest --dry-run --json
pnpm verify
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:templates
```

`verify` runs formatting, lint, types, unused-code checks, unit coverage, and production builds. Browser acceptance runs separately. `pnpm format` applies formatting. The dashboard uses trusted HTTPS at `https://local.spawnkit.cloud`; Buildkit reserves a private backend port and registers its complete hostname with Portless. See [domains](domains.md) for the complete contract.

Media processor acceptance tests require `ffmpeg` and `ffprobe` on PATH. CI installs FFmpeg, and the hosted build Dockerfile owns its production installation; game projects do not need this dependency. These tests encode real MP4/WebM inputs and verify the size, format, duration and fail-closed listing behavior.

Hosted dependency installation uses the public npm registry through a restricted proxy, with package lifecycle scripts and pnpmfile hooks disabled. Build scripts run with external HTTP(S) access blocked. Private registries, git URL dependencies and build-time downloads are not supported. After the creator sandbox is destroyed, a separate offline sandbox processes selected cover/trailer media, bounded listing metadata and up to eight game PNGs of at most 4 MiB each. PNG recompression preserves pixel/filter data and metadata; it never resizes or converts textures. The Worker validates and merges smaller replacements and listing derivatives before storing the release. Large game images above 512 KiB are flagged in build logs. See the [upload security audit](internal/game-upload-security-audit.md) for the provider DNS limitation and the [API authorization audit](internal/api-authorization-audit.md) for route and database boundaries.

Live community components have a separate acceptance harness: `pnpm exec playwright test --config playwright.community.config.ts`. It builds the real dashboard components and supplies controlled API responses for permission, failure, report-decision and listing-edit flows on desktop and phone. It does not send invitations or mutate hosted data.

Team invitations use Resend with `SpawnKit <team@spawnkit.cloud>`. Verify `spawnkit.cloud` in Resend before adding `RESEND_API_KEY` to the matching dashboard deployment environment file. The deployment script passes it as a Worker secret and enables the email binding. Without a key, invitation creation/resending returns an explicit unavailable error. Delivery is a scheduled outbox operation; local acceptance tests mock Resend and do not establish real deliverability.

Hosted deployment waits and follows build output by default: `spawn deploy --project <id>`. Use `--no-wait` for detached submission, or resume with `spawn logs <deployment-id> --project <id> --follow`. `--json` writes the final result to stdout and live logs to stderr. Ctrl+C stops watching without cancelling the remote deployment. The final result includes game/dashboard URLs and any omitted cover/trailer warnings. `tests/build-output.spec.ts` checks live updates, scroll controls and persistent warnings at desktop/mobile sizes.

`test:templates` takes its cases from the `@spawn/templates/scaffold` catalog: each kit (`spawn init --preset`), two flows that change a game after init (`add` and `add --replace`), and games from the engine's pairwise set of answers, run as the CLI commands the engine's `requestArgv` gives. By default it runs four of each template's pairwise games, spread through the set, as pull requests do. `--matrix pairwise` runs the whole pairwise set, as the nightly `template-matrix.yml` does, and `--matrix all` (or `--all`) runs every combination of answers, which that workflow does when started by hand with matrix `all`. `TEMPLATE_MATRIX` sets the same from the environment. Answers that make the same game run once, named by the template and a hash of its add-ons. Each case generates its game with the bundled CLI, installs it, checks its local origins, lints, runs the 90% coverage gate, Playwright and Storybook when they're selected, type-checks and builds, and uses Chromium to collect an item through keyboard input in the production build. It requires network access and installed Chromium. Generated fixtures, per-case logs, screenshots and `results.json` stay in ignored `work/templates-*` directories for inspection; `--out <folder>` puts them elsewhere.

`pnpm build` bundles the CLI into `packages/cli/dist/main.mjs` and the dashboard into `apps/dashboard/dist`. The CLI embeds the template modules, so its executable does not rely on this checkout's source files. The public package is `@spawnkit/cli`; verify the release artifact with `pnpm exec node scripts/smoke-cli-package.mjs` before publishing and repeat with `--registry` afterward.

Git hooks are opt-in with `pnpm hooks:install` after Git initialization. No remote or commits are created automatically.

## SEO validation

SEO specifications live in [specs/seo](../specs/seo/README.md). Run `pnpm seo:audit` for a read-only production HTTP/metadata report in ignored `work/`; an optional origin argument targets another environment. Run `pnpm exec playwright test --config playwright.seo.config.ts` for isolated desktop/mobile SSR acceptance with local catalog fixtures. This harness reserves loopback ports 5196 and 5197 and does not use hosted accounts. Public metadata lives in `apps/dashboard/src/lib/seo.ts`; crawl responses and host/indexing rules live in `seo-response.ts`. The sitemap uses the control API's complete paginated public inventory, independently of the discovery feed's 100-game limit. Deploy that API before the dashboard and follow the production checklist in the Batch 1 spec.

Batch 2 recipes live in `@spawn/templates/kits`. Each kit is the engine preset of the same id, so `/kits/<id>` and `/downloads/kits/<id>.zip` plan exactly what `spawn init --preset <id>` writes; do not add independent template renderers. `/browse` and eligible `/categories/<genre>` pages use the complete paginated API inventory. Apply `0022_game_details.sql` before deploying the API that reads optional game facts.

Run `pnpm seo:performance [origin] [paths...]` for cold mobile lab measurements and screenshots in `work/`. Defaults are the homepage, creator, builder and hosting pages, with 4x CPU throttling, 150 ms latency and 1.6 Mbps download. Reports contain LCP, its element/resource, load-window CLS, TTFB, resources, JavaScript transfer and failures; they are not field INP or p75 reports. Run `pnpm images:templates` after changing original engine illustrations to regenerate their 320/640-pixel WebP variants using the pinned encoder already used by the control API.

Add `--interactions` to measure the mobile menu and applicable builder/kit controls using browser Event Timing. For example: `pnpm seo:performance https://spawnkit.cloud /templates /kits/phaser --interactions`. The audit records completed actions and exposed event durations; `null` means no timing entry was available, not zero latency. An unsuccessful action or runtime error makes the command fail. Passing a `/play/<projectId>` path also records game-frame loading and its resources, without treating document load or canvas presence as verified gameplay readiness. Lab runs intercept game activity and Cloudflare RUM submissions so synthetic visits do not increment production counters or enter field reports; no credentials or user accounts are needed.

## Template catalog

`@spawn/templates/scaffold` describes SpawnKit's games for the `@buildkitgg/scaffolder` engine: the `spawnkit` target with one mode per renderer, one template per renderer, the physics, UI, simulation and telemetry slots, the tools, and a preset per starter kit. The CLI runs the engine's commands on it. The dashboard plans with the engine's pure planner on an empty tree, which is what `spawn init` writes, so previews, kit downloads and builder downloads match the command they show. `@spawn/templates/answers` turns the dashboard's choices into engine answers and renders their `spawn init` command with the engine's `requestArgv`. The renderer and either plain movement, bitECS, or Koota simulation share an input contract. Optional Vitest tests exercise movement, bounds, diagonal speed, and isolated simulation instances.

`init` needs a new or empty folder whose parent exists. Generation writes files but does not install dependencies, run package scripts or provision infrastructure. Generated projects record the chosen add-ons in `spawn.jsonc` and what the engine generated in `.spawn/lock.json`; commit both. In a terminal, `init` asks each question the flags left open, shows the plan, and asks before writing. Declining leaves the filesystem untouched. `--dry-run --json` prints the same plan.

Generated projects are standalone pnpm projects, including when placed inside this checkout. Exact direct dependency versions are embedded; developers commit the lockfile produced by their initial install. `game.config.json` is a version-1 scaffolding manifest, not yet a deployment API contract.

## Dashboard implementation

This is the platform's dashboard, not a reusable dashboard starter. TanStack Start owns routing, SSR, and server functions; TanStack Query owns catalog fetching; TanStack Form owns project-name validation; Zustand owns per-instance view/filter state; TanStack Table v8.21.3 powers the tablecn-derived table. Table v8 is pinned to match the adopted tablecn revision. Tailwind CSS 4 and official shadcn/Radix components provide styling and controls. Mantine hooks handle clipboard, hydration readiness, and mobile navigation. Utilities are ts-extras, ts-pattern, and tiny-invariant.

The signed-in application and Storybook share `ProjectStudio` and its page components. The application reads authenticated cloud projects; isolated Storybook fixtures hold complete local project configurations. Unavailable backend operations remain visibly disabled. Dashboard pages use paths: `/dashboard`, `/dashboard/new`, `/dashboard/submissions`, `/dashboard/projects/<id>`, `/dashboard/projects/<id>/<page>`, and `/dashboard/projects/<id>/releases/<version>`. Query parameters hold deployment filters. The public catalog contains approved hosted releases. Dashboard setup commands are `spawn init <template> <name>` with every slot answered (`--physics`, `--ui`, `--simulation`, `--telemetry` or `--no-<slot>`) and `--with` for tools, rendered by the engine from the project's answers.

The dashboard shell uses the official shadcn Sidebar composition with an icon-only collapsed rail at every screen size. Small screens default to the rail; expanding opens a labeled drawer over the content. Selecting a page returns to the rail. Its footer contains the project CLI shortcut and an account dropdown; Account opens Clerk's profile manager and Sign out ends the Clerk session. The header contains breadcrumbs, the sidebar toggle, and notifications. Page actions remain next to the page title. The notification component supports unread filtering, individual/all read controls, and project navigation. Populated records are isolated to Storybook until an authenticated notification feed is connected; the application displays an empty inbox.

The dashboard home uses compact status filters, combined name/engine/repository search, and shared project cards in grid or list view. A single-project account shows a larger card alongside the saved scaffold command or latest version; empty accounts start with the engine catalog. Engine shortcuts open the shared creator with that kit selected. All counts and next actions derive from project records. Storybook includes empty, single saved, single live, populated, and attention states; browser checks cover filters, layouts, template selection, command copying, and navigation on desktop and mobile.

Pre-deployment setup is available without a release. Domains saves hostname/environment intent in the existing per-account records, with an unverified state and no invented DNS records, routing, or certificates. Local removal only removes that intent. Sandbox domains prevent disabling their environment until removed. Deployments and Settings link directly to GitHub configuration; Enable Sandbox opens the Hosting step with Sandbox selected for review. These edits use the existing configuration save flow and cost estimate. GitHub authorization, DNS verification, and paid infrastructure provisioning remain separate integrations; saving configuration does not enable them or incur a charge.

The shared header uses project artwork, contextual breadcrumbs, a current-page marker, and notifications. Quick navigation searches actual projects and the shared project-page catalog; Ctrl/Cmd+K, arrow keys, Enter, and Escape work on desktop, with a compact search control on mobile. Visit game appears only when a deployed production release has an address.

`ThemeProvider` is shared by the application and Storybook. Light, Dark, and System are selectable from the account menu; Dark is the default for new visitors. An explicit System choice follows OS changes. Theme preferences persist under `spawn:theme` and synchronize across tabs. A pre-paint script prevents a light flash before hydration. Desktop sidebar preferences use `spawn:sidebar`; small screens always start with the icon rail, independently of the saved desktop preference. Both controls remain usable when preference storage is unavailable. Shell stories cover expanded, collapsed, and populated notification states; browser tests cover mobile navigation, keyboard controls, theme persistence, and notifications.

## Clerk authentication

Copy apps/dashboard/.env.example to apps/dashboard/.env. Set VITE_CLERK_PUBLISHABLE_KEY to the Clerk publishable key and CLERK_SECRET_KEY to the matching environment's secret key. Only the publishable key is browser-visible. Never prefix the secret key with VITE_. Restart development after changing keys. The local application uses https://local.spawnkit.cloud with Clerk development credentials. Production uses the separate production instance and exact https://spawnkit.cloud origin.

Clerk's TanStack Start middleware verifies sessions server-side. The public domain root displays game discovery. /dashboard redirects signed-out users to /sign-in and displays project management only for authenticated users. Successful sign-in returns to /dashboard; CLI sign-ins retain their consent return path. Missing configuration displays setup status; partial/mismatched credentials fail explicitly. The custom shadcn login form supports email/password, email codes, Google/GitHub OAuth, email verification, password reset, and supported second-factor/device-trust steps. /sso-callback handles provider callbacks; /session-tasks handles Clerk account requirements. Session activation occurs only after Clerk reports completion. Usernames are disabled in the current development instance and absent from the form. Keep that setting consistent in production.

The login illustration uses HTML/CSS geometry with solid characters, floating tiles and sparks, and shimmering water. Pointer proximity moves the characters' eyes, lifts loose edge tiles, nudges sparks, and moves the parallax layers; updates are batched into animation frames and reset on exit, cancellation, window blur, or a reduced-motion preference change. Touch input does not activate these effects. Each character has a separate loop of adjacent tiles and lifts above the taller ledge before crossing, keeping routes clear of characters and terrain. Six gems spawn along the enemy patrols and disappear with a sparkle when collected; shared CSS timing keeps collection aligned with arrival. The scene requires neither WebGL nor WebGPU and contains no raster illustration. Reduced motion shows a complete still scene, and the illustration is hidden below 1024px on the login page. `Authentication/Login scene` in Storybook includes animated, paused, and reduced-motion previews with a motion control. Browser checks cover terrain/character clearance over repeated laps, pointer reactions and reset, collection/respawn timing, reduced motion, signed-out routing, form navigation, and responsive rendering; they do not create accounts or complete a real password/OAuth round trip. Auth decision logic has unit coverage. Future project APIs must enforce ownership and authorization server-side; client state is not an authorization boundary.

Reference: [Clerk TanStack Start](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart) and [custom authentication flows](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password).

## Storybook

Run pnpm storybook at https://stories.local.spawnkit.cloud or pnpm build:storybook for apps/dashboard/storybook-static. The shared package is adapted from D:/agency/packages/storybook-config: React/Vite, deep-merged configuration, control matchers, Chromatic, accessibility, Vitest addon, and disabled Storybook telemetry. SpawnKit pins compatible Storybook packages to 10.6.2. Addon directories resolve from the shared package for pnpm/Windows compatibility. The dashboard uses a separate Vite config so TanStack Start's server plugins do not run inside Storybook; Tailwind 4 and the real app stylesheet remain active.

The `Project dashboard` group now covers full project pages, immutable version inspection/comparison, promotion, arbitrary compatible rollback, PR previews, activation/draining, logs, players, settings, backend regions, and loading/empty/failure/viewer states. Its in-memory coordinator is isolated to Storybook. See [the design and scenario matrix](project-dashboard-storybook.md). Existing stories still cover action buttons and project setup. Chromatic publishing needs a separately configured project and is not performed by local builds. The Vitest addon is included as in Agency; an automated story-test Vitest browser project remains separate from the unit test configuration. The browser suite checks real signed-out routes and the dashboard in isolated Storybook fixtures. This avoids introducing an authentication bypass for tests.

Analytics is a distinct project route from Logs. `Project dashboard/Analytics` has twenty interactive design stories with four primary sections (Overview, Players, Health, Explore) and an Alerts utility: player engagement and retention, overview, AI investigation, issue triage/detail, performance, sessions, traces, event export, releases, alerts and boundary states. Metrics derive from deterministic Storybook-only session and player-day cohorts. AI uses an injected story-only adapter, with no live model or repository writes. The deployed Analytics route retains the working tenant telemetry panel; the advanced sample views are not bundled into the application. Read the [Sentry feature study and walkthrough](analytics-experience.md). Run `pnpm exec playwright test tests/analytics.spec.ts` through the repository browser-test configuration. For an already-running isolated preview, use `SPAWN_E2E_STORIES_URL` and a dedicated Playwright configuration with `webServer: []` and a separate output directory. For a stable review while other work changes the repository, build Storybook and serve it with `pnpm exec vite preview --outDir apps/dashboard/storybook-static --host 127.0.0.1 --port 6009`.

Guided CLI setup offers Storybook among the tools (default no). Automation uses `--with storybook`; `--with vitest,storybook --simulation bitecs` combines them. Generated projects use @storybook/html-vite, HTML score-display stories, scripts, and a separate static output. They do not depend on the monorepo's React Storybook package. Only the esbuild installation script needed by Storybook is allowed in generated pnpm configuration. Storybook is development-only and does not add React/R3F/Bun to game runtime dependencies.

## Physics, interface, and telemetry

The CLI takes physics, UI, simulation and telemetry as slot flags (`--physics`, `--ui`, `--simulation`, `--telemetry`, or `--no-<slot>`) and tools through `--with`, and validates the combination before creating files. Physics choices are Rapier 2D for Pixi, Arcade/Matter for Phaser, Havok for Babylon, and Rapier 3D for Three. Each demonstrates a falling object colliding with a floor. Player movement remains its separate simulation. UI choices are HTML/CSS, Pixi UI, Babylon GUI, or none, with Escape pause/resume in enabled interfaces. Native canvas controls supplement keyboard input.

Telemetry defaults to none during scaffolding. `--telemetry platform-telemetry` installs the built `@spawn/telemetry` package as a standalone vendored dependency and generates a typed adapter. In the dashboard, open the project's Analytics → Telemetry setup, configure exact allowed game origins, and copy the returned environment settings into the game's ignored `.env`. Restart/rebuild the game after changing settings. Enable capture through `setTelemetryConsent(true)` when the application's collection policy permits it; developer configuration alone does not grant consent. Sentry generates a browser integration gated on `VITE_SENTRY_DSN`, with PII-related data collection disabled. Both public write keys and DSNs are browser configuration, never API/admin credentials. See [Telemetry operations](telemetry-operations.md) and the [SDK README](../packages/telemetry/README.md).

## Next implementation slices

1. Expand isolated UI stories and add game-template lifecycle tests as new modules ship.
2. Add safe, ownership-aware `add`/`install` plans and migrations for edited projects.
3. Add Colyseus presets and two-client integration tests after verifying supported official capabilities.
4. Define the deployment contract, source uploads, hosted builds, environment routing, and immutable promotion/rollback.
5. Connect real dashboard operations and implement pricing/metering before enabling paid resources.

See the product specifications for launch requirements; they extend beyond this initial scaffolding slice.

## Optional browser testing and selection cards

Choose Playwright in the CLI's tools question or pass `--with playwright` (optionally alongside vitest). Generated projects include Chromium configuration, a keyboard-input test, and an e2e command. After pnpm install, pnpm e2e prepares the matching Chromium browser and runs tests; cached browsers are reused. pnpm e2e:ui opens the interactive test UI. pnpm run setup prepares local HTTPS and Chromium explicitly, while pnpm test:setup prepares Chromium only. Installation itself has no postinstall side effects. In CI, provision browsers explicitly with pnpm test:setup --with-deps before running tests. SPAWN_SKIP_BROWSER_INSTALL=1 opts out for preprovisioned offline environments. A failed browser install stops before tests run. Vitest only discovers src/**/*.test.ts, keeping browser tests separate. UI-disabled templates use a canvas/focus smoke check; HUD-enabled templates assert collection.

The dashboard uses checkbox cards for testing and single-choice radio cards for physics, interface, telemetry, and ECS (No ECS, Koota, or bitECS). Renderer changes reset physics and interface to compatible defaults. Each card has an icon-only Info popover with what it is, when to choose it, and what is included. Opening Info does not change the selection.

## Configuration drafts

The single-player frontend selection produces a working CLI scaffold command. Multiplayer, game services, custom databases, GitHub, or Sandbox produce a configuration draft instead; provisioning, paid operations, and those template adapters are not connected. The draft uses projectId and has one production object and one optional Sandbox object, each with multiple independently configurable regions. Single-player Sandbox uses static hosting and shows no multiplayer compute controls.

Compact region controls select city, cloud system, CPU/RAM, and estimated runtime hours. Each environment prevents duplicate regions and retains at least one region while enabled. Defaults are 1 vCPU / 2 GB, with 730 production hours and 100 Sandbox hours. The shared reference catalog was verified 2026-10-13; availability must be checked at deployment. The private provider mapping and shared-container allocation policy remain control-plane concerns.

Services includes player auth, saves, leaderboards, live configuration, analytics, moderation, and notes. Both player modes can select these services. Service selection records a managed PostgreSQL persistence requirement and remains distinct from a custom database. A custom PostgreSQL or SQLite selection reveals an ORM section with Drizzle selected; no ORM appears for None. Database adapters are not generated yet.

GitHub comes before environments. Create/connect choices are drafts; the Connect GitHub action remains disabled until GitHub App authorization exists. Previews appears only with a repository selection. Preview lifecycle and pricing remain undefined, so no preview charge is invented. Testing groups Vitest, Storybook, and Playwright. Storybook and Playwright remain disabled in this dashboard picker but are implemented CLI options; React game UI is disabled/deferred.

## Public hosting identity and cost estimates

Provider names and identifiers must not be exposed in product copy, public catalog data, client bundles, or copied configuration. The dashboard uses SpawnKit plan IDs and city-based region IDs; provider mapping lives in docs/internal/compute-provider-map.json. Refresh the public catalog through an internal transform, never expose provider costs. Public hourly estimates already apply the production 2.0× or sandbox 1.5× multiplier.

The summary lists only paid choices: one $5 multiplayer game fee or $5 single-player service bundle, one additional $5 Sandbox fee, and compute for each region with nonzero usage. Fees are counted once regardless of region count. Frontend-only production reads Free. A custom database is Usage-based; preview usage is explicitly unpriced. Production rates already include 100% markup, Sandbox rates 50%. Single-player services include their service usage; custom databases are separate. Hours are editable from 0–744. Shared-container cost allocation, included quotas, caps, proration, and provisioning remain unimplemented.

XState and Zustand are displayed as disabled Code architecture options. Their template integrations are deferred; neither is accepted as a CLI add-on or included in generated dependencies.

## CLI module additions

Generated projects include `spawn.jsonc` and `.spawn/lock.json`, the engine's record of the chosen add-ons and of every file it generated. Commit both. `add` refuses a folder without them.

```sh
pnpm cli add vitest playwright --cwd ../my-game
pnpm cli add vitest playwright --cwd ../my-game --yes
pnpm cli add storybook --cwd ../my-game --dry-run --json
```

Without a terminal, `add` previews unless `--yes` is passed; `--dry-run` always prevents writes. Any add-on the game's renderer supports can be added. Starter files merge with your edits, JSON and other shared files keep the keys you had, and an edited generated file is a conflict that stops the whole operation. No overwrite/force option exists. Repeating an addition is a no-op. Dependencies are installed separately with `pnpm install`. `spawn status` shows which managed files you changed, and `spawn upgrade` moves a game to the CLI's catalog version.

The engine locks the project while it writes and keeps a journal under `.spawn/`. Run `spawn recover` to roll back an interrupted apply; do not delete an active lock. Close editors that write the affected files during application.

## CLI sign-in and website authorization

### Local project selection

After interactive `spawn login` inside a generated game, choose **New project**, **Existing project**, or **Skip**. Use `spawn login --directory <game-folder>` when running elsewhere. `spawn link` opens the same picker. New projects default to the local game name, allow editing, and require confirmation before creation. They start with production only; Sandbox configuration is separate. Existing projects come from the authenticated account API and are checked again before linking. Skip performs no project API request. Outside a game without `--directory`, login succeeds and explains how to link later.

Use `spawn link --project <id> [--directory <game-folder>] [--json]` for automation. JSON/noninteractive commands never prompt. The nearest parent `game.config.json` defines the game root; the association is saved in `.spawn/project.json`, separate from the scaffold manifest and generator baseline. `spawn unlink` removes only this local association. Switching requires unlinking first.

Project APIs use the signed-in website's `/api/platform/v1/projects` routes. Creation supplies a request-specific project ID; if the response is uncertain, the CLI prints that ID for dashboard reconciliation and explicit linking. A project created remotely is preserved if the local link fails. These flows require a configured platform proxy and authenticated backend.

After website sign-in, the authenticated server function validates the CLI request and sends the browser directly to the same-origin `/cli/authorize` page with the configured client ID. Clerk's `OAuthConsent` component validates and submits the decision through its SDK. Avoid an intermediate navigation through the issuer's authorization endpoint here: in development it can lose the website session and prompt for a second sign-in.

Login opens the default browser automatically and prints the same link as a fallback. If launching fails, it keeps waiting so the link can be opened manually. Use `--no-browser` to skip launching; `--json` also leaves the browser closed for automation.

From this repository, `pnpm cli login` defaults to the local dashboard at `https://local.spawnkit.cloud`; start it with `pnpm dev` first. An explicit `--site` overrides `SPAWN_SITE_URL`, which overrides this development default. The bundled CLI defaults to https://spawnkit.cloud; use --site https://staging.spawnkit.cloud for internal testing.

```sh
pnpm cli login
pnpm cli logout
```

`SPAWN_SITE_URL` supplies the website when `--site` is omitted. Production requires HTTPS. The CLI prints a browser link to the website's `/cli/login` page, which uses the custom Clerk sign-in UI. Clerk then routes consent to the website's `/cli/authorize` page. That page owns the branded layout and uses a styled OAuthConsent component to preserve scope, identity, redirect, and denial behavior. Configure these in Clerk before a live round trip:

1. Create a public OAuth application for spawn CLI; enable consent and Require PKCE (S256).
2. Register exactly `http://127.0.0.1:43819/callback` as the redirect URI. Enable the `openid` scope.
3. Set the OAuth consent component path to `/cli/authorize` for both instances; Clerk resolves it on the configured application domain.
4. Set `CLERK_OAUTH_CLIENT_ID` and `CLERK_OAUTH_ISSUER` in the dashboard server environment. The issuer is the Clerk Frontend API HTTPS origin. `/api/cli/auth` exposes only these public values; it returns 503 until configured.

The CLI checks a random state, exchanges a single-use code with PKCE, and binds the callback to loopback. It times out after five minutes, supports cancellation, and never prints tokens. `login --json` emits newline-delimited events: an authorization URL followed by a success result. Credentials are outside projects at `~/.spawn/credentials.json`; Windows encrypts them with current-user DPAPI, while other systems use a private directory and mode-0600 file. Login refuses to replace existing credentials; logout first to switch accounts or renew expired credentials.

For remote agents, `pnpm dlx @spawnkit/cli login --remote --email <verified-account-email> --project <existing-project-id>` uses a browser-approved code without a localhost callback. The control API issues a one-hour, single-project grant with 15-minute access tokens. Commands renew tokens while the grant is valid. `/cli/access` lists and revokes grants; remote CLI logout revokes before removing its credential. Project creation/deletion, settings, secrets, and unrelated projects remain outside the grant. The deployment environment supplies `AGENT_AUTH_SIGNING_KEY` as a Worker secret; never commit or print it. `SPAWN_CREDENTIAL_DIRECTORY` isolates test credentials. See [release checks and protocol boundaries](../specs/seo/cli-release-and-remote-agents.md).

This first auth slice stores a short-lived identity access token. Refresh and deployment scopes are not implemented. `logout` deletes local credentials only: it does not sign the browser out or revoke the server-side OAuth grant. No authenticated deployment APIs exist yet. Live Clerk authorization requires the configuration above and manual account sign-in; automated tests cover protocol handling with mocked issuer responses and real loopback callbacks, plus signed-out browser pages.

## Sentry configuration

`--telemetry sentry` adds an empty `VITE_SENTRY_DSN` to `.env.example`. Copy it into the project's ignored `.env` and set the public project DSN; Sentry stays off until it's set. API/auth tokens are not accepted: the browser SDK needs the public DSN; secret tokens for source-map publishing are a separate future integration.

## Generated game coverage

Selecting Vitest at creation or adding it later installs matching Vitest, V8 coverage, and Playwright browser-provider versions. Run `pnpm test`; the standalone test helper prepares matching Chromium automatically outside CI. CI must run `pnpm test:setup --with-deps` first. The `test` script enforces 90% statements, branches, functions, and lines across executable TypeScript under `src`, including renderer startup, input, UI, physics, and telemetry. Test files, Storybook stories, and type declarations are excluded. Thresholds apply to the complete source set rather than separately to each file; uncovered new source files count toward the total.

Vitest runs unit and renderer integration tests in Chromium using software WebGL. Renderer tests use controlled simulation positions to exercise collection, pause, and missing-HUD behavior. Simulation and input have separate unit tests; the template smoke suite and optional Playwright tests exercise actual keyboard-driven movement. Sentry calls are mocked so tests send no telemetry. Coverage reports are written to `coverage/` as text, HTML, LCOV, and JSON summary. See [Vitest browser mode](https://vitest.dev/guide/browser/) and [coverage configuration](https://main.vitest.dev/config/coverage).

`pnpm test:templates --list` prints the selected cases and their commands without generating anything. `--case` (or `TEMPLATE_CASE`) takes comma-separated filters that match a case's name or command, for example `kit-,pixi-add` or `--simulation koota`. `--shard 2/4` (or `TEMPLATE_SHARD`) runs every fourth of the selected cases, starting with the second. `--jobs` (or `TEMPLATE_JOBS`) sets how many cases run at once: two by default, or one on machines with fewer than four cores. A failing case doesn't stop the others; the run ends with each failure's step and output. CI runs the kits, flows and pairwise set in four shards; the nightly `template-matrix.yml` workflow runs every combination in 16. The `@spawn/templates` unit tests also run `checkCatalog(catalog, { matrix: true })`, which plans each kit and every pair of answers without writing files. In a linked Git worktree the local origin check fails, because dev-domains adds the worktree's name; pass `--out` with a folder outside the checkout.

## CLI questions and flags

`spawn catalog` lists every template, add-on and question; `--json` prints the questionnaire the dashboard's `/catalog/v1.json` also serves. Every question has a flag, and add-ons take their short names:

```sh
pnpm cli init pixi my-game --physics rapier2d --ui pixi-ui --with vitest
pnpm cli init three my-game --no-ui --with vitest,playwright --dry-run
pnpm cli init --preset phaser-arcade my-game
pnpm cli add koota --replace bitecs --dry-run
pnpm cli add koota --replace bitecs --yes
```

A slot takes `--<slot> <add-on>` or `--no-<slot>` for an optional one; tools go in `--with`, and `--preset <kit>` starts from a starter kit's answers. Each template is one renderer, and a slot offers only the add-ons that renderer supports. The plan lists the add-ons, generated files, packages and scripts. Interactive commands ask once to apply the completed plan. Noninteractive and JSON commands preview unless `--yes` is supplied. Dry runs never prompt or write; unresolved choices return `needs-decision` and exit code 1. `--yes` cannot choose a replacement, resolve ambiguity, or overwrite an edited file.

Changing an existing game's renderer is unsupported. Adding an add-on to a slot that already has one is a decision: choose it, or pass `--replace <add-on>`. Every affected file is checked before the final confirmation; application rejects changes made during review. Obsolete generated files and package entries are removed only while they still match what the engine wrote. Edited files block the entire update.

Package installation remains an explicit follow-up: `pnpm install`, then `pnpm dev`. Plans never run package installation scripts. `spawn addons` and `spawn templates` are kept as names for `spawn catalog`.

## Public game discovery and creator experience

The shared `@spawn/platform/not-found` artwork, copy, and stylesheet power the main site's root 404 boundary and the game host's missing-host/release/artifact responses. The main site uses the shared Brand and shadcn Button components; the game host mirrors their static presentation without a client runtime. The controller has four face buttons and no enclosing card. One sentence invites visitors to discover more games powered by SpawnKit, with a raised call to action matching the homepage. The page supports light and dark themes and uses ordinary links that work without JavaScript. The game-host response embeds all styles and artwork and returns 404 with `no-store`; HEAD returns the same headers without a body. `Public site/Game not found` previews the page in Storybook. `tests/not-found.spec.ts` covers dead links, unknown game slugs, nested missing routes, keyboard recovery, responsive layouts, theme handling, and JavaScript-free recovery. Game-host unit tests cover unknown/unpublished games, missing artifacts, HEAD semantics, and platform-host bypass.

The public site shares the dashboard's filled lightning mark, wordmark, SVG favicon, and light/dark/system theme tokens. React layouts use shadcn Button, Input, Checkbox, Tabs, Select, Popover, Dropdown Menu, Textarea, and Radio Group. Theme selection lives in the header. Routes are `/` (game discovery), `/create` (creator introduction), `/templates` (starter-kit builder), `/cloud` (hosting and pricing), `/games/$slug`, `/about`, `/help`, and `/community-guidelines`. Project management is at `/dashboard`; existing root links with `page`, `project`, or `view` parameters redirect there.

Discovery lists approved hosted releases only. Cards show saved genre/dimension, real views, rating averages and comment counts. Search, genre, dimension, minimum rating, minimum review count and sorting persist in URL parameters. Sorting supports views, rating, review count, recency and name. The random-play control selects from the approved feed. CLI and downloadable templates include spawnkit.config.ts, a matching spawnkit.config.schema.json editor schema, and an editable default cover. JSON authors can replace the TypeScript config with spawnkit.config.json at the project root. Both build to dist/spawnkit.config.json.

The public builder shows the choices in `@spawn/templates/catalog`, turns them into engine answers with `@spawn/templates/answers`, and plans with `@spawn/templates/scaffold`. It filters compatible physics/interface choices, validates project names, shows the `spawn init` command for the same answers, previews the planned files, and downloads them as a standalone ZIP via `fflate`. Downloads do not install packages, provision resources, or write over existing directories. The public CLI is @spawnkit/cli. Repository development uses pnpm cli.

The public header uses readable navigation links, a current-page indicator, theme selection, and a single creation action. Its mobile menu supports Escape and restores focus. The Creators page follows the [page brief](creators-page.md): engine choices come from the shared catalog, artwork changes with the selection, and the starter link preserves it. The page explains editable source and the actual download/install/run workflow with links to the published CLI setup guide. A shared laptop-and-phone composition uses HTML/CSS and an SVG Prism Break scene; native desktop/mobile templates remain coming soon. Physics uses an actual Rapier 3D world with gravity and collision bodies rendered in Three.js. It loads near the viewport, disposes resources on unmount, and shows an SVG still preview if WebGL is unavailable. Reduced motion renders the settled physics state directly. Public controls stay disabled until hydration.

Cloud follows the [hosting brief](cloud-page.md) with one Create/Test/Deploy/Monitor walkthrough, animated code/game previews, build checks, promotion/rollback, and inspectable session activity. Managed services from the shared Colyseus catalog orbit the server and connect to a service browser. Animations pause outside the viewport, in hidden tabs, or on request; reduced motion shows useful static states. These HTML/CSS illustrations need no GPU API and do not perform deployment operations. The older Three.js environment scene is retained only as a Storybook concept. Pricing is part of Cloud at `/cloud#pricing`; `/pricing` redirects there. Free single-player hosting has separate $5 Sandbox and game-service add-ons; the $10 multiplayer bundle includes both. The machine comparison uses shared standard-machine specifications and regional hourly estimates, with independent machines and production/Sandbox hours across multiple regions. The combined total charges the multiplayer bundle once. Dashboard estimates use the same fee helper. Paid services/multiplayer remain coming soon. Hosted builds and customer GitHub branch deployments and same-repository PR previews have acceptance evidence in platform operations. Managed multiplayer runtime, paid checkout, and native targets still have separate implementation work. Public copy does not activate operations; dashboard availability checks remain intact.

Game ratings and comments persist in Cloudflare D1 per account/project. The game page retains the shared star-rating and comment design, supports updating/removing feedback, and allows administrators to remove comments. Public totals and newest-first paginated comments are available without signing in. Failed saves retain input; no fake feedback is supplied. See game-publishing.md for configuration, endpoints and limits.

`tests/public-site.spec.ts` checks starter-kit downloads, compatibility, authentication and public navigation. `tests/publishing.spec.ts` and `tests/game-activity.spec.ts` check approved-only discovery, real activity, immediate game loading, game-only fullscreen, media previews and admin review. `tests/marketing.spec.ts` adds WebGL failure fallback, Storybook page interactions, and mobile Escape/focus behavior. `tests/creator-marketing.spec.ts` checks the dark default, saved and System themes, animated unit/browser checks, and device containment across breakpoints. `tests/cloud-marketing.spec.ts` covers multiple regions, bundle totals, animation playback/offscreen pause, reduced motion, deployment inspection, and orbit/service selection. Run with `pnpm exec playwright test tests/public-site.spec.ts tests/marketing.spec.ts tests/cloud-marketing.spec.ts tests/creator-marketing.spec.ts`; use a distinct `--output` directory if another suite is running. Storybook's `Public site/Marketing` group includes Creators, the creator workbench, browser devices, Cloud, the development workflow, animated build checks, promotion and rollback, monitoring, managed services, pricing, and the environment concept. Screenshots are saved under ignored `work/public-*` and `work/marketing-*` paths.

## Agent resources and creator measurement

Public agent documentation uses `apps/dashboard/src/lib/agent-docs.ts` for both HTML and Markdown. `agent-resources.ts` serves llms.txt, auth.md, the catalog, scoped OpenAPI and the downloadable skill. Update shared source and contract tests together. Generated AGENTS.md is intentionally user-owned and excluded from the module-update baseline.

Run `pnpm seo:creators` with a locally authenticated administrator to save opt-in curated-kit download/deployment cohorts. Run `pnpm seo:field [ISO-start]` with cf analytics access to save public-page field percentiles and verified-crawler HTTP responses. Both write ignored work/ reports and avoid credential output. Field counts are adaptive-weighted events, not unique visitors; small cohorts, EU exclusion and team traffic limit interpretation. Neither command is a scheduled monitor.

Migration 0023 adds optional creator attribution. Deploy the API before the dashboard's CREATOR_METRICS service binding. Reports require administrator access. Regular downloads remain untracked; DNT/GPC disable opt-in attribution. Analytics links expire after 90 days; source retention is unchanged. Removing spawnkit-attribution.json prevents attribution of subsequent uploads. See the SEO rollout report for the copied-folder counting contract and production validation.
