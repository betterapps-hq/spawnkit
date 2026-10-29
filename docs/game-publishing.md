# Game publishing

## Game image optimization and readiness

Hosted builds automatically attempt lossless PNG recompression in the separate trusted media job. Up to eight PNGs, at most 4 MiB each, are eligible; listing media is handled separately. Pixels, PNG filters, metadata, dimensions and file paths are preserved. Animated, corrupt, oversized or non-improving inputs stay unchanged. Decompression is bounded to 64 MiB and the whole media job retains its 100-second timeout. Game images over 512 KiB produce a build-log notice; compression is not a promise that every image will become small.

For large decorative backgrounds, explicitly encode WebP/AVIF in the game source and update references. Keep the original outside the public build directory. Do not apply lossy conversion to masks, normal maps or data textures without validating the game.

Games may send `window.parent.postMessage({ type: "spawnkit:ready", version: 1 }, "*")` after required assets are decoded, controls are installed and the first playable scene has rendered. This message contains no secrets. Receivers must verify both the exact game origin and the iframe's `contentWindow`; a document load or canvas alone does not satisfy the contract. Send once per document. Orchard Snake implements this contract and passes desktop/mobile gameplay checks. The SEO lab audit records the first verified signal relative to parent navigation; games without a signal remain unknown. This is game-reported readiness, not independent proof that arbitrary uploaded game code works, and it is not field INP.

## Cover delivery and rankings

Media processing problems are saved with each release, not only in transient console output. A successful deployment can include `mediaWarnings` for an omitted cover or trailer. The CLI prints the reason and game/dashboard URLs; the dashboard shows the warning on version details and the current production overview. Explicitly configured missing or unsafe paths also produce warnings. Absent optional default files are silent. Creators are told to update the file and deploy again; no submission or approval information is exposed in these results.

Listing media processing is owned by the platform, not the submitter or CLI. After the game build, before upload/activation, hosted builds convert listing covers (PNG, JPEG, WebP and SVG) into a content-addressed, single-frame WebP derivative, at most 960 pixels on either side and 384 KiB. Quality is 80; oversized output gets one additional attempt at 640 pixels. Originals and game textures remain unchanged. The build output manifest points to the derivative; the developer's source manifest is not rewritten. Cover input is capped at 1 MiB (1,048,576 bytes) and 16,777,216 decoded pixels, with a 10-second timeout per encoding attempt. Source uploads and expanded source/build artifacts are capped at 20 MiB. Invalid or oversized covers get a placeholder, never an original-image fallback.

Trailer input is capped at 2 MiB (2,097,152 bytes). The platform-owned FFmpeg/FFprobe installation in the build image converts MP4/WebM to a silent H.264 MP4 of the first eight seconds, at 24 fps and at most 640 pixels on either side without upscaling. It strips audio, subtitles, chapters and source metadata, places MP4 metadata first (`faststart`), uses CRF 28 with a 768 kbit/s peak rate, and enforces a 2 MiB output ceiling. Inputs must have one supported video track (H.264, VP8, VP9, AV1 or HEVC), duration up to 60 seconds, sides up to 4096 and at most 8,294,400 pixels. Probing has a 10-second deadline; encoding has a 60-second deadline and one encoding thread. Both use a restricted local-file protocol/demuxer set, bounded command output and allocation size. Processing stays inside the existing three-slot build queue. Oversized, invalid, timed-out or failed media is omitted with a build-log warning while the playable game can still deploy. Source recordings and non-listing assets remain unchanged.

The control API independently checks actual stored media bytes and content-addressed names before accepting a listing or approving an older submission. Cover checks include size, content hash, WebP container/frame dimensions and absence of animation. Trailer checks require a bounded nonfragmented MP4 with metadata before media, one H.264 video track, no external data references, at most 640-pixel dimensions and eight-second duration, and bounded frame counts/rates. Raw trailer paths cannot bypass processing through the manual submission endpoint or an older pending approval. These structural/resource checks do not fully decode media or guarantee codec safety. Already-deployed releases are not automatically reprocessed; an operator can upload validated derivatives and update listing references without rebuilding the game.

The homepage monthly podium ranks approved playable projects by deduplicated views over today and the previous 29 UTC dates. Ties use title then project ID. Daily aggregates survive visitor-record expiry and release changes. Migration 0015 safely seeds lifetime totals only for projects created on the same UTC day as the migration; earlier undated totals cannot be reconstructed. Lifetime counts remain available on ordinary cards.

Implemented October 15, 2026.

Every successful production activation automatically queues its immutable release for homepage review, including CLI builds, GitHub builds, promotions and rollbacks. Sandbox, previews, failed builds and superseded activations are excluded. The submission is inserted in the activation transaction; retries preserve existing review decisions. Migration `0012_automatic_submissions.sql` queues existing live production games once without approving them.

**Submissions** is the single administrator-only review queue in the dashboard sidebar (`/dashboard/submissions`). Games enter it automatically after production deployment; creators have no submission page or manual submit action. The queue uses the dashboard shell, shared controls and theme tokens.

Every new CLI and downloadable template includes `spawnkit.config.ts`, a local typed `defineConfig()` helper, a Vite listing plugin, and an original 1280×720 editable cover at `public/media/cover.svg`. The config contains `title`, `description`, `genre`, `dimension`, `coverPath` and optional `trailerPath`. TypeScript checks required fields and enum values; runtime validation checks text lengths and media paths. The plugin adds `schemaVersion: 1` and emits `dist/spawnkit.config.json`. A conflicting public JSON listing fails the build instead of being silently overwritten. Generated projects need no private workspace packages.

Kits detect either `spawnkit.config.ts` or `spawnkit.config.json` at the project root; choose one format. The build emits `spawnkit.config.json`, which releases and uploads use. Genres use the shared vocabulary; Arcade is the initial choice. Dimension defaults to 2D for PixiJS/Phaser and 3D for Three.js/Babylon. Paths omit `public/` and leading slashes. The CLI parses literal media settings without executing TypeScript config/imports, checks included public files before reading or uploading large assets, and rejects covers over 1 MiB or trailers over 2 MiB. Dynamic settings and build-generated files are explicitly deferred to hosted validation. The server remains authoritative. Projects without a listing use project-name defaults; runtime metadata is bounded to 4 KB and unknown classification values remain unset.

Media processing currently shares the build sandbox. Byte and container validation bounds homepage assets, but does not cryptographically prove an uncompromised encoder produced them. See the [upload security audit](internal/game-upload-security-audit.md) for the separate media-job recommendation and browser/domain boundaries.

The admin queue is a grid of pending games with a cover, title, Approve and Reject buttons. Only the latest submission per game is shown; older records and decisions remain in history. Approval and rejection need no note. The unpublish API still requires a note. Every review/list API request enforces the administrator role; navigation visibility is not an authorization boundary. 

Approval atomically supersedes a project's previous listing and publishes the new one. The database permits only one approved release per project. Review changes record the actor, timestamp and note, and create audit events. Pending submissions and review notes never appear in the public catalog.

The homepage merges approved games into the main Browse games catalog with the same card styling, search, sorting and random-game selection. There is no separate community section. Cards and game pages show configured genre/dimension and real view, rating and comment totals. Genre, dimension, rating and review-count filters use saved data. `/play/<project-id>` immediately mounts the currently approved game; the game owns its Start control. Games run in a sandboxed iframe on their separate immutable deployment origin, with scripts, same-origin game storage, fullscreen and gamepad capabilities. Top-level navigation, popups, forms, microphone and camera access are not granted. Fullscreen targets only the game stage, excluding the platform toolbar. There is no Close game action. The full-page game URL remains available. No game script is imported into the dashboard origin.

Approvals reference a retained release and deployment hostname, not a mutable production URL or a creator-provided URL. Later deployments do not silently change the approved bundle. Disabled environments and unavailable releases disappear from public discovery. External resources that a game itself loads are not frozen by release pinning.

## Optional public game facts

The listing config accepts a `details` object with `objective` (300 characters), `controls` (300), `devices` (160), `creator` (100) and an optional curated `kitId`. These are creator-provided facts, not platform-inferred claims. The same fields can be managed in project listing settings, using the existing ownership, revision and override/reset behavior. New submissions retain their details for review; public pages show only facts from the approved record.

Source links require all of `sourceUrl` (HTTPS, up to 300 characters, no embedded credentials), `sourceLicense` (up to 100 characters) and `sourcePermission: true`. The settings form requires a license and permission when a URL is supplied. Invalid optional facts are omitted by server normalization. The server does not fetch source links. Public links carry `ugc nofollow noopener noreferrer`; the declared license does not imply platform verification of ownership.

Migration `0022_game_details.sql` adds the two details columns and must precede the updated API. Existing games start with empty details; no author, device support or permission is backfilled. Related games use actual approved discoverable records; related kits require a known kit ID.

The full catalog is at `/browse`, independent of the homepage's newest-100 feed. It has 24 games per page and crawlable previous/next links. Category pages become eligible only with five approved discoverable games of that genre; sparse categories return 404 and are excluded from sitemaps.

## Operations

Apply `0010_game_submissions.sql` before deploying the control API, then deploy the dashboard. `platform_admins` contains trusted Clerk user IDs provisioned by an operator directly through D1. There is deliberately no public role-assignment endpoint and no client-editable metadata role. The owner of the existing Snake project was provisioned as the initial production reviewer. Remove a user's row to revoke review access.

Endpoints:

- `GET /api/platform/v1/games[?project=<id>]`: public approved listing; the homepage returns up to 100 newest approvals.
- `GET /api/platform/v1/games/browse?page=1[&genre=Arcade]`: complete public inventory, total count, stable project-ID ordering and eligible category counts.
- `GET /api/platform/v1/games/sitemap?page=1`: approved discoverable inventory in 1,000-record shards, with category eligibility on the first shard.
- `GET /api/platform/v1/me`: authenticated review capability.
- `GET|POST /api/platform/v1/projects/<id>/submissions`: owner-only history and submission of the current production release.
- `GET /api/platform/v1/admin/submissions`: latest submission per game, pending first; up to 100 games. The review grid shows pending entries only.
- `POST /api/platform/v1/admin/submissions/<id>`: `{ action: "approve" | "reject" | "unpublish", note: string }`.

Creators supply relative `coverPath` and `trailerPath` in their source listing. The hosted build converts both before upload. The owner submission API accepts only validated derivative paths from that deployed release: `spawnkit-cover-<hash>.webp` (384 KiB maximum) and `spawnkit-trailer-<hash>.mp4` (2 MiB maximum). It validates actual stored bytes, release ownership, existence and paths. URLs are constructed from the immutable deployment hostname. SVG source artwork is rasterized; submitted SVG files are not served as listing covers. Admins review the artwork and clip with the game.

The leading monthly cover loads eagerly at high priority. Other covers use lazy, low-priority images. Both monthly bento cards and regular catalog cards share the same preview link and request a muted looping video only on mouse hover. Explicit hover starts loading immediately, without waiting for window load or idle time. Moving away pauses playback and restores the cover, retaining the buffered player for 30 seconds for fast repeat hovers. Scrolling out of view, hiding the tab or enabling reduced motion releases it immediately. Touch devices open the game directly. Reduced-motion and data-saving preferences suppress hover playback. There are no preview buttons. Failed videos leave the cover and game link available. The game host serves video MIME types and byte ranges without caching partial bodies as full files. The queue remains capped at 100 records; pagination/search and direct media uploads are future work. Only approved hosted releases appear in discovery. Every card uses its project’s real activity totals. The player mounts the game immediately; its fullscreen target excludes the platform toolbar. There is no platform launch screen or Close game action.

For card previews, use a short clip that starts on active gameplay, with no title screen, countdown or fade. A source manifest can reference `media/gameplay-preview.mp4`; the hosted build rewrites its output listing to the platform derivative. Automatic compression and duration limits do not identify title screens or choose gameplay highlights. Review the clip's opening before deployment.

## Verification

Control API tests exercise ownership, admin authorization, production eligibility, retry deduplication, rejection, unpublishing, audit records, stale decisions and replacement of approved versions. Desktop and mobile Playwright stories exercise automatic submission status, dashboard navigation and themes, preview loading/removal, approval confirmation and required review notes. Full `pnpm verify` passes in the isolated deployment checkout.

## Viewport contract

Games must own the iframe viewport: `html` and `body` fill its width and height, have no margin, and do not scroll. Their layout must fit controls and canvas within that space, not merely hide overflowing content. Snake uses a full-height grid with a fixed HUD/control row and a shrinkable playfield; its square board scales to the smaller playfield dimension. There is no outer card or page padding.

The host uses an explicitly sized stage and an absolutely positioned, borderless iframe filling it. Fullscreen expands the player through the browser Fullscreen API and recalculates the available game viewport; Escape or Exit fullscreen restores the embed. When the API is unavailable, Open game remains available. Cross-origin host CSS cannot repair a game's internal layout: viewport fit belongs in the game and should be checked before approval.

This follows the documented HTML5 embedding model used by [itch.io](https://itch.io/docs/creators/html5): iframe hosting, embed dimensions or fullscreen launch, optional fullscreen controls, and responsive game content. Merely suppressing scrollbars can clip content and is not a layout fix.

## Game activity

Migration `0013_game_activity.sql` stores aggregate views and plays in Cloudflare D1. Each visible published-game page records one view; Play and Open game record launches. Cards, previews, iframe loads and SSR/prefetches never record views. A static game URL opened directly is outside these portal counters.

An anonymous identifier in first-party local storage survives refreshes and tabs, and renews after 24 hours without activity. If storage is unavailable, counting is skipped. The database retains a SHA-256 game-specific visitor hash and the last accepted time per event kind. A conditional UPSERT plus SQL triggers increments totals atomically, at most once per game/visitor/kind in 30 minutes. Duplicates do not extend the window. Scheduled bounded cleanup removes expired visitor hashes while retaining totals. Counts persist across approved release changes; unpublished or disabled games reject events.

The dashboard's same-origin `POST /api/platform/v1/games/<id>/activity` uses the private `GameActivity` service binding, so callers cannot reach the counting handler directly on the public control API. It accepts only JSON with a browser Origin matching the dashboard. The trusted proxy supplies the network IP for transient rate limiting; raw IPs and visitor identifiers are not stored. Rate limiting is abuse reduction, not proof of distinct humans; clearing storage or using another browser can count as a new visitor.

`GET games` includes views and plays. Cards display views, and Popular sorts by views. Published play pages show both counts and refresh them after successful event responses. Creator overview displays all-time portal totals separately from hosting request metrics. Failures never block gameplay or optimistically increment counters. Ratings without reviews display `0`, not `0.0`.

Local recording requires the Workers runtime and a control service with the GameActivity binding. Normal Vite development returns an unavailable result without breaking the game; Storybook/browser acceptance intercept activity requests with fixtures.

## Ratings and comments

Migration `0014_game_metadata_feedback.sql` adds listing classifications and Cloudflare D1 tables for real community feedback. Each signed-in account has one 1–5 star rating and one editable comment per game. Repeat saves update the existing record. Feedback belongs to the project and survives release changes. Authors can remove their rating/comment; platform administrators can hide and restore comments through Manage. Comments are plain text (1–2000 characters), use a server-verified username or first name, and never expose email addresses or account IDs. Signed-out visitors can read comments and totals. Unpublished/unavailable games reject feedback requests. Mutations use the existing authenticated API write limiter and same-origin dashboard proxy.

- `GET /api/platform/v1/games/<id>/feedback[?cursor=…]`: public totals and 20 comments per page, newest first.
- `GET /api/platform/v1/games/<id>/feedback/me`: authenticated personal rating, comment and moderation capability.
- `PUT|DELETE /api/platform/v1/games/<id>/rating`: save `{ rating: 1…5 }` or remove the caller's rating.
- `PUT /api/platform/v1/games/<id>/comments`: create/update the caller's `{ body: "…" }`.
- `DELETE /api/platform/v1/games/<id>/comments/<comment-id>`: author removal only. Admin moderation uses the audited Manage actions below.

Catalog totals are computed from saved rows, not browser drafts. The existing rating-panel/comment-list design includes empty/loading/error states, sign-in return navigation, editable stars, comment editing and confirmed deletion. Failed saves retain input. No-review ratings display `0`. SQL tests exercise validation, aggregates, pagination, privacy and ownership; `tests/game-feedback.spec.ts` verifies posting/editing/deleting, failed saves, signed-out behavior and discovery filters on desktop/mobile.

## Community moderation

`/dashboard/manage` is the live administration page. Navigation is visible only to platform administrators, and every moderation API request independently checks `platform_admins`. The existing Submissions page handles release approval; Manage searches deployed projects and their comments, filters their states, and records moderation decisions. Reports, assignments and the proposed moderator/viewer roles remain Storybook examples, not live records or permissions.

- Hide from discovery removes a game from catalog/search/rankings. Approved direct play links remain available.
- Restrict game access removes it from discovery and blocks new hosted requests for all its environments, aliases, immutable versions and assets. The host checks D1 before redirects, cache access, range requests or storage reads and returns the existing uncached Game not found page. Content already downloaded or running in a browser cannot be recalled.
- Restore game clears its moderation restriction; it does not approve an unlisted release. New deployments and publishing decisions cannot clear project moderation.
- Hide/restore comment changes public visibility and comment totals without destroying the text. Authors cannot clear the hidden flag by editing, and edits advance the revision so an admin must review the current text before acting. An author can still delete their own comment.

The API prefix is `/api/platform/v1/admin/manage`. `GET summary`, `GET games`, `GET games/<project-id>`, `GET comments` and `GET history` read real D1 records. Lists use 40-row cursor pagination, literal `q` searches and relevant `status`/`project` filters. `POST decisions` accepts the shared `ModerationDecision` contract: request ID, action, project/comment target, expected revision, reason and required internal note (up to 500 characters). Browser admin mutations require a matching Origin; explicit bearer clients remain supported.

Migration `0019_moderation.sql` stores project restrictions, comment visibility/revisions and append-only `moderation_audit` history. A D1 transaction atomically saves state and history, rechecks admin membership, rejects stale revisions, and deduplicates retried request IDs. Each event retains verified actor identity, target, timestamp, reason, note and before/after states; comment events retain the original text even after author deletion. Database triggers reject updates/deletes to audit entries. There is no audit-editing endpoint. History starts with Manage decisions; earlier publishing actions remain in `audit_events` and are not fabricated or backfilled. Admin access remains operator-managed through `platform_admins`, with no public self-enrollment endpoint.

SQL tests cover authorization, search/pagination, conflicts, idempotency, rollback on audit failure, role revocation, comment edits/deletion and public visibility. Host tests exercise restriction across stable and immutable, GET/HEAD and range paths before cache reads. Staging browser acceptance exercises actual signed-in permissions, hide/restrict/restore, comments/history, and desktop/mobile layout using the platform verification project; temporary test permissions, comments and sessions are removed afterward.
