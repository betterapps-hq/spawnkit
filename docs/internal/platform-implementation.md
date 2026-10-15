# Platform implementation ledger

Updated 2026-10-14. Work in progress; provisioning does not establish completion.

## Ownership

- Control API, storage, builds, dashboard integration and provider configuration: main session.
- CLI upload and release commands: Build CLI project scaffolding session. Its accepted HTTP contract is in cli-platform-handoff.md.
- Multiplayer runtime provisioning and billing remain deferred.

## Engineering decisions

- Use Cloudflare Workers for the control service, D1 for project and release records, and a private R2 bucket for source and immutable artifacts.
- Project ownership is checked server-side on every operation. Clerk browser sessions and CLI OAuth tokens require their respective supported verification paths.
- Game source never receives provider credentials. Builds run in isolated platform containers with bounded resources and fresh per-build filesystems.
- Release activation changes an environment pointer using an expected predecessor. Promotion and rollback reuse artifacts; neither rebuilds source nor reverses database migrations.
- Sandbox is the canonical staging name. Each project has one optional Sandbox and one production environment. Pull-request previews are separately identified.
- Existing browser projects must be imported idempotently after authentication, retaining their IDs and leaving the local backup intact.
- Use the dedicated `spawnkit.cloud` zone for SpawnKit. Other products' zones must remain untouched. Managed game addresses and immutable deployment addresses are documented in the operations runbook.
- GitHub integration must use a dedicated application and scoped installation permissions; personal CLI credentials are not a production service credential.

## Provisioned resources

- D1: spawn-control, 42c76813-8fd1-4831-9500-5155eb1dab20, western North America.
- R2: spawn-platform-artifacts, private, western North America.
- Control Worker: https://spawn-control.hoa-preview.workers.dev. Health and authenticated CLI project listing verified; one existing project migrated.
- Game hosts: spawn-game-01 through spawn-game-04 under hoa-preview.workers.dev. Slots 01/02 serve the Platform verification project's production/Sandbox; 03/04 are available. Each environment receives its own origin; slots are never reassigned across projects.

## Account integration status (updated after paid activation)

- The owner enabled Workers Paid. Staging and production container applications are deployed, each capped at three concurrent builders. This account subscription is shared platform infrastructure, not a subscription per customer.
- Hosted builds are enabled through `deploy/builds.json`, independently of GitHub enablement. Local development defaults to disabled. Explicit environment-variable overrides remain available for operational disablement.
- Staging uses `spawn-build`; production uses `spawnkit-build`. Separate Durable Object namespaces prevent one deployment from moving the other environment's builder application.
- Named game domains and provisioning now use the dedicated hosting token and configuration documented in the operations runbook. Numbered hosts remain compatibility aliases.

## Acceptance checklist

- [x] Authenticated project persistence and migration from browser storage.
- [x] Source upload validation, isolated builds, logs and static hosting.
- [x] Immutable releases, atomic promotion and rollback with concurrent-update protection.
- [ ] Domain setup before deployment, ownership verification and routing.
- [ ] GitHub connection, branch deployments and pull-request preview lifecycle.
- [x] CLI contract integration and live staging end-to-end deployment verification.
- [x] Repository checks and dashboard acceptance checks.

## Verification completed

- Full `pnpm verify` passes: formatting, lint, types, unused-code checks, coverage suites and all builds.
- Control API: 44 tests pass, including actual SQLite transactions, superseded activations, closed/newer pull-request protection, branch commit pinning and preview-origin promotion after Sandbox.
- CLI: 85 tests pass in its owning session, including upload key limits, stable retry keys, release pagination and deployment URL output.
- Dashboard: 18 desktop and 18 mobile checks pass across project navigation, creation, domains before deployment, Sandbox setup, release operations, previews and logs. Storybook builds successfully and its fixture controller is isolated from live service calls.
- Live API: authenticated project operations, revision conflicts, upload validation/idempotency, stable release numbering, domain intent creation/removal, promotion, rollback and Sandbox activation pass.
- Real PixiJS artifacts built in the intended Docker image locally are served by the cloud game hosts. This does not count as hosted container execution.
- Subsequent hosted acceptance is complete: source upload, real Cloudflare container execution, game hosting, immutable URL, browser interaction, promotion/rollback, and failure isolation. The CLI session independently deployed through the same service. See the dated hosted-build section of `platform-operations.md` for exact IDs, current checks and remaining acceptance boundaries.

## Remaining integration work

1. Staging CLI acceptance is complete; production-authenticated acceptance remains to be run with production credentials. The exact CLI harness scope is recorded in `cli-platform-handoff.md`.
2. The production GitHub App is configured and enabled. Connection, webhook validation, branch builds, preview rebuild/close and dashboard actions are implemented; live webhook-driven game preview creation still needs acceptance verification.
3. Arbitrary customer-owned domains need end-to-end verification separately from the working managed SpawnKit game domains.
4. Production dashboard and Clerk are deployed at `spawnkit.cloud`. Authenticated production build acceptance remains separate from staging: development OAuth credentials must not be accepted by production.

See [platform operations](platform-operations.md) for the exact setup and deployment procedure. The Platform verification project is deliberately retained for the next hosted-build acceptance run; it is separate from the user's existing project.

## Questions retained for owner

- No owner decision is required for the build activation completed here. Google sign-in publication is tracked by the domain/auth setup session; it does not block hosted builds.
