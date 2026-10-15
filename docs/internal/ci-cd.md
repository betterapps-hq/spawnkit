# Repository delivery

The private repository is [AndrewCraswell/spawnkit](https://github.com/AndrewCraswell/spawnkit).

## Checks and releases

`CI` runs on pull requests and pushes to `main`: formatting, lint, types, unused code,
configuration tests, coverage, production builds (including Storybook), generated-project
smoke checks, telemetry-package checks, and Playwright desktop/mobile acceptance.
Tests use loopback fixture servers without deployment credentials.
Browser jobs build the CLI and Storybook first, then exercise the packaged stories
instead of waiting for development-time compilation on shared runners.

A passing push to `main` deploys services, app and Storybook to staging, applies pending
D1 migrations, and checks the published app, story index and commit metadata:

- App: https://staging.spawnkit.cloud
- Storybook: https://stories.staging.spawnkit.cloud

Production is manual. In Actions, run **Promote to production** from `main` and supply
the full SHA of a successful staging release. The workflow verifies the successful
main push CI run before deploying that commit to https://spawnkit.cloud and
https://stories.spawnkit.cloud. A previously successful SHA can also be promoted
to roll application code back; database migrations are forward-only and must remain
compatible with the previous application release.

## Pull request environments

Passing, non-draft PRs from branches in this repository deploy:

- `https://preview-pr-N.spawnkit.cloud`
- `https://stories-preview-pr-N.spawnkit.cloud`

The GitHub deployment and job summary provide links. Previews use Clerk development
credentials and shared staging data; they are separate frontend Workers, not isolated
backend databases. PR backend changes are tested by CI but never deployed to the shared
API. Its exact-origin allowlist is updated using trusted `main` code.
Each frontend has an exact Workers route so it takes precedence over the existing
game-host wildcard. Preview deployments do not redeploy or change production services.

Forks and Dependabot PRs run checks without deployment secrets or automatic previews.
Repository writers are trusted to deploy branch code with staging credentials and the
Cloudflare deployment token. Production Clerk credentials exist only in the production
GitHub environment, restricted to `main`. The repository being private does not make
published Storybook or preview URLs private; Storybook serves fixture content.

All releases and cleanup share a queued concurrency group (`queue: max`). Every staging
release, preview update and close event refreshes the registry from all open same-repo
PRs, preserving manual previews such as `latest`. Cleanup deletes only retired
`spawnkit-dashboard-preview-pr-N` and `spawnkit-stories-preview-pr-N` Workers after
checking they have no resource references; it verifies deletion and removes their API
origins. Close events run `main` code, never the closed PR's code. A later reconciliation
also retries cleanup left unfinished by a failed job. Superseded or closed PR updates
fail before deployment. Cleanup marks prior GitHub preview deployments inactive.

## Secrets

Repository Actions secrets:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Dedicated deployment API token, scoped to the SpawnKit account and zone |
| `STAGING_DASHBOARD_ENV` | Contents of `apps/dashboard/.env` (development Clerk keys and CLI OAuth settings) |
| `STAGING_GITHUB_APP_ENV` | Contents of `deploy/.env.github.staging`, only when enabled in `deploy/github.json` |
| `HOSTING_API_TOKEN` | Existing runtime domain-provisioning token from `deploy/.env.domains` |

Production environment secrets:

| Secret | Value |
| --- | --- |
| `DASHBOARD_ENV` | Contents of `apps/dashboard/.env.production` |
| `SPAWN_GITHUB_APP_ENV` | Contents of `deploy/.env.github.production`, only when enabled |

The deployment token needs Workers Scripts edit, Workers KV Storage edit, D1 edit,
Workers R2 Storage edit, and Account Settings read for account
`544b5bfd594cd02a5da4b79a2038cc9f`; Workers Routes edit, Zone read and DNS edit for zone
`2a8126a122d81d58aafe2535a2219e7c` (`spawnkit.cloud`). Container builds remain disabled;
enabling that product requires its permissions and paid account configuration separately.
The existing runtime hosting token is narrower and must not be reused as a deployment token.
Do not store a local OAuth access/refresh token in Actions: use a dedicated API token.
See [Cloudflare CI authentication](https://developers.cloudflare.com/cf/ci/).

The dedicated `SpawnKit GitHub Actions` user token was created and stored in Actions
on October 14, 2026, and expires October 15, 2027 UTC. Rotate it before expiration.
Token listing is unavailable to the local OAuth login, but the user-token creation
endpoint supports issuing the scoped token. No token value is stored in the repository.

GitHub rejected branch protection for this private repository on the current account
plan (Pro is required). CI runs and deployment gates are configured, but GitHub does
not enforce required checks before a writer pushes or merges. Enable required `Verify`
and both `Browser acceptance (desktop)` and `Browser acceptance (mobile)` checks when
branch protection becomes available.

Temporary credential files are ignored, created with restricted permissions and removed
after each job. They are never uploaded as artifacts. Failed browser runs retain traces
for seven days. Actions are pinned to commit SHAs; Dependabot proposes weekly updates.

## Existing database adoption

Before the first automatic release, run `node scripts/migrate.mjs --environment staging --baseline`
and the corresponding production command once. This verifies the actual tables and indexes
against migrations 0001–0008 in an in-memory SQLite database before recording their history.
It does not recreate tables or modify application records. Ordinary releases apply only
pending migrations. A legacy database without history fails with a specific adoption error.

Both existing databases completed this schema-verified adoption on October 14, 2026.
