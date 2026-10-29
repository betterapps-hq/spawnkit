# Project deletion

Only the project owner can delete a project. Settings requires the exact saved game name. `DELETE /api/platform/v1/projects/:id` accepts `{ "name": "Saved game name" }` and returns HTTP 202 while cleanup runs. The owner's `GET .../:id/deletion` returns `pending`, `retrying`, or `complete`. Repeated requests are idempotent.

Deletion immediately disables every environment, removes its current release, closes repository work, and marks the project as deleting. Database triggers reject new uploads, builds, releases, listing records and environment reactivation. New resource operations cannot start. The dashboard follows cleanup progress and does not report completion early.

## Resource inventory

| Resource | Cleanup |
| --- | --- |
| Build and media containers | Destroy both containers for every build, clear its Durable Object alarms/storage, and wait for running work before releasing queue capacity. |
| Telemetry | Purge both project/environment Durable Object stores, alarms, settings and write keys. |
| Game addresses | Detach the exact project Worker custom domains; remove owned wildcard and local-development DNS records. |
| Certificates | Delete project-specific advanced certificates. Keep shared and universal certificates. |
| R2 files | Delete every object under the exact `sources/{projectId}/` and `releases/{projectId}/` prefixes, including original uploads, every version, covers and previews. |
| D1 data | Remove listings, comments, ratings, view counts, deployments, logs, uploads, releases, environments, GitHub connections, domain records and hosting mappings. |

Shared Workers, buckets, databases, zones and platform infrastructure remain. Deletion does not delete an external GitHub repository, a domain registration, or a customer's independently managed DNS. No per-project paid game-service runtime is currently provisioned; a future runtime adapter must add its cleanup before becoming available.

## Recovery and retention

The deletion job is persisted before any external cleanup. A minute cron retries outstanding work independently of the build queue. Each pass uses an exclusive renewable lease; failures retain the current phase and retry with exponential backoff. Existing resource writes drain before cleanup. A storage write that crosses the deletion boundary removes its own output. The subdomain stays reserved until all cleanup succeeds. Unexpected DNS ownership or a shared certificate stops cleanup for operator review instead of deleting another project's resource.

A minimal project tombstone, the deletion record, immutable audit/report evidence, and time-limited build-budget claims remain. They prevent accidental recreation, preserve moderation accountability, and prevent deletion being used to evade usage limits. Project configuration and metadata are cleared. Tombstones are excluded from the project list. This is resource deletion, not deletion of the owner's account or security audit history.

Operators can inspect `project_deletions.phase`, `last_error`, `attempts` and `retry_at`, and the `project.deletion-requested`, `project.deletion-retry`, and `project.deleted` audit events. Provider details are not exposed as raw UI errors. After correcting a provider issue, another owner deletion request accelerates the retry.

## Validation

SQLite integration tests cover authorization, confirmation, lifecycle fencing, idempotency, failed provider recovery, active writes/builds, multi-page storage deletion and neighboring-project isolation. The telemetry runtime test verifies old write keys remain invalid after purge and object eviction. Desktop/mobile acceptance tests cover confirmation, failed requests, retrying cleanup and completion.
