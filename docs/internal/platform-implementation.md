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
- The only existing Cloudflare zone belongs to another product. Do not change its DNS. Use generated Workers addresses until the SpawnKit domain is selected.
- GitHub integration must use a dedicated application and scoped installation permissions; personal CLI credentials are not a production service credential.

## Provisioned resources

- D1: spawn-control, 42c76813-8fd1-4831-9500-5155eb1dab20, western North America.
- R2: spawn-platform-artifacts, private, western North America.
- Control Worker: https://spawn-control.hoa-preview.workers.dev. Health and authenticated CLI project listing verified; one existing project migrated.
- Game hosts: spawn-game-01 through spawn-game-04 under hoa-preview.workers.dev. Slots 01/02 serve the Platform verification project's production/Sandbox; 03/04 are available. Each environment receives its own origin; slots are never reassigned across projects.

## Account integration status

- Workers Paid is required for Cloudflare Containers. Current account has R2 Paid but Workers Free. Public plan catalog confirms a $5/month base fee plus usage.
- Attempted required Workers Paid activation under the user's autonomous cloud setup authorization. Cloudflare rejected the billing mutation with 403; no subscription was created. Asked the owner asynchronously to enable it and continued implementation.
- Build container image passes the Cloudflare deployment dry run. Live container rollout remains gated by that account setting. Build submission stays explicitly unavailable until enabled, rather than accepting jobs that cannot run.
- Creating account-owned API tokens is also unavailable to the current OAuth login. Initial isolated game hosts are provisioned by CLI; control service allocates existing host slots without storing broad account tokens.

## Acceptance checklist

- [x] Authenticated project persistence and migration from browser storage.
- [ ] Source upload validation, isolated builds, logs and static hosting.
- [x] Immutable releases, atomic promotion and rollback with concurrent-update protection.
- [ ] Domain setup before deployment, ownership verification and routing.
- [ ] GitHub connection, branch deployments and pull-request preview lifecycle.
- [ ] CLI contract integration and live end-to-end deployment verification.
- [x] Repository checks and dashboard acceptance checks.

## Verification completed

- Full `pnpm verify` passes: formatting, lint, types, unused-code checks, coverage suites and all builds.
- Control API: 44 tests pass, including actual SQLite transactions, superseded activations, closed/newer pull-request protection, branch commit pinning and preview-origin promotion after Sandbox.
- CLI: 85 tests pass in its owning session, including upload key limits, stable retry keys, release pagination and deployment URL output.
- Dashboard: 18 desktop and 18 mobile checks pass across project navigation, creation, domains before deployment, Sandbox setup, release operations, previews and logs. Storybook builds successfully and its fixture controller is isolated from live service calls.
- Live API: authenticated project operations, revision conflicts, upload validation/idempotency, stable release numbering, domain intent creation/removal, promotion, rollback and Sandbox activation pass.
- Real PixiJS artifacts built in the intended Docker image locally are served by the cloud game hosts. This does not count as hosted container execution.

## Remaining integration work

1. Account owner enables Workers Paid. Then deploy with `SPAWN_ENABLE_BUILD_CONTAINERS=true` and run the full CLI-to-hosted-build acceptance path. Current CLI billing mutation returned 403; Containers still returns the explicit paid-plan requirement.
2. Register/install the dedicated GitHub App and provide its five secrets; deploy with `SPAWN_ENABLE_GITHUB=true`. Connection, webhook validation, branch builds, preview rebuild/close and dashboard actions are implemented, but live GitHub delivery has not been verified.
3. Select a SpawnKit domain and configure custom-hostname routing/TLS. Domain creation and TXT verification are implemented; active routing is not claimed.
4. Production dashboard hosting and production Clerk origins must be configured together. The current dashboard remains at the local development URL, using the live control API.

See [platform operations](platform-operations.md) for the exact setup and deployment procedure. The Platform verification project is deliberately retained for the next hosted-build acceptance run; it is separate from the user's existing project.

## Questions retained for owner

- Which domain should SpawnKit use? No unrelated existing domain will be repurposed.
- Production Clerk application/domain and GitHub App installation may require account-owner configuration. Keep the integration code and local development path independently testable.
