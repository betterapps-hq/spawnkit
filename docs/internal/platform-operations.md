# Platform operations

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
- `apps/game-host` serves one environment per origin from private R2 artifacts. It does not execute game code in the control service. Hostname reservations must never be reassigned to another project: browser storage and service workers belong to origins. Existing numbered hosts remain compatibility aliases.
- `apps/dashboard` forwards authenticated requests through its same-origin server route. Provider credentials stay on the server. Browser projects are imported once by ID; the browser copy remains a backup.
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

Customer project environments are independent of the platform environment. The [domain contract](../domains.md) defines unique stable project slugs, nested staging and preview aliases, and eight-character immutable deployment addresses. Production is implicit; internal projects nest below staging.spawnkit.cloud. Existing numbered and flat test URLs remain compatibility aliases.

The router resolves exact hostnames from D1 and serves only enabled environments. Immutable deployment addresses resolve their retained release; environment aliases move on activation. Platform origins are forwarded explicitly to their services. Production and staging use separate databases and artifact buckets. Unknown hosts return 404. Game responses use `no-transform` to preserve uploaded bytes.

Cloudflare Custom Domains provision each project base and its wildcard certificate. A bounded scheduled job provisions DNS and waits for active wildcard coverage before activation. Pending certificates do not cause saved builds to rebuild or fail. Runtime provisioning owns new domains; ordinary game-host deploys omit custom-domain reconciliation so newer registrations survive. Scale certificate provisioning before reaching the zone's custom-domain limit.

Run `pnpm domains:plan --environment staging` to inspect, then `pnpm domains:sync --environment staging` to apply; use production for the production database. Each run saves a before snapshot under `work/domains-*`. Apply migrations before deploying the control API. Hosting credentials come from ignored `deploy/.env.domains`; renewal metadata is in `deploy/domain-token.json`.

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

Both existing verification game environments serve matching HTML and JavaScript bytes at their new addresses and legacy aliases. Dashboard visit/copy links use exactly one HTTPS scheme. New tests cover stable hostname reservations, project/environment separation, exact-host routing, traversal rejection, and dashboard URL formatting. Dashboard unit tests: 35 passed; control API: 46 passed; game host: 1 passed. The build completed successfully.

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
