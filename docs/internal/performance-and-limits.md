# Performance and usage controls

These settings apply to SpawnKit's platform infrastructure, not customer multiplayer pricing. Production and staging have separate Workers, databases, buckets, rate-limit namespaces and build allowances. Settings below were introduced on October 14, 2026; rollout evidence is recorded in platform operations.

## Dashboard requests

Automatic public-page animation enhancements wait for the initial window load, a paint opportunity and browser idle time, and only initialize while visible. This includes animated marketing scenes and lazy 3D/physics imports. Hover previews download only on mouse intent, which starts playback immediately without waiting for unrelated page resources or an extra hover timer. Leaving a card restores its still cover and pauses the video; its decoder and buffer are retained for 30 seconds for fast repeat hovers. Scrolling it offscreen, hiding the tab, or enabling reduced motion releases the player immediately. Touch and data-saving visitors do not download hover previews. Static artwork and links remain available immediately. The root page loader reads only auth configuration; full account profiles are fetched by routes that need them, not by public homepage rendering.

| Setting | Default | Purpose |
| --- | --- | --- |
| Account project list | No interval polling; 60-second freshness | One compact summary request instead of fetching every project's history and logs |
| Selected project | Every 5 seconds only while queued, building or activating | Track a running deployment without polling idle projects |
| CLI deployment watch | Every 3 seconds, at most 30 minutes | Read incremental logs and status; stop on terminal state, interrupt or repeated connection failure |
| Newly submitted GitHub job | Up to 2 minutes of polling while waiting for a deployment record | Cover asynchronous job admission |
| Pending preview without a deployment | Poll only within 2 minutes of its update | Avoid an endless loop for abandoned jobs |
| Window/tab activity | Both visible tab and focused window required | Pause interval requests when switching tabs, minimizing, or using another application |
| Return to selected project | Refresh on mount/focus | Recover changes made while away |
| Failed project queries | Stop interval polling; no automatic retry of 4xx; one retry for other errors | Avoid repeated requests against unavailable or rate-limited services |
| Live telemetry | 10-second interval while viewing the live feed; no background polling | Historical pages and paused feeds do not poll |

TanStack Query's global focus manager combines `document.visibilityState` and `document.hasFocus()` using visibility, focus and blur events. `refetchIntervalInBackground` is false. An already-started request can finish after focus is lost; mutations and explicit user actions are not blocked. In-flight builds continue on the server when the dashboard is closed.

Implementation: `apps/dashboard/src/lib/query-focus.ts`, `project-refresh.ts`, `cloud-projects.ts`, `router.tsx`, and `components/project/telemetry.tsx`. The authenticated `GET /projects?summary=true` response includes only current production/Sandbox summaries. Other API consumers retain the existing list contract.

Build output is streamed from the sandbox process into D1 during execution. Each attempt retains at most 500 nonempty command-output lines and 256 KiB, with 8,192 characters per line and an explicit truncation notice. D1 writes use batches of at most 50 lines. The CLI reads cursor pages of 100, at most ten pages per polling cycle, with three reconnect attempts before reporting how to resume. Stopping a watcher does not cancel a build. Release media warnings are limited to two entries, with at most 512 characters each, and remain outside public artifact manifests.

## Game delivery and caching

| Setting | Value | Behavior |
| --- | --- | --- |
| Edge artifact cache | 24 hours, keyed by hostname, project, release and path | Repeated game requests reuse bytes rather than reading R2 again |
| Environment aliases and all HTML | Browser `max-age=0, must-revalidate` | Promotion and rollback take effect without waiting for browser expiry |
| Non-HTML on immutable deployment addresses | Browser `max-age=31536000, immutable` | Retained releases can reuse already downloaded assets |
| Conditional responses | ETag / 304 | Avoid retransmitting unchanged bodies |
| Transfer compression | Cloudflare negotiates Brotli/gzip/Zstandard for eligible full responses | Decoded files retain their original bytes; byte-range responses keep `no-transform` |
| Private platform responses | `no-store`, including errors | Never put authenticated account/deployment data in shared caches |

The host checks D1 for the current release and enabled environment **before** reading cached bytes. Closing a preview blocks subsequent network requests, including its immutable addresses. Previously downloaded files cannot be revoked from browser caches. Cache eviction or failure falls back to R2. Only successful GET responses populate the cache; HEAD requests do not write entries. Query parameters do not vary static artifact bytes. Cloudflare Cache API storage is local to each data center, not a global prewarmed cache.

This saves R2 reads and transfer, not every Worker invocation: routing still performs a D1 lookup per network request to preserve immediate activation and preview shutdown. No zone-wide “cache everything” rule or paid delivery add-on was enabled. Implementation: `apps/game-host/src/index.ts`.

## Request and execution limits

| Setting | Default per environment | Source |
| --- | --- | --- |
| Authenticated API reads | 120 per owner per 60 seconds | Control API `API_READ_LIMIT` binding |
| Authenticated API writes | 20 per owner per 60 seconds | Control API `API_WRITE_LIMIT` binding |
| Hosted builds per owner | 50 per UTC day, across projects and CLI/GitHub | `BUILD_DAILY_OWNER_LIMIT` |
| Hosted builds platform-wide | 200 per UTC day | `BUILD_DAILY_PLATFORM_LIMIT` |
| Concurrent builder instances | 3 | Control API container configuration |
| Builder size | Basic: 0.25 vCPU / 1 GiB | Control API container configuration |
| Build process timeout | 10 minutes | `src/build-job.ts` |
| Install / build step timeout | 4 minutes each | Build runner |
| Listing cover input / output | 1 MiB / 384 KiB | Platform Sharp processor and independent Worker validation |
| Listing trailer input / output | 2 MiB / 2 MiB | Platform FFmpeg processor and independent Worker validation |
| Trailer encoding | First 8 seconds, 24 fps, 640 pixels maximum side, silent H.264 MP4 | Same reserved build container; 10-second probe / 60-second encode deadline |
| Control API CPU | 1,000 ms per invocation | Control API `limits.cpuMs` |
| Dashboard CPU | 100 ms per invocation | Dashboard `limits.cpuMs` |
| Game host CPU | 50 ms per invocation | Game host `limits.cpuMs` |

Rate limiting happens after authentication and returns HTTP 429 with `Retry-After: 60`. Cloudflare rate-limit bindings are data-center-local and eventually consistent, so these are abuse controls, not exact global billing caps. Signed GitHub webhooks have their existing independent validation; the owner API limiter does not govern their ingress.

Build allowances use one atomic D1 claim before container execution. Failed builds count; duplicate delivery of the same deployment reuses its claim. Both CLI and GitHub jobs use the same code path. A denied queued job records failure without replacing a live release. Allowances reset at 00:00 UTC by date; records are retained for idempotency. Migration `0009_build_budgets.sql` must be applied before deploying the control API. CPU bounds exclude time waiting on network/I/O and are not wall-clock or dollar limits.

### Build queue

Migration `0016_build_queue.sql` adds durable admission shared by CLI and GitHub deployments. A single D1 write selects and reserves each job, capped by the same `BUILD_CONCURRENCY` value used in container configuration (currently three). Waiting releases show Queued. The scheduler favors owners with fewer active reservations, then the owner least recently served; eligible jobs within each account use submission order. Existing jobs are not preempted.

Each reservation is retained until its isolated container is successfully destroyed. Reservations do not expire on a timer, since a timed-out lease could admit a fourth build while the old container remains alive. The build outcome is saved before cleanup; interrupted cleanup retries without rebuilding or releasing capacity early. Completed artifacts release their slot before domain/HTTPS activation waits. A minute sweep recovers accepted-but-undispatched jobs, reserved jobs, and pending activations; completions also dispatch waiting work immediately.

Recognized transient container/RPC/network failures requeue with minimum delays of 30, 60, 120, 240 and 300 seconds, up to six admitted attempts total. A process terminated by SIGTERM (signal 15 or exit 143) also retries unless it hit the configured build timeout. The minute sweep may extend a retry delay by up to one minute. Invalid source, failed build commands and exhausted daily allowances fail without infrastructure retries. Queue waiting and cleanup retries do not consume additional attempts or daily budget claims. Operators should monitor `build_dispatch_pending`, `build_recovery_pending`, reservation age and queue depth. Persistent cleanup failure deliberately holds capacity until cleanup recovers; it must never be fixed by deleting a live reservation blindly.

Apply the migration before deploying the control API, staging first. The migration accounts for already-running deployments and updates waiting release labels. Both publishing and polling retain their existing API contracts. This queue controls build admission; published game delivery remains on the separate game-host/R2 path.

## Billing alert

An existing account-wide **Default budget alert (auto-created)** is enabled with a **$10 total-spend threshold**, verified through Cloudflare's alert policies API on October 14, 2026. It uses the account's existing email recipient; no duplicate policy was created and no personal address is stored here. Policy ID: `4dd70abbb086402ea9f20c3152158521`.

An alert is a notification, not a spending cap. It also covers other projects in this Cloudflare account. The 46.09k requests previously displayed were account billing-period totals, not a measurement of this dashboard alone. Build limits and concurrency bounds reduce exposure but do not cap all account spending.

## Changing or reverting settings

Change checked-in configuration and redeploy through `scripts/deploy.mjs`; do not apply dashboard-only overrides that the next deployment would overwrite. Apply migrations to staging first, verify, then production. Positive integer build limits can be adjusted independently for each environment in the configuration. To stop new hosted builds, disable that environment in `deploy/builds.json` and redeploy; live games remain served. Do not delete quota claims to reset usage during the day.

Cache behavior can be reverted in the host without deleting releases. Old cache entries become unused and expire. Keep private API responses uncached and preserve enabled-environment checks. Review limits when expected usage grows; raising them should follow observed build duration, throttling and spend rather than polling request counts alone.

References: [Cloudflare rate-limit semantics](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/), and [TanStack Query focus manager](https://tanstack.com/query/latest/docs/reference/focusManager).
