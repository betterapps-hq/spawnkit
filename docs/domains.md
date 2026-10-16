# SpawnKit domains

Agreed 2026-10-14. Brand: **SpawnKit**. CLI: `spawn`. Root: `spawnkit.cloud`.

## Platform environments

Production is implicit. Internal testing nests below `staging.spawnkit.cloud`.

| Service | Production | Staging | Local primary checkout |
| --- | --- | --- | --- |
| Dashboard | `spawnkit.cloud` | `staging.spawnkit.cloud` | `local.spawnkit.cloud` |
| Control API | `api.spawnkit.cloud` | `api.staging.spawnkit.cloud` | `api.local.spawnkit.cloud` |
| Storybook | `stories.spawnkit.cloud` | `stories.staging.spawnkit.cloud` | `stories.local.spawnkit.cloud` |
| Telemetry | `telemetry.spawnkit.cloud` | `telemetry.staging.spawnkit.cloud` | `telemetry.local.spawnkit.cloud` |
| Public webhook receiver | `hooks.spawnkit.cloud` | `hooks.staging.spawnkit.cloud` | `<slot>.hooks.local.spawnkit.cloud` |
| Isolated browser tests | Test the deployed app | Test the deployed app | `e2e.local.spawnkit.cloud` |

Linked Git worktrees prefix their normalized directory name, for example `auth-fix.local.spawnkit.cloud` and `auth-fix.stories.local.spawnkit.cloud`. Their API, telemetry, E2E app, and E2E Storybook names are `auth-fix.api.local.spawnkit.cloud`, `auth-fix.telemetry.local.spawnkit.cloud`, `auth-fix.e2e.local.spawnkit.cloud`, and `auth-fix.stories.e2e.local.spawnkit.cloud`. There are no automatic hashes; a complete-hostname collision is reported. Changing branches does not change an origin. Browser-test Storybook uses `stories.e2e.local.spawnkit.cloud`, separately from interactive Storybook. CI can use explicit loopback origins without a trusted local CA.

Platform previews retain `preview-<name>.spawnkit.cloud`; numeric pull requests use `preview-pr-42.spawnkit.cloud`. They use staging services and test accounts. Preview origins must be registered explicitly. Staging data and credentials are separate from production.

## Customer projects

Each project reserves a unique public slug within its platform environment. The slug is independent of its editable display name and is never silently changed by a rename. Reserved platform names cannot become project slugs. A collision receives a short suffix; internal database IDs never appear in ordinary deployment URLs.

| Customer destination | Production platform | Internal staging platform |
| --- | --- | --- |
| Production alias | `emberfall.spawnkit.cloud` | `emberfall.staging.spawnkit.cloud` |
| Staging alias | `staging.emberfall.spawnkit.cloud` | `staging.emberfall.staging.spawnkit.cloud` |
| Pull request alias | `pr-42.emberfall.spawnkit.cloud` | `pr-42.emberfall.staging.spawnkit.cloud` |
| Immutable deployment | `d-a1b2c3d4.emberfall.spawnkit.cloud` | `d-a1b2c3d4.emberfall.staging.spawnkit.cloud` |
| Local game | `local.emberfall.spawnkit.cloud` | Explicit local configuration |

Environment aliases move when a release activates or rolls back. Deployment URLs identify retained immutable artifacts. Closed or disabled preview environments must not remain accessible through a pinned URL. Existing published addresses remain compatibility aliases. The API's `sandbox` environment means customer staging; it is not the platform's staging environment.

## Planned regional telemetry

EU telemetry endpoints selected from game-server deployment location are an agreed requirement. Proposed names are `telemetry.eu.spawnkit.cloud` for production, `telemetry.eu.staging.spawnkit.cloud` for internal staging, and `telemetry.eu.local.spawnkit.cloud` for local regional tests. These names are not yet provisioned, registered with local routing, or verified. The `/v1/logs` path remains the log-ingestion contract.

Keep the existing nonregional telemetry names as compatibility endpoints during migration. A hostname does not establish processing/storage location. Verify DNS, nested certificates, region-scoped routing and the complete data path before advertising EU handling. Configuration comes from the running server allocation; multi-region games must not have a single hardcoded global endpoint. See [regional selection and acceptance](telemetry-analytics-architecture.md#eu-endpoints-and-endpoint-selection).

## DNS, HTTPS, and isolation

DNS wildcard matching and certificate wildcard matching are different. A certificate for `*.spawnkit.cloud` does not cover `staging.emberfall.spawnkit.cloud`. Provision and verify the required nested certificates before advertising those addresses. Unknown hosts fail closed. Platform hosts must bypass the customer artifact router.

Unknown game hosts, unpublished games, disabled environments, and missing artifacts that reach the game router return a branded **Game not found** page with HTTP 404. Its **Discover games** link uses the absolute `https://spawnkit.cloud/` homepage so recovery leaves the unavailable game domain. The response is self-contained HTML/CSS, works without JavaScript or remote assets, is not cached, and is excluded from indexing. Main-site missing routes and unknown game slugs share the same presentation with a local homepage link. DNS and TLS must still reach the platform before any HTTP fallback can be served; this cannot replace a browser's DNS or certificate error for an unrelated or unconfigured domain.

The current provisioner registers a Custom Domain for each project base, verifies an active certificate covering its wildcard, and creates its public and local DNS records. Cloudflare currently limits a zone to 100 Worker Custom Domains; provisioning stops before 90 to retain platform headroom. This is a bounded initial rollout, not unlimited hostname capacity. Expand certificate provisioning before reaching that guard. Ordinary router deployments preserve runtime-created domains. The provisioning credential expires on 2027-10-14 and must be renewed before then; its scope and expiry are recorded in the deployment metadata.

Loopback local names resolve to `127.0.0.1` and are DNS-only. Public webhook names are explicit proxied records or tunnel routes and override loopback DNS. The root `dev-domains.config.ts` is the local naming contract. Published `@buildkitgg/dev-domains` reserves backend ports and registers exact hosts through Portless, which owns the shared HTTPS proxy and certificates. Other repositories can share the proxy with their own domain, such as `local.copacker.ai`. Never stop the shared proxy or replace another checkout's routes. Local certificate trust is machine setup, not a browser-test exception.

Platform and customer authentication use host-only cookies. Never set `Domain=.spawnkit.cloud`; customer-controlled content shares this registrable domain. Customer origins are not authorized platform sign-in origins. Each customer integration has its own exact origin/callback allowlist and credentials per environment. Domain layout alone does not isolate sites for SameSite cookies; sensitive platform operations still require origin/CSRF checks.

## Auth and webhooks

| Integration | Production | Staging / local |
| --- | --- | --- |
| Platform Clerk session origin | `https://spawnkit.cloud` | Exact dashboard origins in `deploy/local-origins.json` and `deploy/previews.json`, plus `https://staging.spawnkit.cloud` |
| Platform GitHub callback | `https://spawnkit.cloud/api/platform/v1/github/callback` | Same path on `https://staging.spawnkit.cloud` or the exact local dashboard origin |
| Platform GitHub webhook | `https://hooks.spawnkit.cloud/api/platform/v1/github/webhook` | Same path on `https://hooks.staging.spawnkit.cloud` or `https://<slot>.hooks.local.spawnkit.cloud` |
| Customer OAuth | Exact provider callback path on the project's production alias | Exact path on its staging or registered preview alias; local callback on `local.<project>` |
| Customer webhook | Exact server receiver path on a stable project alias | Staging receiver or a named local tunnel to the customer's actual server; path must be configured explicitly |

Customer callback paths and credentials belong to their chosen integration. SpawnKit does not invent callback endpoints for static games. No wildcard OAuth callback is assumed to work.

- Platform Clerk production is restricted to the production dashboard. Staging, platform previews, and local development use the development instance. Preserve the CLI's PKCE loopback callback `http://127.0.0.1:43819/callback`; it is not a hosted web callback.
- Customer OAuth callbacks use stable environment aliases, not immutable deployment URLs. Providers that require exact redirects cannot be configured with a wildcard. If a customer needs arbitrary preview sign-in, they must register previews explicitly or configure a provider-supported callback relay with validated state and an exact destination allowlist.
- Customer webhook registrations use a stable production or staging alias. A game must implement a server-side receiver before it can accept webhooks; static artifact hosting does not supply that receiver. Do not expose webhook signing secrets in browser configuration.
- SpawnKit's GitHub webhook receiver is `/api/platform/v1/github/webhook` on the environment's `hooks` host. Verify signatures over raw request bytes and preserve delivery deduplication. A local public receiver requires a named tunnel to an explicitly selected local checkout; local loopback URLs cannot receive internet webhooks.
- Telemetry accepts exact configured game origins, including active new and compatibility aliases during migration. It does not allow every customer or preview origin globally.

## Operations

See [platform operations](internal/platform-operations.md) for deployment, migration, and provider configuration requirements. This document defines the domain contract; individual integrations require their own credentials and verification.

References: [Portless](https://github.com/vercel-labs/portless), [Cloudflare custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [certificate coverage](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/), [Google OAuth redirect rules](https://developers.google.com/identity/protocols/oauth2/web-server).

## Migrating local checkouts

Install dependencies and run `pnpm dev:urls` to see the resolved config. `pnpm dev:setup` reuses a compatible shared proxy;
it does not restart it. `pnpm dev:status` lists active routes and `pnpm dev:doctor` diagnoses local setup.

| Configuration | Migration action |
| --- | --- |
| Primary dashboard, API, telemetry, Storybook and E2E domains | Unchanged; existing DNS and exact provider entries remain valid |
| Linked-worktree domains | Replace old hash-bearing entries with the URLs from `pnpm dev:urls`; do not change another active checkout's registrations |
| Staging API origin allowlist | Run `pnpm dev:register` for the checkout and deploy staging services to apply the resulting exact origins |
| Clerk and GitHub redirects | Register the exact new dashboard callback when needed; the package only reports callback URLs |
| Public webhook tunnels | Keep existing named slots with `pnpm dev:hooks --slot <existing-slot>`; provision a new slot only deliberately. New default slots use `primary` or the normalized worktree name |
| Generated games | New output uses the package; existing projects require an explicit dependency/config migration |
| CI and hosted deployments | Existing loopback tests and deployment domains stay unchanged |

Provider credentials, tunnel provisioning, local database setup, and deployment remain Spawn-specific. The package does
not change DNS, provider allowlists, databases, or storage automatically.
