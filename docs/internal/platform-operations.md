# Platform operations

Updated 2026-10-14. This is an implementation runbook, not a claim that every provider integration is enabled.

## Services and ownership

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

- `SPAWN_ENABLE_BUILD_CONTAINERS=true` enables the pinned Sandbox container and build submission. Requires Workers Paid.
- `deploy/github.json` explicitly enables GitHub separately for production, staging, and local development. The deployment launcher sets `SPAWN_ENABLE_GITHUB` from this registry and validates all five environment-specific credentials before building or uploading. An enabled integration with missing credentials fails instead of silently disabling GitHub.
- Production permits only `https://spawnkit.cloud` as a dashboard token origin. Internal testing permits localhost, staging, and the exact registered app preview hosts in `deploy/previews.json`. Customer game hosts are never dashboard authentication origins.

The current Cloudflare login cannot change the Workers subscription or create account service tokens. Account-owner configuration is required for those operations. Build requests return an explicit unavailable response until containers are enabled.

## GitHub App setup

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

Current limits: build logs are uploaded after process completion, not streamed live; hosted container execution awaits Workers Paid; custom build directories and server-rendered game backends are unsupported. Multiplayer runtime orchestration and billing remain deferred.

## SpawnKit app environments

`spawnkit.cloud` was registered through Cloudflare on 2026-10-14 for one year at USD 20.20, with auto-renew disabled. Cloudflare quoted the same current renewal price. DNS zone: `2a8126a122d81d58aafe2535a2219e7c`.

| Purpose | Website | API | Accounts and data |
| --- | --- | --- | --- |
| Production app | `https://spawnkit.cloud` | `https://api.spawnkit.cloud` | Clerk production; `spawnkit-control` D1; `spawnkit-production-artifacts` R2 |
| Internal staging | `https://staging.spawnkit.cloud` | `https://api.staging.spawnkit.cloud` | Existing Clerk development instance; `spawn-control` D1; `spawn-platform-artifacts` R2 |
| Internal app preview | `https://preview-<name>.spawnkit.cloud` | Staging API | Test accounts and test data, never production |

The production Clerk Frontend API uses `clerk.spawnkit.cloud`; the account portal uses `accounts.spawnkit.cloud`. Authentication/email CNAME records are DNS-only and verified. Production subdomain access is restricted to the primary domain and account portal. Production email authentication is enabled. Google and GitHub production OAuth credentials are not configured; those providers and their UI buttons are disabled there. Development retains its existing social connections and existing test user.

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

The local Docker build is not a hosted-build verification. GitHub App delivery and custom-domain routing still require their account setup before end-to-end validation.

## SpawnKit migration verification

The production, staging, and `preview-latest` dashboards return HTTP 200 with SpawnKit branding and their correct Clerk issuers. The production account portal renders at `https://accounts.spawnkit.cloud/sign-in`. A real Google sign-in to internal staging loads the existing test projects; that session does not sign into production. Production Clerk rejects authentication from customer game hosts and staging with `subdomain_not_allowed`.

Both existing verification game environments serve matching HTML and JavaScript bytes at their new addresses and legacy aliases. Dashboard visit/copy links use exactly one HTTPS scheme. New tests cover stable hostname reservations, project/environment separation, exact-host routing, traversal rejection, and dashboard URL formatting. Dashboard unit tests: 35 passed; control API: 46 passed; game host: 1 passed. The build completed successfully.

Repository-wide verification is not clean: the existing near-capacity telemetry test intermittently fails with `ECONNRESET`; the browser run passed 20 of 26 checks, with three old browser-storage fixture expectations failing on both desktop and mobile. Concurrent analytics and CLI edits also produced formatting, lint, and type-check failures during verification. No passing full-suite result is claimed. Production Google/GitHub OAuth, hosted build execution, and GitHub webhook-driven preview creation still require their separate provider setup; domain routing does not enable those integrations.
