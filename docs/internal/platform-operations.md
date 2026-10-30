# Platform operations

## Orchard Snake performance release — 17 October 2026

Source remains `D:/spawn-snake`. Normal CLI production deployment `95b5b068-a7a6-4651-8584-781cb5f4f95a` created release `4aa2c9b9-8585-4574-b04c-b860864d82d1` at `https://d-dc06be6d.spawn-snake.spawnkit.games/`. It passed live desktop/mobile gameplay and was approved through the submission queue. The background is now a 281,198-byte WebP, with the 2,956,496-byte PNG retained outside public artifacts in `artwork/`. A verified version-1 ready message follows artwork/font loading and scene rendering. Cold mobile frame load improved from 19.5 to 6.1 seconds; readiness measured 6.5 seconds. Prior immutable releases remain unchanged.

API version `2a2f69cf-f067-483b-a573-5c63fd314426` adds bounded lossless game-PNG recompression and large-image build notices in the separate offline media job. Container image `sha256:5f3fc5e04ddf850999f2f09846bd3d7df4e165e4642590bd2215158ec97e5958`. Full evidence and remaining field/indexing work: [SEO rollout](../../specs/seo/rollout-2026-10-17.md#batch-2-game-image-and-readiness-follow-up).

## SEO foundation and product pages — October 17, 2026

Production now serves crawlable metadata, robots/sitemaps, six curated kit pages with direct downloads, complete catalog pagination and optional creator-provided game facts. Migration `0022_game_details.sql` was applied to production before the control API. Search Console Domain ownership is verified, the sitemap was processed successfully, and representative public pages passed Google's live crawl tests. No WAF or crawler policy was changed. Preserve the Google verification TXT record.

Deployment versions, migration recovery details, browser/build checks, baseline limitations and pending indexing/measurement follow-ups are recorded in [the SEO rollout evidence](../../specs/seo/rollout-2026-10-17.md). Staging was not deployed by this rollout and still requires its pending migrations before the corresponding API update.

## Reports, team access and listing settings — October 17, 2026

Migration `0020_community_access_reports.sql` was applied to staging and production. Reports and Team now use live D1 records with Admin/Moderator/Observer enforcement, immutable access/moderation history, preserved report evidence, paginated history, assignment checks and transactional content decisions. Creator Settings includes editable listing metadata with persistent overrides, reset to deployed config, and the deployed cover/trailer. No approval state is exposed to creators or players; storage quotas and cleanup remain deferred.

Control API: staging `47e299ab-25e1-4333-84b5-a4c28600d75f`, production `324d4957-bb7c-4a1b-b6b1-5bf86cf8b944`. Dashboard: staging `87a42dda-cc48-49f5-8be6-f68c58b478e3`, production `32c47ecc-7ee3-4f13-85a7-f75ad04f9bc7`. Storybook: staging `caa4db67-0189-4fa4-94c1-15ed43913411`, production `516e3741-554c-4749-bc9a-56b24b25f49f`.

`pnpm verify` passed, including 14 focused community tests. All 10 live-component desktop/phone checks passed. The 28 design-story checks passed after rerunning three interrupted by a concurrent Storybook rebuild. Authenticated production reads verified one Admin, an empty report queue/access history, five managed games, and Orchard Snake's Arcade/2D metadata and both media links. Production browser checks verified Team permissions, Reports navigation, the game-listing form and rendered cover, and the player report dialog. No reports, moderation decisions, invitations or test emails were created in production.

Resend integration uses a leased D1 outbox, seven-day invitations, verified matching Clerk email, link rotation, bounded retries and idempotent sends from `SpawnKit <team@spawnkit.cloud>`. Sending remains disabled: the Resend account is signed out, domain verification is unfinished, and no sending API key is configured. Provider delivery has not been tested. Evidence is under ignored `work/community-*` logs and screenshots.

## Listing metadata and community feedback — October 16, 2026

Applied `0014_game_metadata_feedback.sql` to production D1 and recorded its migration history. Existing listings were classified from their reviewed games: Prism Break and Orchard Snake are Arcade/2D, Starfall Squadron is Shooter/2D, and The Art of the Steal is Idle/2D. Their standalone source listing files now carry those values for future deployments. This one-time metadata backfill did not replace approved game bundles or alter activity counts.

Production control version: `401c1a5a-29f1-45f5-ada3-94c22536dcd0`. Dashboard version: `b3275728-bbe7-422e-960e-56c477fa212e`. Both deployed from the complete current checkout through the cf deployment launcher. Public production API checks returned all four classifications and zero real feedback totals. The signed-in production game page loaded its personal-feedback endpoint and enabled the rating/comment controls. No artificial reviews or comments were posted in production.

Full `pnpm verify` passed (`work/community-final-verify.log`). The 26 desktop/mobile publishing, activity and feedback browser checks passed (`work/community-browser.log`); posting/editing/deletion and failure behavior used controlled browser fixtures, with real SQLite migration/permission/aggregate tests in the control API suite. A new Phaser project generated through the CLI built successfully with the listing JSON, editor schema and default SVG cover present in `dist`. Screenshot: `work/live-community.png`.

Updated 2026-10-14. This is an implementation runbook, not a claim that every provider integration is enabled.

Performance and cost controls are maintained in [Performance and usage controls](performance-and-limits.md), including every polling, cache, rate-limit, build-budget and CPU setting, the existing billing alert, and rollback guidance.

## Services and ownership

### Performance rollout — October 14, 2026

Applied migration `0009_build_budgets.sql` to staging and production, then deployed services and dashboards through the deployment launcher. Production control version: `c0d5f77f-a7c6-43a8-9a5b-cc0f5c425bc4`; game host: `1c236a7c-b3ac-454e-bad4-5fe1f217ecb8`; dashboard: `987b8bbd-767a-4697-9345-60b6f10a4b32`. Staging control: `23d6f2d5-e603-4a2b-b091-bcba6e444653`; dashboard: `884d9576-8d53-4fab-b0ac-8f1f45aeeb2a`. Both environments' dashboard and API health endpoints returned 200 after deployment.

The authenticated staging summary endpoint returned owner-scoped current-environment summaries with `no-store`. Live game HTML revalidated, immutable JavaScript carried the year-long browser cache policy, and conditional asset requests returned 304. A real hosted build (`9af1d873-2e4d-4adc-9a69-081aa814dcd0`) succeeded on the internal verification project's Sandbox and recorded exactly one daily quota claim, including a runtime retry. No user project was changed.

Validation: 59 control API, 61 dashboard and 3 game-host unit tests passed; control API/dashboard coverage tasks passed; all three apps passed type checking. Tests cover concurrent quota claims, cross-owner summary isolation, cache reuse and release switching, disabled preview rejection, and focus/visibility handling. A browser harness using the actual TanStack Query observer verified that interval calls stop on window blur and hidden visibility and resume on visible focus. The cloud-built game rendered and passed keyboard interaction acceptance. Logs are in ignored `work/optimization-*` files.

Targeted formatting and lint passed for these changes. Full `pnpm verify` did not pass: concurrent public-site edits had formatting issues in `create-page.tsx`, `marketing.css` and `navigation.css`; dashboard-wide lint also reported an unrelated public navigation interaction rule in `shell.tsx`. These changes were not rewritten as part of the optimization work. Deployment builds succeeded. Production health is verified; authenticated build and cache acceptance used staging, not production customer credentials.

The existing enabled $10 account budget alert was retained. No paid CDN add-on, customer pricing change, or automatic shutdown of live games was introduced. See the [settings reference](performance-and-limits.md) for controls and limitations.

- `apps/control-api` owns authenticated projects, environment pointers, uploads, releases, deployment jobs, domain verification and GitHub events. Clerk authenticates both dashboard sessions and CLI OAuth access tokens. Every project route checks ownership.
- `apps/game-host` serves one environment per origin from private R2 artifacts. It does not execute game code in the control service. Hostname reservations must never be reassigned to another project: browser storage and service workers belong to origins.
- `apps/dashboard` forwards authenticated requests through its same-origin server route. Provider credentials stay on the server. Hosted projects are loaded from the authenticated platform API; browser-only project imports are not supported.
- Storybook uses a separate fixture controller. Its actions cannot deploy resources or change production data.

## Database migrations

The numbered SQL files in `apps/control-api/migrations` are the canonical schema. Apply them in order, once per database. Migrations 0001 through 0008 have been applied to both `spawn-control` (internal testing) and `spawnkit-control` (production). The Drizzle schema currently covers project configuration operations; do not generate a replacement schema from that partial mapping.

Use the cf CLI. Before applying SQL, inspect the request with `cf d1 query <database-id> --sql <sql> --dry-run`. Apply the same reviewed SQL without `--dry-run`. Never reset the live database to resolve a migration conflict.

## Deploying the control service

Run type checks and tests, then `pnpm run deploy --environment staging --component services --dry-run` and the same command without `--dry-run`. Choose `production` explicitly for production. The launcher uses cf, supplies the environment's Clerk and enabled GitHub secrets through a temporary ignored file, and removes that file afterward. Never log its contents.

Feature configuration must be explicit on every deployment:

- `deploy/builds.json` enables hosted builds for production and staging; local builds remain disabled by default. `SPAWN_ENABLE_BUILD_CONTAINERS=true|false` explicitly overrides that environment's setting. Workers Paid is active. Production uses `spawnkit-build`; staging uses `spawn-build`, with separate Durable Object namespaces and a maximum of three concurrent containers each.
- `deploy/github.json` explicitly enables GitHub separately for production, staging, and local development. The deployment launcher sets `SPAWN_ENABLE_GITHUB` from this registry and validates all five environment-specific credentials before building or uploading. An enabled integration with missing credentials fails instead of silently disabling GitHub.
- Production permits only `https://spawnkit.cloud` as a dashboard token origin. Internal testing permits localhost, staging, and the exact registered app preview hosts in `deploy/previews.json`. Customer game hosts are never dashboard authentication origins.

The current Cloudflare login cannot change the Workers subscription or create account service tokens. Account-owner configuration is required for those operations. Build requests return an explicit unavailable response until containers are enabled.

## GitHub App setup

Production uses [SpawnKit](https://github.com/apps/spawnkit), owned by `AndrewCraswell`, App ID `5323581`. Its read-only Contents, Metadata and Pull requests permissions and Push/Pull request subscriptions have been verified. The production control service has its credentials, and GitHub's signed `ping` redelivery returned HTTP 200 on 2026-10-14. No repository installation or push/PR-driven build has been verified. Staging and local Apps remain disabled.

Use separate SpawnKit GitHub Apps for production, staging, and local development so each App has one webhook destination and its own credentials. Use read-only repository Contents, Metadata and Pull requests permissions. Subscribe to Push and Pull request webhooks. Configure:

- Production webhook: `https://hooks.spawnkit.cloud/api/platform/v1/github/webhook`
- Staging webhook: `https://hooks.staging.spawnkit.cloud/api/platform/v1/github/webhook`
- Production callback: `https://spawnkit.cloud/api/platform/v1/github/callback`
- Staging callback: `https://staging.spawnkit.cloud/api/platform/v1/github/callback`
- Development callback: `https://local.spawnkit.cloud/api/platform/v1/github/callback` (or the registered checkout's exact dashboard origin).
- Secrets: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (PEM), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`.

Copy `deploy/.env.example` into the ignored `deploy/.env.github.production`, `.env.github.staging`, or `.env.github.local` file. Paste the complete PEM as a quoted multiline value. Enable that environment in `deploy/github.json`, then deploy services or restart the local API. The launcher forwards only the five named App credentials to the control service. Previews use the staging App. Local development never loads production or staging App credentials; its callback uses the local checkout origin. When the local App is disabled, the separate local tunnel secret still permits signed transport checks.

Install the App on selected repositories, then connect a repository from its project's configuration. OAuth verifies that the signed-in user can access that installation and repository. User OAuth tokens are not persisted. Build downloads use short-lived installation tokens restricted to that repository.

GitHub social sign-in uses a separate OAuth App configured in Clerk. Do not reuse repository integration credentials as Clerk social credentials. Google social sign-in likewise uses a dedicated production OAuth client. Copy the exact callback URI shown by Clerk into each provider and keep production social buttons disabled until the corresponding connection has been verified. Google must be published for the intended production audience, not limited to test users.

Production follows the configured production branch (default `main`); Sandbox follows `develop`. Same-repository pull requests can create previews when enabled. Forks do not automatically run. A closed pull request disables its environment; retained release artifacts remain available. Newer commits prevent an older in-flight build from becoming current. Automatic repository creation is not implemented.

## Build and release behavior

Sources require `package.json`, `game.config.json` and a frozen `pnpm-lock.yaml`. Archives are bounded to 2,000 files and 20 MiB expanded source, with traversal, links and credential files rejected. Builds use a pinned Node 24 container, an unprivileged user and a fresh filesystem. Dependency lifecycle scripts are disabled. The build command is `pnpm run build`, with static output in `dist`.

An immutable release is separate from its environment. Promotion and rollback change the environment pointer using the expected previous release. They never rebuild source or reverse database migrations. Requests use idempotency keys, and only one active deployment is allowed per environment. A scheduled recovery pass restarts queued jobs whose handoff was interrupted.

Current limits: build logs are uploaded after process completion, not streamed live; custom build directories and server-rendered game backends are unsupported. Multiplayer runtime orchestration and billing remain deferred.

## SpawnKit app environments

`spawnkit.cloud` was registered through Cloudflare on 2026-10-14 for one year at USD 20.20, with auto-renew disabled. Cloudflare quoted the same current renewal price. DNS zone: `2a8126a122d81d58aafe2535a2219e7c`.

| Purpose | Website | API | Accounts and data |
| --- | --- | --- | --- |
| Production app | `https://spawnkit.cloud` | `https://api.spawnkit.cloud` | Clerk production; `spawnkit-control` D1; `spawnkit-production-artifacts` R2 |
| Internal staging | `https://staging.spawnkit.cloud` | `https://api.staging.spawnkit.cloud` | Existing Clerk development instance; `spawn-control` D1; `spawn-platform-artifacts` R2 |
| Internal app preview | `https://preview-<name>.spawnkit.cloud` | Staging API | Test accounts and test data, never production |

The production Clerk Frontend API uses `clerk.spawnkit.cloud`; the account portal uses `accounts.spawnkit.cloud`. Keep Clerk's managed hostname: an alternative such as `auth` requires a separately maintained proxy. Authentication/email CNAME records are DNS-only and verified. Production subdomain access is restricted to the primary domain and account portal. Production email authentication and GitHub sign-in are enabled; a real GitHub sign-in reached the production dashboard. GitHub social sign-in uses the separate `SpawnKit Sign In` OAuth App, client ID `Ov23lipPY9PQteIW2IEo`, with profile/email access only.

Google's `SpawnKit Production` web client exists in project `spawnkit-cloud` and its credentials are configured in Clerk. The exact social callback for both providers is `https://clerk.spawnkit.cloud/v1/oauth_callback`. Google remains in Testing. The owner approved the [privacy policy](privacy-policy-draft.md) and [terms of service](terms-of-service-draft.md), now published at `/privacy` and `/terms` on production, staging and `preview-latest`. Google's homepage, privacy-policy and terms URLs are saved. Public contact pages use `hello@spawnkit.cloud`. On 2026-10-14 the owner chose to supply a branded Google account or managed Google Group for support instead of publishing with the existing personal address. That identity has not yet been supplied; an unverified placeholder cannot be selected. The Google Clerk connection and production dashboard button remain disabled pending that input, publication and a real sign-in check. Production social credentials are stored in ignored `deploy/.env.social.production`; never commit or log them. Development retains its existing social connections and test data.

When the branded support identity is available, select it in Google's branding settings, complete any required verification and publish the app. Enable Clerk's existing `connection_oauth_google`, set `VITE_SPAWN_SOCIAL_PROVIDERS=github,google` in the ignored production dashboard environment, and synchronize that file to the repository's `DASHBOARD_ENV` secret in the `production` GitHub environment before deploying. Verify a real Google sign-in through `spawnkit.cloud` returns to the production dashboard. Do not regenerate the existing client credentials or broaden the identity/email/profile scopes for this activation.

The `spawn` binary and `@spawn/*` package contracts remain unchanged. The bundled CLI defaults to `https://spawnkit.cloud`. Local `pnpm cli` retains its local development default. Production CLI OAuth uses public client `fk6M8GHuSrcQcnKc`, the issuer `https://clerk.spawnkit.cloud`, PKCE, and the exact loopback callback `http://127.0.0.1:43819/callback`.

Run `pnpm run deploy --environment staging` or `pnpm run deploy --environment production` from the repository root. Add `--component dashboard` or `--component services` to limit deployment, and `--dry-run` to validate without deploying. This uses the cf CLI, builds before uploading, preserves telemetry signing secrets, and removes temporary credential files. Development credentials come from ignored `apps/dashboard/.env`; production credentials from ignored `.env.production`. Never commit either file. The checked-in `.env.example` documents the public configuration names.

Repository CI deploys passing `main` commits to staging; production promotion is manual. Passing same-repository PRs get separate app and Storybook frontends with staging authentication. Closing a PR removes its Workers and API origins. See [CI/CD](ci-cd.md) for credentials, promotion, cleanup, and database migration adoption. For a manual internal app preview, `pnpm run deploy --environment preview --preview latest --component dashboard` records its exact origin and updates staging. Use `--component frontend` to deploy app and Storybook together after the shared API allowlist has been updated from trusted code. PR automation always updates shared services from `main`.

## Customer hosting and domains

Customer project environments are independent of the platform environment. The [domain contract](../domains.md) defines unique stable project slugs, nested staging and preview aliases, and eight-character immutable deployment addresses. Production is implicit; internal game projects nest below staging.spawnkit.games.

The router resolves exact hostnames from D1 and serves only enabled environments. Immutable deployment addresses resolve their retained release; environment aliases move on activation. Production and staging use separate databases and artifact buckets. Unknown hosts return 404. Media responses use `no-transform` to preserve byte-range and validator behavior.

Cloudflare Custom Domains provision each project base and its wildcard certificate. A bounded scheduled job provisions DNS and waits for active wildcard coverage before activation. Pending certificates do not cause saved builds to rebuild or fail. Runtime provisioning owns new domains; ordinary game-host deploys omit custom-domain reconciliation so newer registrations survive. Scale certificate provisioning before reaching the zone's custom-domain limit.

Project domain provisioning runs through the control API. Apply database migrations before deploying the API; the dedicated hosting token configures exact project DNS records and certificates.

Customer-owned custom domains can be entered before any deployment. TXT ownership verification is implemented. Their separate custom-hostname/TLS integration still requires Cloudflare for SaaS configuration. The automatic `spawnkit.cloud` project subdomains above are already routed; a customer-owned domain with only verified TXT is not reported as active.

## Verified on live infrastructure

- Clerk-authorized project creation, listing, configuration updates and stale revision rejection.
- Validated source upload and explicit disabled-build response.
- Real generated PixiJS source built in the intended isolated Docker image locally; resulting artifacts uploaded to R2 and served by the live game host.
- Promotion, idempotent replay, conflicting-key rejection, stale pointer rejection, rollback and Sandbox activation.
- Production and Sandbox serve separate origins with unchanged artifact digests.

The local Docker build is not a hosted-build verification. A real GitHub App ping delivery is verified; repository installation and webhook-driven builds remain unverified. Customer-owned custom-domain routing still requires its separate account setup.

## SpawnKit migration verification

The production, staging, and `preview-latest` dashboards return HTTP 200 with SpawnKit branding and their correct Clerk issuers. The production account portal renders at `https://accounts.spawnkit.cloud/sign-in`. A real Google sign-in to internal staging loads the existing test projects; that session does not sign into production. Production Clerk rejects authentication from customer game hosts and staging with `subdomain_not_allowed`.

Both existing verification game environments serve matching HTML and JavaScript bytes at their new addresses . Dashboard visit/copy links use exactly one HTTPS scheme. New tests cover stable hostname reservations, project/environment separation, exact-host routing, traversal rejection, and dashboard URL formatting. Dashboard unit tests: 35 passed; control API: 46 passed; game host: 1 passed. The build completed successfully.

The later 2026-10-14 social-integration run passed `pnpm verify`, including formatting, lint, types, unused checks, configuration tests, coverage and builds. Production CLI sign-in browser checks passed on desktop and mobile (4 checks), and GitHub sign-in was verified manually. Earlier broad browser checks had unrelated fixture failures; a clean complete browser suite is not claimed. Google publication, hosted build execution, and GitHub webhook-driven preview creation remain incomplete.

The approved privacy policy was published on production, staging and `preview-latest` on 2026-10-14. The public policy identifies SpawnKit and uses the requested `hello@spawnkit.cloud` placeholder instead of a personal address. Google's homepage and privacy-policy URLs were saved while it remained in Testing. Dashboard unit tests (57), production builds, and policy/footer browser checks on production and staging (desktop and mobile) passed. The preview policy was inspected directly; its later browser run overlapped with concurrent footer changes and test-artifact cleanup. Full verification was not clean: the unused-code check reported the unrelated `native-select.tsx`, and broader telemetry coverage encountered a local runtime connection reset. Logs are in ignored `work/privacy-policy-*` files.

The subsequent terms publication passed dashboard lint, types and 58 unit tests. Both legal pages and their footer navigation passed desktop/mobile browser checks on production, staging and `preview-latest` (6 checks). All three frontend deployments completed. A concurrent deployment briefly restored the old staging placeholder; the approved pages were redeployed and checked on the active site afterward. The full `pnpm verify` attempt stopped on formatting in concurrent discovery-page edits; it is not claimed as a clean full-repository run. Logs are in ignored `work/google-terms-*` and `work/google-launch-*` files.

## Hosted build activation — October 14, 2026

The owner enabled Workers Paid. Staging and production builders were then deployed successfully. Production control version: `ab3e3131-9399-481b-a261-d4d5f124372c`. The image digest is `sha256:25c345a75500f864b3ec74f299a3e64f3a9b7f67bdb408d909f05944b09633c8`, stored under separate `spawn-build` and `spawnkit-build` applications. Both API health endpoints return 200. Builds are enabled persistently by the environment registry; future service deployments no longer depend on remembering an enablement flag.

Staging deployment `496b5ac8-e92f-496d-b662-4a0959f78607` built uploaded PixiJS source inside a real Cloudflare container and published immutable release `2c977e6e-2d9c-474f-aeb1-7135ba73404f`. HTML and referenced assets returned 200 on both the environment and immutable deployment URLs. Browser acceptance rendered the canvas and collected an item with keyboard input without page errors. Promotion and rollback succeeded with the same artifact digest. An intentional failing build (`01cc3d1b-5547-4f46-a17c-3e92bee6db20`) recorded failure output and preserved the previous production environment pointer.

The CLI session separately completed real CLI/API deployment `8fd1fccf-fbd3-4383-b377-6ac8577f51c0`, including browser movement, collection and pause/resume checks. See `cli-platform-handoff.md` for its exact invocation scope and evidence. All acceptance mutations used the existing internal Platform verification project; the user's Test project was untouched. Production is deployed, but these authenticated build acceptance runs used staging credentials and staging data, not production credentials.

Decisions: maximum three simultaneous builders per environment; separate container applications and namespaces; no paid multiplayer runtime or customer billing added. Build logs remain available after process completion rather than streamed live. The platform's Workers subscription is account-wide; it is separate from SpawnKit customer pricing.

CI's repository secret was replaced with a dedicated token that adds account-scoped Workers Containers Write while retaining the existing account/zone restrictions. Container access with the new token was verified. Rotation metadata and the superseded token cleanup note are in `ci-cd.md`.

Validation: control API types/lint and 52 tests passed; all workspace coverage tasks passed (58 dashboard, 17 telemetry-worker, 13 telemetry SDK, 87 templates, 52 control API, 96 CLI tests). Workspace lint and types passed. Full `pnpm verify` is not claimed: concurrent dashboard edits produced formatting/unused-export failures, and the aggregate build encountered the in-progress Discover page's missing `discovery.css`. The control API production deployment build succeeded. Logs are retained under ignored `work/hosted-*` files. Managed game hosting and build execution are verified; a production-authenticated customer build and live GitHub webhook-driven game preview remain separate acceptance work.

## Customer GitHub acceptance — October 14, 2026

The owner authorized a real customer repository integration test. The private `AndrewCraswell/spawnkit-verification-game` repository contains only a generated PixiJS starter, with initial commit `defdb94`. Its local checkout is in ignored `work/github-game-verification`; its own `pnpm verify` passed (7 tests, types, lint and production build).

The production dashboard created project `GitHub Verification` (`bcf58b1d-7a0c-4ab8-a4ad-9d65df562eba`, slug `github-verification`) through the signed-in customer flow. Sandbox and PR previews are enabled. After the owner completed GitHub identity verification, App installation `171610977` granted read-only code, metadata and pull-request access to this repository alone. The real OAuth callback persisted the connection and returned to the project's dashboard settings.

Acceptance found and fixed three integration defects: cloud projects hid repository configuration, the callback targeted the old homepage route, and GitHub requests used a redirect mode rejected by workerd. Requests now use manual redirects with status checks, preserving credential boundaries. The archive importer also omitted neither the starter's `.spawn` metadata nor `.npmrc`; these now stay out of build uploads, matching CLI behavior. Submission logs include safe validation reasons. The environment graph now shows the deployed release's actual branch instead of labeling Sandbox with the production branch. Preview availability follows the saved configuration and connected repository, so closing the last PR does not incorrectly display previews as disabled.

| Verified action | Evidence |
| --- | --- |
| Push to `main` | Commit `ce494d3`, deployment `8c9e4e56-b049-435a-9912-e0fd84a0d9ab`, live at `github-verification.spawnkit.cloud` |
| Push to `develop` | Commit `6d3227a`, deployment `cc7c31ea-4678-4d72-9073-fd461186d6cf`, live at `staging.github-verification.spawnkit.cloud` |
| Same-repository PR preview | PR #1, commit `2451541`, deployment `26ab3f93-f02c-4330-b968-48be3cf7d842`, served at `pr-1.github-verification.spawnkit.cloud` |
| Preview update | Commit `29fbf7e`, deployment `ae3338aa-4fc1-44fb-a6ef-146aa21c3d3e`, same preview address served the updated heading |
| PR close and isolation | PR #1 closed without merging; preview alias and its immutable URL returned 404. Production and Sandbox aliases and immutable URLs remained 200 with their original headings. |

All three hosted PixiJS games rendered and collected an item through real browser keyboard input. GitHub reports HTTP 202 for push, PR-open/update and PR-close webhook deliveries. Production's immutable URL is `d-e55a457b.github-verification.spawnkit.cloud`; Sandbox's is `d-8baa2e89.github-verification.spawnkit.cloud`. The closed preview's first immutable URL was `d-0718042d.github-verification.spawnkit.cloud`. Earlier failed import events remain in the isolated project's history as acceptance evidence.

Validation: full `pnpm verify` passed in the shared checkout and the isolated release checkout; 18 relevant desktop/mobile browser checks passed. Production and staging API/frontend fixes were deployed from verified source. The staging GitHub App remains disabled by its existing environment configuration; the shared fixes do not authorize a second App or broaden repository access. Logs and screenshots are under ignored `work/github-game-*`. Preserve the repository and project for repeatable acceptance; do not use the platform's own repository as a customer game.

## Google sign-in activation — October 15, 2026

The owner authorized ajcraswell@gmail.com as Google's user-support contact, specifically excluding it from the public website and terms. Google project spawnkit-cloud now has In production publishing status. Clerk production's existing Google connection is enabled with its existing client credentials and only openid/email/profile scopes. The production dashboard environment and GitHub production DASHBOARD_ENV secret now enable github,google.

Production dashboard version 760f33b3-e737-437b-8d43-010d41141594 includes the Google button and the isolated login polish: the redundant sign-in heading remains screen-reader-only, and CLI login/authorization branding says SpawnKit. Website contact/legal text was not changed. Four production CLI login browser checks passed for the initial login-polish deployment; a clean-browser Google click after activation reached accounts.google.com successfully. A real account sign-in and CLI authorization remain pending user completion; do not claim end-to-end account verification yet. Deployment logs are in ignored work/snake-google-deploy.log.

Follow-up: the real Chrome session exposed a stale sign-in bug. After an unfinished email/password attempt, the future SignIn.sso method could return successfully without a redirect. Resetting the resource alone still left the hook referencing the old instance. Social sign-in now resets the attempt and calls authenticateWithRedirect on the replacement clerk.client.signIn resource. Production version 7145cb23-d755-4280-80a1-71ab7ec8715c includes the fix. The failed-password-then-Google reproduction stayed on /sign-in before the fix and reached accounts.google.com afterward. Full pnpm verify and six desktop/mobile login checks passed. Real Google sign-in with the owner's account, the CLI consent page, and CLI credential persistence succeeded. Chrome displayed ERR_BLOCKED_BY_CLIENT on the final loopback page, but the callback had already completed successfully; a redundant local request found the listener closed. Do not treat the final browser display as proof of failed authorization.

The normal interactive CLI created and linked spawn-snake (460be2a7-c8b2-4a65-82e5-6a5e00430ad1) under the owner's production account. Its standalone source is D:/spawn-snake, created via pnpm cli init with the PixiJS/Vitest preset. Production only; no paid Sandbox or multiplayer resources. First deployment: 52e92f82-9f36-4a70-9378-12b92d8ab0da, release 73443ba7-9800-43a4-9348-b323b66142ef, request snake-first-production-20261015. Hosted completion and browser acceptance are recorded below when complete.

Snake hosting acceptance completed: the original deployment succeeded at https://spawn-snake.spawnkit.cloud with immutable URL https://d-ce2d4f52.spawn-snake.spawnkit.cloud. Its certificate became active after initial validation. A retry after success returned 409 because the CLI re-read the now-changed predecessor; status/release listing confirmed the original successful release and no second deployment was required. The retry-identity handling and generic hosting-pending error are onboarding follow-up findings. Local game verification passed 10 browser/unit tests with 100% statement and 95.45% branch coverage. Production browser acceptance results and screenshots are stored under D:/spawn-snake/work. The temporary release worktrees were removed; login source fixes remain in the main checkout for normal review/commit.

## Snake and publishing rollout — October 15, 2026

Snake's game-first HUD and overlay release is live at `https://spawn-snake.spawnkit.cloud`, with immutable release `28c29949-cf8a-472d-8993-0c7fc41f6d22` at `https://d-dd13ccef.spawn-snake.spawnkit.cloud`. Deployment `26796ead-66da-49c5-aada-1e9b5a69fea0` succeeded. Desktop/mobile production browser checks passed for scoring, controls, collisions, restart, pause and saved best score.

Applied migration `0010_game_submissions.sql` and deployed control API version `a01355f4-d739-4677-bea1-1352937f4c84`, dashboard version `1df57619-8677-4463-99e3-7b47edc2053d`. The Snake project's existing owner is the initial platform administrator. Snake was submitted through the production creator screen and remains pending for the owner's homepage approval. Production `/admin/submissions` shows it and successfully loads the immutable game in its sandboxed preview. Anonymous creator/admin pages redirect to sign-in; the admin API returns 401 and the public catalog remains empty while Snake is pending.

Deployment used an isolated checkout containing only publishing changes and the already deployed login fixes. Main checkout's unrelated marketing/pricing changes were preserved. Full verification passed in the isolated checkout; four desktop/mobile publishing browser checks passed with mocked API responses. Database behavior tests passed separately. Local cf OAuth supports `d1 raw`; `d1 query` returned a permission error, so operator provisioning used `raw`. See [game publishing](../game-publishing.md) for permissions, release pinning and current limits.

### Snake viewport correction

Removed Snake's outer card, margin, border radius and page-sized layout. The game fills its viewport and scales the board within space reserved for HUD and controls. Five real iframe sizes passed production checks for no horizontal/vertical overflow and visible controls: 742×760, 960×540, 360×640, 844×390 and 320×320. Gameplay desktop/mobile checks and game verification passed. The dashboard player now sizes its iframe independently of intrinsic frame dimensions and supports browser fullscreen with exit/error handling. Four publishing browser tests passed, including actual fullscreen entry/exit, and isolated `pnpm verify` passed.

Production release `14cfafe5-5ba9-4e31-a0ba-584bf047a676`, deployment `21e5ea23-b120-4adc-b4fd-83563d8ba300`, immutable address `https://d-36efe109.spawn-snake.spawnkit.cloud`. Dashboard version `7c335e3f-1873-482b-9ffb-da34e7fbaa13`. The old pending submission was rejected with a replacement note and the corrected release submitted for the owner's approval.


## Arcade releases and complete dashboard deployment — 2026-10-16

The dashboard was deployed from the complete validated `D:/spawn` checkout. The previous isolated release snapshot had omitted newer website/dashboard edits. Current dashboard Worker version: `18c004b9-e7e6-475c-9011-95484b99822e`.

Public discovery now includes approved hosted releases only. Mock concepts and embedded prototype games were removed; games use stable `/play/<projectId>` pages. The player mounts immediately, has no Close game control, and fullscreen excludes the platform toolbar. Ratings/comments remain honest zeros; all catalog games use their real project activity totals.

Two standalone Phaser games were scaffolded, linked and deployed with the SpawnKit CLI to the owner's account, then reviewed and approved:

| Game | Source | Project | Approved release |
| --- | --- | --- | --- |
| Prism Break | `D:/spawn-prism-break` | `48e5de5d-4537-46bc-b398-7ac0ea31666e` | `f31f8246-24fc-4bd2-89d3-4fd576b228e0` |
| Starfall Squadron | `D:/spawn-starfall-squadron` | `5073c952-7c46-4745-8cc0-815ddab8e0e5` | `1e5dcadf-38f8-4920-a9bd-a1947ef68604` |

Both listings include optimized cover art and a 12-second actual engine gameplay preview. The games send `spawnkit:play` on Start and disable Phaser's automatic focus to prevent load from looking like an interaction. Live verification confirmed a new Starfall page view with zero plays, then one play after opening/starting, with both totals unchanged on refresh. All four approved public games expose real counters. The GitHub verification project remains unpublished.

Validation: full `pnpm verify`; 32 desktop/mobile platform acceptance checks; six distinct browser checks per standalone game, covering desktop/portrait play, pause/save, upgrades/retry, controls, preview capture and embedded focus; pure mechanics tests with full coverage of the tested rules. Live checks covered both hosted games, approvals, counters, and game-only fullscreen. Browser tests do not claim mobile Safari or console-controller certification.

CLI follow-up discovered during release: `link` creates a project with only Sandbox configuration, so the dashboard defaults its engine to PixiJS. These two projects' names and complete Phaser configuration were corrected through the revision-checked project API. Automatic manifest-to-project metadata import remains a CLI improvement.

## Build admission queue — October 16, 2026

Applied migration `0016_build_queue.sql` to staging and production. Control API versions: staging `abbf790c-b388-4d8f-a1f7-a5dec0c5a948`; production `1242998d-6a0f-4d97-bdc5-44efb6e9198a`. The shared D1 queue reserves at most three builders, schedules across project owners, retries recognized transient failures with bounded backoff, and retains reservations until container cleanup succeeds. Waiting releases use the existing Queued label. No dashboard deployment or container-capacity increase was needed.

Validation: full `pnpm verify` passed, including 100 control API tests; 20 desktop/mobile deployment and log acceptance checks passed. Four temporary staging jobs were admitted together: three executed while one waited, the fourth subsequently executed, and all reservations were released. These jobs deliberately failed their build command, confirming normal build failures do not retry or activate releases. Temporary projects, sources, logs and test reservations were removed afterward. The initial probe also exposed interrupted processes; SIGTERM retry handling was added and tested separately before the successful repeat probe. Evidence is under `work/build-queue-*`, including the staging record, runtime log, browser log and deployment logs. Production health and catalog checks follow deployment; real games were not rebuilt for this change.

## Hover preview responsiveness — October 16, 2026

Dashboard versions: staging `6f02b189-aa90-4422-be84-0095ba4ef4ef`; production `b17ce18f-75cb-4c3d-8025-83ec86ef1b95`. Hover intent now bypasses the automatic animation load/idle gate and the old 250 ms delay. Videos remain absent until eligible mouse intent; repeat hovers reuse a paused player for up to 30 seconds. Offscreen, hidden-tab, reduced-motion and timeout cleanup release the player. Covers remain visible until playback, and failures retain working game links.

Inspected the opening frames of all three configured clips. Removed the first 2.8 seconds from Snake, 3.2 from Prism and 2 from Starfall; each edited clip is eight seconds and begins on active gameplay. Encoded silent, faststart H.264 MP4 derivatives and updated each standalone source listing. Original recordings remain in the source projects. Used the CLI for three new production releases and the authenticated review API to approve their exact submissions after verifying deployed preview hashes and cover presence:

| Game | New release | Preview bytes, before → after |
| --- | --- | --- |
| Orchard Snake | `79844c5b-9f68-4098-83a0-5606d61200da` | 300,225 → 195,245 |
| Prism Break | `3ebc7dcd-f3df-4834-9890-7beb2b1468d7` | 2,004,579 → 558,941 |
| Starfall Squadron | `f041facb-f557-447c-a838-925f1c8102d7` | 2,168,800 → 547,696 |

Validation: `pnpm verify` passed; publishing/deferred-loading browser checks passed 23 with three desktop-hover checks intentionally skipped on mobile. Tests cover explicit hover while an unrelated image delays window load, buffer reuse, expiry, offscreen release, media failure, reduced motion and the unchanged automatic 3D deferral. A fresh Chromium production run measured pointer entry to the `playing` event at 310–370 ms on first hover and 2–3 ms on repeat, with zero new requests on repeat and no video requests before intent. Before the player update, the same edited clips measured 587–648 ms on first hover and 275–280 ms on repeat. These are local measurements, not global latency guarantees. Evidence: `work/hover-*` and `work/hover-audit/`. Art of the Steal has no configured preview video. Automatic platform video transcoding/trimming was not introduced; cover optimization remains automatic.

## Platform-owned listing media limits — October 16, 2026

Cover input is now capped at 1 MiB and trailer input at 2 MiB. After each hosted game build, the platform runs Sharp for covers and FFmpeg/FFprobe for trailers inside its existing isolated build queue. Covers remain single-frame WebP, at most 960 pixels per side and 384 KiB. Trailers become silent H.264 MP4, the first eight seconds at 24 fps and at most 640 pixels per side, with faststart metadata and a 2 MiB output ceiling. Oversized or invalid listing media is omitted with a build-log warning; the game can still deploy. Compression does not identify title screens or select highlights. Source assets remain unchanged. Submission and approval paths validate the actual stored derivative bytes, format bounds and content-addressed filename.

Control API versions: staging `1f158ab4-a370-493a-b0ad-db5a07cbd285`; production `054d66ad-cf60-4b1c-9c5f-9cfdbe0c58e7`. Both build applications use image digest `sha256:f956aa4a5b1cae816ced3cb7a6e9b4e1db808b39125337a8ff30a0ef26327de0`. Dashboard versions: staging `2223033f-04f8-440f-bbf1-f95b85320a82`; production `d5a84598-349c-4921-94a3-da9797d89cbf`. The CLI bundle and downloadable starter kits include the new media limits and processing guidance.

Live acceptance caught the mixed-image window during Cloudflare's gradual container rollout: the first three builds still used the prior cover-only processor. Those releases were not approved. Wait for the application rollout to complete and verify actual build output, rather than treating Worker deployment success as proof that every builder uses the new image. Production reached application version 4 with no active rollout. Repeated builds then produced both derivatives, which passed byte-level validation before approval:

| Game | Approved release | Cover bytes | Trailer bytes, input → output |
| --- | --- | --- | --- |
| Orchard Snake | `5fa558e3-7b8e-439f-9c77-42b9a8b16002` | 47,384 | 195,245 → 189,019 |
| Prism Break | `072828c5-a57d-424f-8149-9b3acd0ce8fb` | 79,686 | 558,941 → 366,033 |
| Starfall Squadron | `0ed2b6ad-f034-4421-9b84-245fb103719c` | 89,950 | 547,696 → 369,907 |

Validation: full `pnpm verify` passed, including real MP4/WebM encoding, malformed-media rejection and exact input boundaries; 23 relevant desktop/mobile browser checks passed, with three desktop-only hover checks skipped on mobile. The exact production container image also passed complete build-runner checks at 0.25 CPU / 1 GiB with networking disabled: valid media was optimized, oversized media was omitted with explicit warnings, and the game remained deployable. Browser downloads from both deployed template pages contain the new limits. A fresh production browser loaded no videos before hover and played all three new derivatives on hover; frame captures were visually inspected. Evidence is in ignored `work/media-*` logs, deployment records and downloaded derivatives. No database migration or build-capacity increase was required.

## Live build output and deployment results — October 16, 2026

The build coordinator now persists sandbox process output while the command is running. `spawn deploy` follows incremental logs and waits for a terminal result by default; `--no-wait` detaches and `spawn logs <id> --follow` resumes. Final results contain the game, immutable deployment and dashboard URLs. JSON stdout remains a single result, with live logs on stderr. Ctrl+C ends the watcher without cancelling the deployment. Dashboard version details include live output with scroll-follow controls and copying.

Migration `0017_release_media_warnings.sql` was applied to staging and production. The build runner saves bounded cover/trailer warnings with the release, and the API exposes them to the CLI and authenticated project dashboard. Missing explicitly configured files now warn as well as invalid or oversized media. Optional absent default media stays silent. Version details and the current production overview show the remediation; no creator-facing submission or approval status was added.

Control API versions: staging `00b0dae9-261d-407e-9e95-1e886778edd0`, production `cedfccac-6e73-4474-9add-d2e9c46adae6`. Dashboard versions: staging `c6523382-9b00-40d7-bd70-19492d0770b4`, production `8409731c-8338-4f03-b0d6-9af570ad0d0a`. Build image digest: `sha256:fb90f3114e7b9f083181471f652c683fd2a83e749bbafc843ed1669e82db534d`. Container rollout completed at staging application version 13 and production version 5, with no active rollout and all three production instances healthy.

Full `pnpm verify` passed. Twenty relevant desktop/mobile browser checks passed after updating one stale region-label expectation from the earlier overview redesign. A real staging build deliberately paused for 45 seconds: its early output was available while it was still building, then it succeeded with persisted oversized-cover and missing-trailer warnings. Its temporary project, database records and source/artifact objects were removed. Production CLI deployment `5d239e48-4093-4198-ab2a-bd04f956f117` rebuilt the existing GitHub Verification project and completed with release `408c39b8-9806-4886-b10c-d10e9dfc33b6`, game URL `https://github-verification.spawnkit.cloud`, immutable URL `https://d-9fc7f402.github-verification.spawnkit.cloud`, and the correct project dashboard URL. The watcher remained attached across a container termination and automatic build retry during rollout. The production browser displayed build logs before completion. Evidence is in ignored `work/live-logs-*` and `work/live-output-proof.*`.

## Typed listing config and browser security — October 16, 2026

Generated games include `spawnkit.config.ts`, a standalone `defineConfig()` helper, a Vite manifest plugin and default cover artwork. The plugin reads either `spawnkit.config.ts` or `spawnkit.config.json` at the project root and emits `spawnkit.config.json` for hosted builds. CLI media preflight checks included source files before upload without executing the configuration. Literal cover/trailer paths get the 1 MiB / 2 MiB checks early; dynamic and build-generated assets are explicitly deferred to authoritative hosted checks.

The dashboard and game host now enforce separate CSP headers. The application uses per-response nonces, exact Clerk permissions and no JavaScript `unsafe-eval` or script `unsafe-inline`. Games retain arbitrary inline/evaluated game code on their own origins, with a response sandbox, restricted network destinations, explicit framing origins and device permissions. CLI consent loads Clerk's UI and permits only its exact identity-provider form destination and fixed loopback callback on `/cli/authorize`; other app pages retain self-only forms. A real CLI credential refresh completed under the deployed policy.

Final dashboard versions: staging `111b468f-52db-493b-8de9-8aacae712768`, production `8603ffb7-6756-46da-a1b1-de9d2ef5f609`. Game host: staging `eed8e436-f374-4192-99e7-fc04ccda0b96`, production `68a2bc12-f640-4d28-b23a-0bb7c8997ccb`. Control API: staging `f3ddc691-1f22-4a3a-aa28-cffb2241860d`, production `fec9d679-eeae-44e4-a50b-bbc8c0395c8b`. Build image `sha256:27648faf57a210f0ca4943e68193ec8dd0a5818b0f69f1dee7954913eca545c1` contains Sharp 0.35.5. Rollout finished at staging application version 14 and production version 6, with three healthy instances each. The lockfile audit reports no known advisories.

`pnpm verify` and generated-project smoke tests for all four renderers passed. Live desktop/mobile checks cover application nonces/navigation/sign-in UI and all four published games. Synthetic tests verify blocked scripts, parent access, popup/top navigation and network access, plus the intentional game-only evaluation exception and the remaining parent-domain cookie risk. Live cached HTML, HEAD, 304 and video range responses retain the game policy. The [detailed upload audit](game-upload-security-audit.md) records open architectural risks; CSP is not a substitute for a separate registrable game domain or independent trusted media processing.

Storybook production version `2b060b0d-fcce-4625-a551-8a583b3c9e75` includes `Public site/Player loading` with loading, slow, failure and retry states. This remains an approval mock, not production player behavior.

Orchard Snake's menu blur now covers the full orchard background and board while preserving readable HUD/controls. It passed intro, play, pause, resume and game-over checks at 1304×720, 844×390, 390×844 and 360×640, both locally and hosted. CLI deployment `63f59d3c-9ef1-45cc-959f-d7fb1d3e7882` produced release `f57fddb0-bfdf-465f-a368-716b89cb197a` at `https://d-d7b99d27.spawn-snake.spawnkit.cloud`; the verified release replaces the homepage listing. The patched hosted processor produced a 47,384-byte cover and 188,985-byte trailer without warnings.

## Existing-game asset optimization — 2026-10-17

Completed and publicly approved: The Art of the Steal release `a36bb607-3e74-4785-b5ac-edab1d3c5640`, Prism Break `aed8cc34-1a52-45cb-9390-d2ad30011eaa`, and Starfall Squadron `3a567d56-e350-434d-9cf0-22a8e31b78d7`. Source locations are `D:/art-of-the-steal`, `D:/spawn-prism-break` and `D:/spawn-starfall-squadron`. Art uses its existing `scripts/prepare-release.mjs` workflow; uploading the entire local showroom exceeds source limits. Original recompressed sprite files remain under `source-art/seo-originals/staff`.

Production API version `e248b296-8545-45d9-a014-d7021cad98cf` fixes an empty D1 log batch when no oversized game images exist. API tests now reject empty batches, matching production. Repository verification and hosted gameplay passed. See [SEO rollout evidence](../../specs/seo/rollout-2026-10-17.md#existing-game-asset-follow-up) for measurements and exact public hosts.
