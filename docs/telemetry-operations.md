# Telemetry operations

Implemented 2026-10-14. [Design](telemetry-design.md), [SDK API](../packages/telemetry/README.md), [independent judge review](internal/telemetry-judge-review.md).

## Add to a game

```sh
pnpm cli init ../my-game --template pixi --telemetry platform --with vitest
```

This creates a standalone local dependency at `vendor/spawn-telemetry`; it does not require a registry release or this monorepo at runtime. Other supported renderers use the same adapter. For an existing application, build and pack `packages/telemetry`, then install the resulting tarball with your package manager. The `spawn add` module-upgrade workflow does not yet install telemetry into existing generated projects.

Open the project's dashboard Analytics → Telemetry setup. Enter exact origins, including protocol and port; localhost HTTP is accepted for development. Configure ingestion and copy the returned public environment values into the game's ignored `.env`. Keys are shown only once. They are signed write-only configuration scoped to that project and environment. Rotation immediately invalidates the previous key; update all clients and rebuild/redeploy. Origin checks constrain browsers but cannot authenticate a server client holding the public key.

Call `setTelemetryConsent(true)` under the application's consent/collection policy. `initializeTelemetry` starts with capture denied. Use `track`, `captureError`, `flushTelemetry` and `shutdownTelemetry` from the generated adapter. For measurements, breadcrumbs, context or OpenTelemetry export use the installed SDK directly. Both production and sandbox have isolated storage/configuration.

## Cloudflare resources and rollout

Tenant means a project/environment in SpawnKit's platform-owned Cloudflare account, following the current platform specification. Each has a SQLite Durable Object in the `spawn-telemetry` Worker. The dashboard's existing authenticated proxy calls `spawn-control`; after Clerk identity and project ownership checks, the control Worker uses the service-binding-only `TelemetryAdmin` entrypoint. Public `/v1/logs` can only ingest; no public read/admin endpoint exists.

The checked-in `cloudflare.config.ts` binds the object class, edge rate limiter, public endpoint and secret signing key. `apps/control-api/cloudflare.config.ts` binds `TELEMETRY` to `spawn-telemetry` / `TelemetryAdmin`. Use the cf CLI:

```sh
pnpm --filter @spawn/telemetry build
pnpm --filter @spawn/telemetry-worker exec cf deploy
pnpm --filter @spawn/control-api exec cf deploy
```

First deployment requires a cryptographically random signing secret (at least 32 bytes). Supply `SIGNING_KEY` through cf's secret provisioning or an ignored, short-lived secrets file passed to `cf deploy --secrets-file`; delete that file immediately after successful provisioning. Never store it in source, logs, generated games or dashboard configuration. Normal deployments preserve the existing secret. Changing it revokes every tenant key; coordinate a reconfiguration/redeployment campaign if emergency rotation is required. Update `SPAWN_TELEMETRY_PUBLIC_ENDPOINT` when deploying under another hostname/account. The current deployed ingestion URL is `https://spawn-telemetry.hoa-preview.workers.dev/v1/logs`.

Telemetry is independent of game hosting. Disabling a hosted environment does not revoke telemetry from already shipped clients. Its existing data remains readable and can be disabled or erased even when hosting is inactive; a new key requires an enabled environment. Use Telemetry setup → Disable ingestion to stop collection. Erasure disables ingestion and deletes application-visible records while retaining current UTC quota accounting. Existing provider recovery copies follow Cloudflare PITR retention; application erasure is not a promise of immediate backup erasure.

## Limits and operating signals

- Per project/environment: 10,000 new records per UTC day, 60 ingestion requests/minute, 30 administrative/read requests/minute, seven-day received-time retention, at most 80,000 rows and 640 MiB of logical record JSON. SQLite indexes and duplicated searchable columns add overhead beyond that logical byte limit.
- Public ingress: edge rate limiting per source IP and signed project key, 120 requests/minute each. These distributed edge limits are advisory; Durable Object quotas are authoritative. Bodies are streamed with a 48 KiB bound, at most 20 records, 8 KiB per normalized record. Valid signatures are required before selecting a tenant object.
- Quota/rate limits return 429 with Retry-After, invalid whole batches return 4xx, accepted batches return 200 `{}` after persistence. Stable `spawn.event.id` deduplicates retry batches without charging duplicates. Generic OTLP clients without IDs may duplicate retries.
- Queries default to one hour, accept up to seven days, and return at most 100 records/page. Search/grouping stays within that tenant and window. Polling is every ten seconds and stops for older pages or when paused. The dashboard shows errors, stale data, limits and empty states explicitly.
- Expired rows are hidden immediately, cleaned in batches of 1,000 by alarms and during ingestion, and storage counters are decremented transactionally. Alarms reschedule while records remain. Logical storage ceilings provide backpressure if cleanup lags.
- Worker observability is enabled with 10% trace sampling. Inspect request error/429 rates, latency, Durable Object storage and invocation trends in Cloudflare. Application failure logs include error types only, never payloads or write keys. No notification/alert delivery service is configured by this package.

Sampling rates and quota usage refer to admitted records; dropped/sampled records are not a reliable measure of total player activity. Delivery is bounded and best effort, with no durable browser offline queue. This release is operational game logging, not full Sentry/PostHog feature parity: replay, profiles, source-map symbolication, feature flags, OTLP spans/metrics and alert delivery are deferred.

## Verification

`pnpm verify` includes SDK, templates, CLI, dashboard and real workerd/SQLite tests. `pnpm test:telemetry-package` builds and installs a tarball into an isolated project, type-checks all exports with NodeNext and no skipped declaration checks, runs the official log adapter, and verifies vendored SDK identity. `pnpm exec playwright test tests/telemetry.spec.ts` generates and installs standalone games, emits events/errors from Chromium, and verifies authenticated dashboard display and confirmed erasure on desktop and mobile. Only test identity verification is substituted; the ownership lookup, control route, ingestion handler, SQL persistence and dashboard component are real. Fixtures are retained under ignored `work/` because Windows locks native Vite modules during test processes.

Runtime tests exercise the official OTLP/HTTP exporter, persistence after object eviction, key rotation, invalid origins/scopes, direct payload redaction, quota and duplicate transactions, seven-day queries, and near-capacity searches alongside ingestion. The current installed local workerd binary supports compatibility date 2026-10-13; local tests use that date while Cloudflare deployment uses 2026-10-14.

Storybook uses `https://stories.local.spawnkit.cloud`; browser acceptance starts its own isolated `https://stories.e2e.local.spawnkit.cloud` instance. All suites read the shared test-origin helper. Set `SPAWN_E2E_STORIES_URL` only when explicitly testing an already-running or deployed instance. Portless assigns backend ports, preserving other projects' servers.

The live verification project is `telemetry-256cab08-4b2d-4e09-97a8-785add6fc96d` (Telemetry verification). On 2026-10-14 a scaffolded browser game sent an event and an error to deployed Cloudflare, the owner API read persisted/redacted records, and the production dashboard component rendered them through the real dashboard proxy. The local receipt and screenshot are in `work/telemetry-live-receipt.json` and `work/telemetry-cloud-dashboard.png`. Data expires normally after seven days; the project remains available for inspection.

## Decisions for later review

The seven-day/10,000-record tier is an engineering default pending product pricing. Larger tenants need a measured sharding/analytics tier rather than raising caps without load tests. Registry publication and a production telemetry hostname can follow independently. Automatic relationship to hosting shutdown, longer retention, symbolication and alert policies need explicit product decisions; no owner input was needed for this bounded release.
