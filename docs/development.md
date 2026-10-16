# Development

## Workspace

The monorepo follows Agency's pnpm/Turborepo and shared-configuration conventions. Agency remains an independent reference repository.

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

Generated games depend on the published `@buildkitgg/dev-domains` package and include a typed config. Set `SPAWN_GAME_DOMAIN` in their `.env` to their assigned project hostname to use `local.<project>`, `stories.local.<project>`, and `e2e.local.<project>`. Until linked, the package name identifies the project: `<project>.local.spawnkit.cloud`, `<project>.stories.local.spawnkit.cloud`, and `<project>.e2e.local.spawnkit.cloud`. Linked Git worktrees prepend their normalized directory name. A project name longer than 63 characters is truncated to a DNS label; rename colliding projects or edit their config. Existing generated projects are not rewritten automatically.

```sh
pnpm install
pnpm dev:setup
pnpm dev:database
pnpm dev
pnpm storybook
pnpm build:storybook
pnpm cli templates
pnpm cli init ../my-game --template babylon --with bitecs,vitest
pnpm cli init ../my-game --template babylon --with bitecs,vitest --dry-run --json
pnpm verify
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:templates
```

`verify` runs formatting, lint, types, unused-code checks, unit coverage, and production builds. Browser acceptance runs separately. `pnpm format` applies formatting. The dashboard uses trusted HTTPS at `https://local.spawnkit.cloud`; Buildkit reserves a private backend port and registers its complete hostname with Portless. See [domains](domains.md) for the complete contract.

`test:templates` exercises all four renderers with and without bitECS, five supported physics/UI/telemetry combinations, and a standalone HTML Storybook project. Set `TEMPLATE_CASE` to a name substring to run a targeted case. It installs generated projects, runs lint/tests/builds, and uses Chromium to collect an item through keyboard input in each production build. It requires network access and installed Chromium. Generated fixtures, logs, and screenshots stay in ignored `work/templates-*` directories for inspection.

`pnpm build` bundles the CLI into `packages/cli/dist/main.mjs` and the dashboard into `apps/dashboard/dist`. The CLI embeds the template modules, so its executable does not rely on this checkout's source files. It is not published to a registry yet.

Git hooks are opt-in with `pnpm hooks:install` after Git initialization. No remote or commits are created automatically.

## Template composition

Each module declares dependencies, conflicts, files, package dependencies, and scripts. The resolver orders dependencies first, deduplicates modules, rejects cycles/conflicts, and rejects unequal values targeting the same file or package entry. The renderer and either plain movement, bitECS, or Koota simulation share an input contract. Optional Vitest tests exercise movement, bounds, diagonal speed, and isolated simulation instances.

Generation validates names and file paths before creating an exclusive destination. Existing directories, even empty ones, are rejected. On a partial failure, the writer attempts to remove only files/directories it created. Dependency installation is a separate explicit step; generation does not execute package scripts or provision infrastructure.

Guided setup selects one ECS (none, bitECS, or Koota), previews the resolved files, dependencies, scripts, and runtime requirements, then asks before creating the project. Declining leaves the filesystem untouched. `--dry-run` exposes the same setup details, including a `setup` object in JSON output. Both dry runs and generation reject existing destinations and missing parent directories; create the parent directory first. The exclusive writer still checks for collisions at write time.

Generated projects are standalone pnpm projects, including when placed inside this checkout. Exact direct dependency versions are embedded; developers commit the lockfile produced by their initial install. `game.config.json` is a version-1 scaffolding manifest, not yet a deployment API contract.

## Dashboard implementation

This is the platform's dashboard, not a reusable dashboard starter. TanStack Start owns routing, SSR, and server functions; TanStack Query owns catalog fetching; TanStack Form owns project-name validation; Zustand owns per-instance view/filter state; TanStack Table v8.21.3 powers the tablecn-derived table. Table v8 is pinned to match the adopted tablecn revision. Tailwind CSS 4 and official shadcn/Radix components provide styling and controls. Mantine hooks handle clipboard, hydration readiness, and mobile navigation. Utilities are ts-extras, ts-pattern, and tiny-invariant.

The signed-in application and Storybook share `ProjectStudio` and its page components, including the guided template composer, overview, versions, environments, PR previews, domains, logs, users, settings, and backend views. The old dashboard and name-only creation dialog have been removed. The composer generates CLI commands from the shared package and saves complete local project configurations. Deployment, domain, player moderation, provisioning, and billing operations remain disabled until control-API integration. No cloud successes or operational records are fabricated. The home page lists projects; the earlier workspace concept is the same project, not a parent container. A shadcn dropdown switches projects and offers creation. Project entries and template configurations are stored per user in this browser. The original storage key, IDs, names, and additional record fields are retained; legacy name-only entries acquire defaults in memory. Creation, configuration edits, and settings save only succeed after storage accepts the write. Unreadable existing data blocks writes. The app preserves Clerk account controls and sign-out. URL search parameters retain page/project/version selection across refresh and browser history; `?view=templates` opens the new creator. Deployments belong to a project. Starter kits use two columns on desktop; fourteen example-game concepts use three, with shared card/toolbar components, short synopses, generated WebP artwork, and overlaid engine logos. Example games have no generator IDs. Starter projects retain minimal input/collection scenes for validating the runtime. Dashboard commands use the intended public invocation npx spawn init with animated, accessible copy feedback; registry publication remains pending.

The dashboard shell uses the official shadcn Sidebar composition with an icon-only collapsed rail at every screen size. Small screens default to the rail; expanding opens a labeled drawer over the content. Selecting a page returns to the rail. Its footer contains the project CLI shortcut and an account dropdown; Account opens Clerk's profile manager and Sign out ends the Clerk session. The header contains breadcrumbs, the sidebar toggle, and notifications. Page actions remain next to the page title. The notification component supports unread filtering, individual/all read controls, and project navigation. Populated records are isolated to Storybook until an authenticated notification feed is connected; the application displays an empty inbox.

The dashboard home uses compact status filters, combined name/engine/repository search, and shared project cards in grid or list view. A single-project account shows a larger card alongside the saved scaffold command or latest version; empty accounts start with the engine catalog. Engine shortcuts open the shared creator with that kit selected. All counts and next actions derive from project records. Storybook includes empty, single saved, single live, populated, and attention states; browser checks cover filters, layouts, template selection, command copying, and navigation on desktop and mobile.

Pre-deployment setup is available without a release. Domains saves hostname/environment intent in the existing per-account records, with an unverified state and no invented DNS records, routing, or certificates. Local removal only removes that intent. Sandbox domains prevent disabling their environment until removed. Deployments and Settings link directly to GitHub configuration; Enable Sandbox opens the Hosting step with Sandbox selected for review. These edits use the existing configuration save flow and cost estimate. GitHub authorization, DNS verification, and paid infrastructure provisioning remain separate integrations; saving configuration does not enable them or incur a charge.

The shared header uses project artwork, contextual breadcrumbs, a current-page marker, and notifications. Quick navigation searches actual projects and the shared project-page catalog; Ctrl/Cmd+K, arrow keys, Enter, and Escape work on desktop, with a compact search control on mobile. Visit game appears only when a deployed production release has an address.

`ThemeProvider` is shared by the application and Storybook. Light, Dark, and System are selectable from the account menu; System is the default and follows OS changes. Theme preferences persist under `spawn:theme` and synchronize across tabs. A pre-paint script prevents a light flash before hydration. Desktop sidebar preferences use `spawn:sidebar`; small screens always start with the icon rail, independently of the saved desktop preference. Both controls remain usable when preference storage is unavailable. Shell stories cover expanded, collapsed, and populated notification states; browser tests cover mobile navigation, keyboard controls, theme persistence, and notifications.

## Clerk authentication

Copy apps/dashboard/.env.example to apps/dashboard/.env. Set VITE_CLERK_PUBLISHABLE_KEY to the Clerk publishable key and CLERK_SECRET_KEY to the matching environment's secret key. Only the publishable key is browser-visible. Never prefix the secret key with VITE_. Restart development after changing keys. The local application uses https://local.spawnkit.cloud with Clerk development credentials. Production uses the separate production instance and exact https://spawnkit.cloud origin.

Clerk's TanStack Start middleware verifies sessions server-side. The public domain root displays game discovery. /dashboard redirects signed-out users to /sign-in and displays project management only for authenticated users. Successful sign-in returns to /dashboard; CLI sign-ins retain their consent return path. Missing configuration displays setup status; partial/mismatched credentials fail explicitly. The custom shadcn login form supports email/password, email codes, Google/GitHub OAuth, email verification, password reset, and supported second-factor/device-trust steps. /sso-callback handles provider callbacks; /session-tasks handles Clerk account requirements. Session activation occurs only after Clerk reports completion. Usernames are disabled in the current development instance and absent from the form. Keep that setting consistent in production.

The login illustration uses HTML/CSS geometry with solid characters, floating tiles and sparks, and shimmering water. Pointer proximity moves the characters' eyes, lifts loose edge tiles, nudges sparks, and moves the parallax layers; updates are batched into animation frames and reset on exit, cancellation, window blur, or a reduced-motion preference change. Touch input does not activate these effects. Each character has a separate loop of adjacent tiles and lifts above the taller ledge before crossing, keeping routes clear of characters and terrain. Six gems spawn along the enemy patrols and disappear with a sparkle when collected; shared CSS timing keeps collection aligned with arrival. The scene requires neither WebGL nor WebGPU and contains no raster illustration. Reduced motion shows a complete still scene, and the illustration is hidden below 1024px on the login page. `Authentication/Login scene` in Storybook includes animated, paused, and reduced-motion previews with a motion control. Browser checks cover terrain/character clearance over repeated laps, pointer reactions and reset, collection/respawn timing, reduced motion, signed-out routing, form navigation, and responsive rendering; they do not create accounts or complete a real password/OAuth round trip. Auth decision logic has unit coverage. Future project APIs must enforce ownership and authorization server-side; client state is not an authorization boundary.

Reference: [Clerk TanStack Start](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart) and [custom authentication flows](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password).

## Storybook

Run pnpm storybook at https://stories.local.spawnkit.cloud or pnpm build:storybook for apps/dashboard/storybook-static. The shared package is adapted from D:/agency/packages/storybook-config: React/Vite, deep-merged configuration, control matchers, Chromatic, accessibility, Vitest addon, and disabled Storybook telemetry. SpawnKit pins compatible Storybook packages to 10.6.2. Addon directories resolve from the shared package for pnpm/Windows compatibility. The dashboard uses a separate Vite config so TanStack Start's server plugins do not run inside Storybook; Tailwind 4 and the real app stylesheet remain active.

The `Project dashboard` group now covers full project pages, immutable version inspection/comparison, promotion, arbitrary compatible rollback, PR previews, activation/draining, logs, players, settings, backend regions, and loading/empty/failure/viewer states. Its in-memory coordinator is isolated to Storybook. See [the design and scenario matrix](project-dashboard-storybook.md). Existing stories still cover action buttons, project setup, and the example gallery. Chromatic publishing needs a separately configured project and is not performed by local builds. The Vitest addon is included as in Agency; an automated story-test Vitest browser project remains separate from the unit test configuration. The browser suite checks real signed-out routes and the dashboard in isolated Storybook fixtures. This avoids introducing an authentication bypass for tests.

Analytics is a distinct project route from Logs. `Project dashboard/Analytics` has twenty interactive design stories with four primary sections (Overview, Players, Health, Explore) and an Alerts utility: player engagement and retention, overview, AI investigation, issue triage/detail, performance, sessions, traces, event export, releases, alerts and boundary states. Metrics derive from deterministic Storybook-only session and player-day cohorts. AI uses an injected story-only adapter, with no live model or repository writes. The deployed Analytics route retains the working tenant telemetry panel; the advanced sample views are not bundled into the application. Read the [Sentry feature study and walkthrough](analytics-experience.md). Run `pnpm exec playwright test tests/analytics.spec.ts` through the repository browser-test configuration. For an already-running isolated preview, use `SPAWN_E2E_STORIES_URL` and a dedicated Playwright configuration with `webServer: []` and a separate output directory. For a stable review while other work changes the repository, build Storybook and serve it with `pnpm exec vite preview --outDir apps/dashboard/storybook-static --host 127.0.0.1 --port 6009`.

Guided CLI setup explicitly asks whether to add Storybook (default no). Automation uses --with storybook; --with vitest,bitecs,storybook combines modules. Generated projects use @storybook/html-vite, HTML score-display stories, scripts, and a separate static output. They do not depend on the monorepo's React Storybook package. Only the esbuild installation script needed by Storybook is allowed in generated pnpm configuration. Storybook is development-only and does not add React/R3F/Bun to game runtime dependencies.

## Physics, interface, and telemetry

CLI flags --physics, --ui, and --telemetry validate compatibility before creating files. Physics choices are Rapier 2D for Pixi, Arcade/Matter for Phaser, Havok for Babylon, and Rapier 3D for Three. Each demonstrates a falling object colliding with a floor. Player movement remains its separate simulation. UI choices are HTML/CSS, Pixi UI, Babylon GUI, or none, with Escape pause/resume in enabled interfaces. Native canvas controls supplement keyboard input.

Telemetry defaults to none during scaffolding. `--telemetry platform` installs the built `@spawn/telemetry` package as a standalone vendored dependency and generates a typed adapter. In the dashboard, open the project's Analytics → Telemetry setup, configure exact allowed game origins, and copy the returned environment settings into the game's ignored `.env`. Restart/rebuild the game after changing settings. Enable capture through `setTelemetryConsent(true)` when the application's collection policy permits it; developer configuration alone does not grant consent. Sentry generates a browser integration gated on `VITE_SENTRY_DSN`, with PII-related data collection disabled. Both public write keys and DSNs are browser configuration, never API/admin credentials. See [Telemetry operations](telemetry-operations.md) and the [SDK README](../packages/telemetry/README.md).

## Next implementation slices

1. Expand isolated UI stories and add game-template lifecycle tests as new modules ship.
2. Add safe, ownership-aware `add`/`install` plans and migrations for edited projects.
3. Add Colyseus presets and two-client integration tests after verifying supported official capabilities.
4. Define the deployment contract, source uploads, hosted builds, environment routing, and immutable promotion/rollback.
5. Connect real dashboard operations and implement pricing/metering before enabling paid resources.

See the product specifications for launch requirements; they extend beyond this initial scaffolding slice.

## Optional browser testing and selection cards

Choose Playwright in the CLI add-on selector or pass --with playwright (optionally alongside vitest). Generated projects include Chromium configuration, a keyboard-input test, and test:e2e / test:e2e:ui commands. Install its browser with pnpm exec playwright install chromium after installing dependencies. Vitest only discovers src/**/*.test.ts, keeping browser tests separate. UI-disabled templates use a canvas/focus smoke check; HUD-enabled templates assert collection.

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

Newly generated projects include `.spawn/state.json`: a versioned generator baseline with module revisions and original generated contents. Commit this file. Existing projects without this record are rejected by `add`; automatic adoption and version upgrades require a future explicit migration.

```sh
pnpm cli add vitest playwright --directory ../my-game
pnpm cli add vitest playwright --directory ../my-game --yes
pnpm cli add storybook --directory ../my-game --dry-run --json
```

`add` previews by default. `--yes` applies; `--dry-run` always prevents writes. Supported additions are Vitest, Playwright, Storybook, bitECS, and Koota, using the shared template compatibility graph. JSON configuration is merged only at generator-changed keys, preserving unrelated fields. Edited generated source/doc files and conflicting package entries stop the entire operation. No overwrite/force option exists. Repeating an addition is a no-op. Dependencies are installed separately with `pnpm install`.

Updates use an exclusive `.spawn/add.lock`, preflight content checks, and a `.spawn/recovery.json` journal containing original contents. Successful operations remove both. On interrupted updates, review the journal against current files before manually restoring; do not delete an active lock. Close editors that write the affected files during application. These local updates are not an atomic multi-file filesystem transaction.

## CLI sign-in and website authorization

### Local project selection

After interactive `spawn login` inside a generated game, choose **New project**, **Existing project**, or **Skip**. Use `spawn login --directory <game-folder>` when running elsewhere. `spawn link` opens the same picker. New projects default to the local game name, allow editing, and require confirmation before creation. They start with production only; Sandbox configuration is separate. Existing projects come from the authenticated account API and are checked again before linking. Skip performs no project API request. Outside a game without `--directory`, login succeeds and explains how to link later.

Use `spawn link --project <id> [--directory <game-folder>] [--json]` for automation. JSON/noninteractive commands never prompt. The nearest parent `game.config.json` defines the game root; the association is saved in `.spawn/project.json`, separate from the scaffold manifest and generator baseline. `spawn unlink` removes only this local association. Switching requires unlinking first. The legacy `project set/show/clear` commands remain available but do not verify account access.

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

This first auth slice stores a short-lived identity access token. Refresh and deployment scopes are not implemented. `logout` deletes local credentials only: it does not sign the browser out or revoke the server-side OAuth grant. No authenticated deployment APIs exist yet. Live Clerk authorization requires the configuration above and manual account sign-in; automated tests cover protocol handling with mocked issuer responses and real loopback callbacks, plus signed-out browser pages.

## Guided Sentry configuration

When Sentry telemetry is selected, guided setup asks for the public project DSN using masked input. Leave it blank to configure later. A supplied DSN is validated and written as `VITE_SENTRY_DSN` in the new project's ignored `.env`, after the creation confirmation. Dry runs never write it. The value is excluded from console/JSON output, `.env.example`, and `.spawn/state.json`. API/auth tokens are not accepted: the browser SDK needs the public DSN; secret tokens for source-map publishing are a separate future integration. Noninteractive `--telemetry sentry` continues to generate `.env.example` for manual configuration.

## Generated game coverage

Selecting Vitest at creation or adding it later installs matching Vitest, V8 coverage, and Playwright browser-provider versions. Run `pnpm test:setup` once to install Chromium, then `pnpm test`. The `test`, `test:coverage`, and `verify` scripts enforce 90% statements, branches, functions, and lines across executable TypeScript under `src`, including renderer startup, input, UI, physics, and telemetry. Test files, Storybook stories, and type declarations are excluded. Thresholds apply to the complete source set rather than separately to each file; uncovered new source files count toward the total.

Vitest runs unit and renderer integration tests in Chromium using software WebGL. Renderer tests use controlled simulation positions to exercise collection, pause, and missing-HUD behavior. Simulation and input have separate unit tests; the template smoke suite and optional Playwright tests exercise actual keyboard-driven movement. Sentry calls are mocked so tests send no telemetry. Coverage reports are written to `coverage/` as text, HTML, LCOV, and JSON summary. See [Vitest browser mode](https://vitest.dev/guide/browser/) and [coverage configuration](https://main.vitest.dev/config/coverage).

`TEMPLATE_CASE` accepts comma-separated name filters when running `pnpm test:templates`, for example `pixi,three`. The complete suite checks every configured case.

## Unified CLI add-on composition

Use `spawn addons` for the complete catalog and its required dependencies. New guided setup uses this same shared resolver. Categories remain useful in the wizard, while command arguments accept one common add-on namespace:

```sh
pnpm cli init my-game --add pixi,rapier2d,pixi-ui --add vitest
pnpm cli init my-game --add rapier2d,vitest --dry-run
pnpm cli add koota --replace bitecs --dry-run
pnpm cli add koota --replace bitecs --yes
```

`--add` is repeatable and accepts comma-separated names; `add` also accepts positional names. Renderer dependencies are inferred (for example, Rapier 2D requires Pixi). If no renderer can be inferred, the resolver asks for one. The final plan includes required add-ons, replacements, generated files, packages and scripts. Interactive commands ask once to apply this completed plan. Noninteractive and JSON commands preview unless `--yes` is supplied. Dry runs never prompt or write; unresolved choices return `needs-decision` and exit code 1. `--yes` cannot choose a replacement, resolve ambiguity, or overwrite an edited file.

Existing renderer migration is unsupported. Incompatible renderer-specific UI can offer compatible alternatives. Physics, UI, ECS and telemetry replacements require an explicit selection or `--replace <old-name>`. Empty choices such as `no-physics` do not require a removal prompt when enabling that feature. Every affected file is checked before the final confirmation; application rejects changes made during review. Three-way JSON merging preserves unrelated user settings. Obsolete generator-owned files and package entries can be removed only when their current contents permit the migration. Edited files block the entire update. The existing recovery journal also covers removed files.

Package installation remains an explicit follow-up: `pnpm install`, then `pnpm dev`. Plans never run package installation scripts. Legacy `--template`, `--with`, `--physics`, `--ui` and `--telemetry` remain accepted for compatibility with existing scripts, including their original creation behavior. Prefer the unified `--add` flow for new usage. The legacy `templates` catalog command remains available.

## Public game discovery and creator experience

The shared `@spawn/platform/not-found` artwork, copy, and stylesheet power the main site's root 404 boundary and the game host's missing-host/release/artifact responses. The main site uses the shared Brand and shadcn Button components; the game host mirrors their static presentation without a client runtime. The controller has four face buttons and no enclosing card. One sentence invites visitors to discover more games powered by SpawnKit, with a raised call to action matching the homepage. The page supports light and dark themes and uses ordinary links that work without JavaScript. The game-host response embeds all styles and artwork and returns 404 with `no-store`; HEAD returns the same headers without a body. `Public site/Game not found` previews the page in Storybook. `tests/not-found.spec.ts` covers dead links, unknown game slugs, nested missing routes, keyboard recovery, responsive layouts, theme handling, and JavaScript-free recovery. Game-host unit tests cover unknown/unpublished games, missing artifacts, HEAD semantics, and platform-host bypass.

The public site shares the dashboard's filled lightning mark, wordmark, SVG favicon, and light/dark/system theme tokens. React layouts use shadcn Button, Input, Checkbox, Tabs, Select, Popover, Dropdown Menu, Textarea, and Radio Group. Theme selection lives in the header. Routes are `/` (game discovery), `/create` (creator introduction), `/templates` (starter-kit builder), `/cloud` (hosting and pricing), `/games/$slug`, `/about`, `/help`, and `/community-guidelines`. Project management is at `/dashboard`; existing root links with `page`, `project`, or `view` parameters redirect there.

Discovery shares the fourteen-game catalog with the dashboard. A monthly gold/silver/bronze bento places the winner on the left and runners-up on the right; mobile puts the winner above two smaller cards. A responsive collection rail, illustrated genre shortcuts, and compact artwork-led game cards support browsing. Collection shortcuts start a fresh selection; detailed filters combine. The random-play control selects only playable games. Hover motion is restrained and respects reduced motion. Search, genre, dimension, availability, minimum rating, minimum review count, and sorting persist in URL parameters. Community design fixtures in `community-preview.ts` provide rankings, ratings, review counts, activity, votes, and comments. They are not live analytics or public submissions. The user explicitly requested a finished design without sample/demo badges or explanatory footnotes; fixture status belongs here rather than in the page UI. Sorting supports popularity, rating (ties broken by review count), reviews, recency, and name. Cards show only rating/review count and one activity measure. Three original Canvas arcade games (Orchard Trail, Prism Break and Starfall Squadron) support keyboard and touch controls, pausing, and restarting. Other entries link to their engine's starter kit instead of pretending to run a game.

The public builder consumes the shared `@spawn/templates/catalog`, `@spawn/templates/composition`, and project generator. It filters compatible physics/interface choices, resolves ECS/tools/telemetry, validates project names, previews actual generated files, and downloads a standalone ZIP via `fflate`. Downloads do not install packages, provision resources, or write over existing directories. The displayed CLI command runs from this repository; public registry publication remains pending.

The public header uses readable navigation links, a current-page indicator, theme selection, and a single creation action. Its mobile menu supports Escape and restores focus. The Creators page follows the [page brief](creators-page.md): engine choices come from the shared catalog, artwork changes with the selection, and the starter link preserves it. The page explains editable source and the actual download/install/run workflow without an unpublished CLI install command. Dimensional browser, laptop, and phone scenes use HTML/CSS; native desktop/mobile templates remain coming soon. Physics uses an actual Rapier 3D world with gravity and collision bodies rendered in Three.js. It loads near the viewport, disposes resources on unmount, and shows a CSS still preview if WebGL is unavailable. Reduced motion renders the settled physics state directly. Public controls stay disabled until hydration.

Cloud follows the [hosting brief](cloud-page.md) with a source/build/release illustration, an interactive Build/Check/Release/Improve walkthrough, project environments, and supported telemetry context. These HTML/CSS illustrations need no GPU API and do not perform deployment operations. The older Three.js environment scene is retained only as a Storybook concept. Pricing is part of Cloud at `/cloud#pricing`; `/pricing` redirects there. The fee estimator separates fixed fees from metered usage, and paid services/multiplayer visibly remain coming soon. Hosted builds are verified in staging; customer GitHub previews, managed multiplayer runtime, paid checkout, and native targets still have separate acceptance or implementation work. Public copy does not activate operations; dashboard availability checks remain intact.

Game ratings and comments persist per game under `spawn:game-feedback:v1:<game>` in browser storage, separate from the display fixtures. Public posting, shared persistence, accounts and moderation are not connected. Malformed stored data blocks writes, concurrent changes are preserved, and storage failures retain input without claiming success. The footer links to product, help, company, community and legal destinations. Contact/social details are mock content at the user's request and need replacement before launch. Privacy has a separate published policy component; the terms route is a placeholder.

`tests/public-site.spec.ts` checks bento geometry at desktop and tablet sizes, collection shortcuts, illustrated genre navigation, random playable destinations, combined community filters and URL persistence, custom shadcn menus, theme persistence, reduced motion, footer destinations, feedback isolation/edit/delete/failure states, responsive discovery, downloads and ZIP contents, engine compatibility, all three arcade games, actual physics drop/settling, release walkthrough, pricing, mobile navigation, authentication boundaries and legacy routes. `tests/marketing.spec.ts` adds WebGL failure fallback, Storybook page interactions, and mobile Escape/focus behavior. Run with `pnpm exec playwright test tests/public-site.spec.ts tests/marketing.spec.ts`; use a distinct `--output` directory if another suite is running. Storybook's `Public site/Marketing` group includes Creators, Cloud, release flow, pricing, and the environment concept. Screenshots are saved under ignored `work/public-*` and `work/marketing-*` paths.
