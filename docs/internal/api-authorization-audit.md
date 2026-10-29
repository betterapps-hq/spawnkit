# API and record authorization audit

Reviewed 17 October 2026. This review covers the control API router and its handlers, the dashboard's server/proxy boundaries, the telemetry Worker and its private administration entrypoint, the game-activity entrypoint, game-host delivery, and their database/storage access. It is a source review with regression tests, not a penetration-test certification.

## Findings

No cross-account record-access bypass was found in the reviewed project routes. Authentication precedes the project lookup; that lookup includes both project ID and authenticated owner ID. Child IDs are then constrained to that project. Administrative access is a separate community role and is not inferred from project ownership, request bodies, or UI visibility.

One authorization race was fixed in submission review. The route checked Admin permission before reading and validating media, but its eventual write did not recheck that permission or the current production release. The transaction now requires an active Admin, unchanged review metadata/status, and, for approval, the current ready production release on an enabled, unrestricted project. A stale decision returns 409 without publishing or recording a successful decision.

Review decisions already had a database audit trigger. Their history was missing from Manage, and the older `audit_events` table lacked the append-only triggers used by the newer audit tables. Migration `0021_review_audit.sql` preserves existing events, prevents update/delete, and adds actor/title/before-state snapshots to new review events. Manage combines these review events with moderation history. Database operators can still change schema: these triggers protect normal application operations, not against an account administrator with DDL privileges.

## Route inventory

Paths below are relative to `/api/platform/v1` unless stated otherwise. Unsupported methods do not grant access. An authenticated project owner is not automatically a community moderator.

| Method and route | Identity and record boundary |
| --- | --- |
| `GET /health` (no API prefix) | Public minimal liveness result; no records. |
| `POST /github/webhook` | GitHub HMAC signature over bounded raw bytes; delivery deduplication; installation/repository mapped to an existing connection. No caller-supplied owner grants access. Dedicated hook hosts reject other application routes. |
| `GET /games` | Public approved catalog only; ready/current production releases, enabled environment, and moderation visibility filters. Optional project filter does not bypass publication. |
| `GET /games/:project/feedback` | Public visible-game check; hidden comments excluded; bounded pagination. |
| `GET /games/:project/feedback/me` | Authenticated principal; rating/comment lookup constrained to that principal and game. |
| `PUT, DELETE /games/:project/rating` | Visible game; authenticated user is the stored rating author; value validation and one rating per user/game. |
| `PUT /games/:project/comments` | Visible game; authenticated author, bounded text and server-resolved profile identity. |
| `DELETE /games/:project/comments/:comment` | Comment must match both project and authenticated author. Community removal uses a separate audited route. |
| `POST /games/:project/reports` | Signed-in reporter; visible game/comment target, verified target relation, bounded details, deduplication and admission limits. Caller cannot choose reporter/assignee/state. |
| `GET /me` | Only the authenticated principal's user ID and resolved community permissions. |
| `GET /github/callback` | Authentication plus expiring one-use connection state bound to the same owner/project; installation authorization checked with GitHub. |
| `POST /team/accept` | Signed-in identity with the exact verified invited email; expiring hashed token, pending invitation, active inviter authority, and transaction guards. Token is delivered in a fragment, not a server URL query. |
| `GET /admin/team/members`, `/invitations`, `/history` | Active community team member; invitation links are available only to Admins; responses are private. |
| `POST /admin/team/invitations` | Active Admin; fixed role set, no existing-member duplicate, expiring invitation and transactional audit/outbox. |
| `POST /admin/team/invitations/:id` | Active Admin; resend/cancel only, revision and permission recheck; resend rotates token. |
| `POST /admin/team/members/:id` | Active Admin; role/removal revision checks, last-Admin protection, permission recheck and atomic audit. |
| `GET /admin/submissions` | Active Admin; review records are not public catalog records. |
| `POST /admin/submissions/:id` | Active Admin; approve/reject/unpublish only; transactional status/metadata/permission guard, current-release check for approval, immutable audit trigger. |
| `GET /admin/manage/summary`, `/games`, `/games/:id`, `/comments`, `/history` | Active Admin, Moderator or Observer. Search and pagination are bounded. These roles intentionally have community-wide review visibility. |
| `POST /admin/manage/decisions` | Active Admin or Moderator; restrictions and restoration of restricted games require Admin. Target revision, current role and action are rechecked in the transaction; audit and content change commit together. |
| `GET /admin/reports`, `/admin/reports/:id` | Active team member; includes bounded evidence/history feeds selected by query parameter. |
| `POST /admin/reports/:id` | Active Admin/Moderator, case ownership and revision checks; takeover, restriction and escalated decisions require Admin. Evidence and audit are immutable; related content change is transactional. |
| `GET /projects` | Authenticated owner filter on projects and optional summaries. |
| `POST /projects` | Owner is derived from authentication; cannot claim an existing ID belonging to another account. Configuration is validated; environment records are created transactionally. |
| `GET, PATCH /projects/:project` | Owner-scoped parent lookup; PATCH uses optimistic revision and explicit writable fields. No ownership-transfer field. |
| `GET /projects/:project/state` | Owner-scoped parent; environments, releases, logs, domains, repository and preview queries constrained to that project. |
| `DELETE /projects/:project`, `GET /projects/:project/deletion` | Exact owner only; deletion requires the saved name. Persistent lifecycle fence prevents new writes and reactivation. Cleanup targets only that project's resources and is recorded in append-only audit history. |
| `GET /projects/:project/releases` | Owner-scoped parent; project-scoped rows and bounded cursor. |
| `GET /projects/:project/release-changes` | Owner-scoped parent; both compared releases must belong to that project. |
| `GET, PUT /projects/:project/listing` | Owner-scoped parent; bounded metadata, exact supported enums, current-release/revision checks, validated media; no moderation permission granted. |
| `POST /projects/:project/uploads` | Owner-scoped parent; bounded declared size, fixed archive format, digest and project-scoped idempotency key. |
| `PUT /projects/:project/uploads/:upload` | Owner-scoped parent and upload/project match, expiry, bounded body, exact bytes/digest and archive/path validation before writing a server-constructed R2 key. |
| `POST /projects/:project/deployments` | Owner-scoped parent; ready same-project upload and enabled supported environment, idempotent request, build admission. |
| `POST /projects/:project/promotions`, `/rollbacks` | Owner-scoped parent; ready same-project release, environment compatibility and compare-and-swap current release. |
| `GET /projects/:project/deployments/:deployment` and `.../:deployment/logs` | Deployment lookup includes project ID before status or paginated log access. The common deployment handler applies the same guard to operation aliases. |
| `GET, POST /projects/:project/domains` | Owner-scoped parent; GET constrained to project; POST validates hostname/environment and global hostname uniqueness. |
| `DELETE /projects/:project/domains/:hostname`, `POST .../:hostname/verify` | Domain lookup includes project ID; verification uses the server-generated token. Another owner's hostname cannot be removed or verified. |
| `GET, PUT, DELETE /projects/:project/telemetry/settings` | Owner-scoped parent and valid environment. Service binding receives only server-constructed project/environment and allowed fields; configuration requires enabled environment. |
| `GET, DELETE /projects/:project/telemetry/events` | Same owner/environment boundary; bounded read filters or explicit tenant erasure via private binding. |
| `POST /projects/:project/github/connect`, `.../github/deploy` | Owner-scoped parent; fixed project connection/state, provider authorization, supported runtime and build admission. |
| `POST /projects/:project/previews/:event/close`, `.../:event/retry` | Owner-scoped parent; event lookup includes project ID and PR/environment restrictions. |

## Other entrypoints

| Surface | Boundary |
| --- | --- |
| Dashboard platform proxy | Clerk server session, forwarded server-obtained token, exact route allowlist, same-origin write check and bounded request. Client headers cannot select a principal. The control API independently repeats authentication/authorization. |
| Dashboard server functions and CLI-login configuration | Server-side Clerk authentication for private project data/actions. CLI configuration exposes public issuer/client settings only; redirect/return paths are constrained. |
| Dashboard `POST /api/platform/v1/games/:project/activity` | Explicit same-origin JSON endpoint; IP overwritten from Cloudflare metadata, private GameActivity binding, published game check, bounded body, daily deduplication and rate limits. Anonymous counting is intentional. It is not proof of a unique human. |
| Telemetry public `POST /v1/logs` | Signed, scoped write token, exact configured game origin, key generation/revocation, bounded events and quotas. The token is intentionally shipped to browsers and grants no read/admin permission. Forging analytics with a copied write token remains possible; origin is not identity for non-browser clients. |
| TelemetryAdmin, GameActivity, BuildJob, Sandbox, ContainerProxy | Named Worker/service-binding or Durable Object interfaces, not routes on the default public HTTP handler. Their callers are trusted platform Workers. Deployment permissions must remain restricted because a privileged new binding can access these services. |
| Scheduled builds, GitHub work, maintenance and invitation outbox | Cloudflare scheduler/internal records, not an unauthenticated public trigger. Targets derive from saved project/deployment/invitation records. Resend secrets remain server-side. |
| Game host `GET, HEAD` | Hostname-to-project/release mapping in D1, restriction check before cache/storage/redirect/range response, server-built R2 prefix and path validation. Published game assets are public intentionally; custom hostname input does not grant arbitrary bucket access. |

## Database authorization model

D1 does not provide PostgreSQL-style row-level security here. Worker code is the authorization boundary: owner-scoped parent reads, same-project child constraints, explicit administrative permissions and conditional writes. Foreign keys and unique indexes enforce relationships, not identity. Browser clients never connect directly to D1 or receive bucket credentials.

`projects`, `uploads`, `releases`, `deployments`, logs, environments, domains, hosting mappings, repository connections and preview events follow the owner/project hierarchy. Feedback is scoped to game and author. Public catalog, ratings and comments are explicit filtered projections. Community members/invitations/reports/moderation records are available only through the role-gated administration routes. Append-only audit/evidence triggers and transactional role/revision guards protect moderation writes. Telemetry records live in per-project/environment Durable Objects reached through scoped tokens or trusted administration bindings.

Project ownership is immutable in the current API. Some child writes rely on the immediately preceding owner/child lookup rather than repeating owner ID in every SQL statement. If project transfer is introduced, its transaction and these dependent operations must be redesigned for concurrent ownership changes.

## Verification and limits

The creator review projection was removed on 17 October. Regression checks exercise every review state through both GET and repeated POST, verify admin-owned projects use the same private projection, and confirm the administrative endpoint retains the internal data. No database migration is required for this response change.

Production verification checked 34 records across five owned projects: none exposed internal review fields through the creator endpoint. The authenticated admin endpoint retained its review fields. The read-only check made no review decisions or record changes.

`authorization.test.ts` exercises the real router and migrated SQLite schema with controlled distinct principals: 29 project route/method combinations reject anonymous and cross-owner access before side effects; foreign child IDs, public visibility filters and administrative role boundaries have additional checks. `auth.test.ts` separately checks Clerk verification configuration, authorized parties, OAuth client/subject/expiry/revocation and JWT/OAuth fallback behavior. Provider calls are mocked; these tests do not simulate breaking Clerk signatures or replace a live two-account security assessment.

Submission regression tests change role, metadata, restriction and current release during review and assert no publication or successful audit event. Existing community tests cover role changes, invitation acceptance, stale decisions, rollback and immutable history. Build tests exercise restricted dependency requests, policy ordering, separate media sandboxes and forged derivative rejection. Hosted acceptance results are recorded in the upload-security audit after deployment.

Remaining limits:

- No account-wide retained-storage ledger/reservations or complete release retention policy. A proposed 1 GB free-tier allowance must count retained bytes across an account, separately from upload/build rate limits.
- Near-limit concurrent archive ingestion and memory amplification still need load testing. This pass is not a denial-of-service or decoder-fuzzing assessment.
- Session JWT validation relies on Clerk's signature/expiry semantics; it is not a live session-revocation lookup on every request. CLI OAuth verification includes revocation/client checks.
- DNS through Cloudflare's resolver remains available to build containers even when general Internet access is disabled. Do not call this an air gap. No platform secrets or privileged service credentials are placed in creator builds.
- Database/operator credentials, compromised platform deploy permissions, browser engine vulnerabilities and malicious dependency behavior beyond the enforced sandbox boundary are outside the guarantees of this review.
