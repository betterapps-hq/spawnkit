# Independent telemetry judge review

2026-10-14. Reviewer: a separate LLM reviewer, given the design and existing code, with no implementation responsibility.

Initial verdict: conditional architectural approval, no P0. Must-fix findings:

1. P1: OTLP interoperability: HTTP 408 is terminal; 200 `{}` success; bounded partial-success parsing with no retry; standard Status errors; ignore unknown protocol fields; accept ordinary OTLP without SpawnKit IDs and document weaker deduplication; official SDK integration test.
2. P1: Sanitize direct ingestion independently of SDK, including resource/body/exception/breadcrumb strings. Server routing scope is authoritative.
3. P1: Atomic duplicate lookup, quota accounting and inserts. Duplicates consume no new quota; duplicate-only retries succeed at limit. Mixed batches are atomic; first accepted content for an ID wins.
4. P1: Consent epoch fencing across in-flight completions, immutable capture identity/time, idempotent bounded shutdown, no post-shutdown capture.
5. P2: Optional official log-exporter interface, explicit per-call trace context, resource/scope mapping and dedicated OTLP eventName. No unsupported APM claim.
6. P2: Measurable per-object request/query limits, UTC daily reset, row and byte ceilings, bounded query/grouping window and cleanup work, burst acceptance. Edge rate limits are advisory; object quota is authoritative.
7. P2: Runtime consent/lifecycle in scaffolds, distinguish developer enablement from player consent, warn about rotation/redeployment, fail closed when bindings/secrets are missing.

Resolution contract: implement all seven before final validation. These revise the initial design where it differs. Use a 1-hour default query window (maximum seven days), 60 ingestion requests/minute and 30 reads/minute per object, UTC daily 10,000-new-record quota, 80,000-row hard cap and 640 MiB logical record-byte ceiling. Responses disclose the UTC reset, usage and retention. First-writer-wins deduplication is scoped to the seven-day retained data. Erasure disables the key before deleting records; retain quota counters until UTC reset to prevent delete/reset abuse. Cloudflare PITR may retain recovery copies independently of application deletion.

## Implementation review and resolutions

The independent reviewer inspected implementation after the first seven corrections. No P0/P1 remained; six P2 findings were resolved:

1. NodeNext declaration imports now use `.js`, and every package export is included in the tarball. The scaffold export is generated JavaScript plus declarations so Node can import it without TypeScript stripping inside node_modules. An isolated package installation verifies every entry point and exact vendored SDK identity.
2. Direct OTLP accepts trace IDs without span IDs, numeric or string int64 attributes, and observed timestamps when event timestamps are absent/zero. Regression tests verify preservation.
3. Queue expiration uses enqueue time, independently of historical OpenTelemetry event time. A one-hour-old log remains deliverable when freshly queued.
4. Inactive hosting environments retain telemetry read/disable/erase access. New configuration requires enabled hosting. The dashboard and operations guide explicitly describe the independent lifecycle.
5. Both IP and signed key edge limiters run before expensive routing/storage work; object quotas remain authoritative.
6. Search/grouping uses bounded indexed tenant/time ranges and a stored searchable body. The capacity regression seeds 79,000 approximately 5.5 KiB records, searches/groups them while ingesting a new record, and requires completion within five seconds in the local runtime. It passed. This is evidence for the bounded tier, not a global throughput SLA.

Final independent verdict: **approve the bounded v1**, conditioned on strict timeout regressions and final verification passing. The reviewer found no further production blocker, and explicitly limited approval to the documented quotas, seven-day retention, scalar log attributes and memory-only delivery. The reviewer inspected the live receipt but did not independently rerun the cloud test.

The final lifecycle gate is resolved: explicit abort races bound custom transports and response streams even when they ignore cancellation. Shutdown is idempotent; stalled transport/body regressions pass. Browser error/rejection listeners, pagehide delivery and listener cleanup are also tested. Real alarms remove 2,005 expired records across bounded batches, stop when empty, and preserve usage accounting.

## Executed evidence

- `pnpm verify`: formatting, lint, types, unused analysis, all unit/runtime coverage suites, and production builds passed. The telemetry SDK has 13 tests (90.42% statements, 91.43% lines); telemetry service/control integration has 16 tests. Worker SQLite execution is validated behaviorally in workerd, not counted as Node V8 line coverage.
- `pnpm test:telemetry-package`: clean tarball install, strict NodeNext declarations with `skipLibCheck: false`, Node runtime imports of every export, official OpenTelemetry adapter, and vendored artifact identity passed. Output: `work/spawn-telemetry-0.1.0.tgz`.
- Existing dashboard shell, project studio and logs checks plus telemetry acceptance: 34 desktop/mobile browser checks passed. The final telemetry check was rerun on both viewports after adding erasure and also passed. It sends from a real newly generated browser game through local Workers/SQLite, applies ownership checks, verifies display and redaction, and exercises confirmed erasure. A separate project's preview occupied port 6006; final telemetry browser acceptance used SpawnKit's fresh preview on port 6008.
- `TEMPLATE_CASE=pixi-rapier,phaser-matter,three-rapier pnpm test:templates`: all three standalone projects installed, linted, passed their 90% coverage gates, built and accepted keyboard interaction in Chromium. Evidence: `work/templates-KVnn7x`.
- Deployed telemetry Worker version `331753ec-acab-4c53-8685-46d8aeb42f85`. A scaffolded game reported two records to deployed Cloudflare, owner reads verified persistence/redaction, and the live dashboard component displayed both through the real dashboard proxy. Verification project: `telemetry-256cab08-4b2d-4e09-97a8-785add6fc96d`; receipt and screenshot under `work/telemetry-live-*` / `work/telemetry-cloud-dashboard.png`.

## Recorded executive decisions

No registry credentials or domain choice were needed: distribute the installable tarball and embed the same SDK in standalone scaffolds. Tenant storage uses project/environment isolation in the platform-owned Cloudflare account, matching the product specification. The initial tier is 10,000 new records/day with seven-day retention. Optional larger tiers, source maps, replay, alert delivery and full OTLP traces/metrics remain separately scoped. These decisions and operating procedures are in [Telemetry operations](../telemetry-operations.md).
