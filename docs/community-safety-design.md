# Community safety and creator media — design proposal

Status: **Reports, Team and game-listing settings implemented.** The production workflows use Clerk identities and D1 records. Storybook stories remain isolated fixtures. Storage quotas and cleanup are still design proposals. Production invitation email uses the verified Resend domain with a domain-restricted sending key. Both simulated delivery and real recipient onboarding passed on 17 October 2026: the scheduled outbox delivered an invitation, the recipient signed in and accepted it as Observer, and both events appeared in the production access history.

Notification decision (17 October 2026): use **Novu** for moderation notifications, including assignments, escalations and delivery preferences. Twelve interactive stories now cover the [notification design](admin-notifications-design.md). Production delivery remains deferred until design approval; current team invitations continue to use Resend.

## Implemented workflows

- Dashboard navigation includes Reports and Team for Admin, Moderator and Observer. Only Admin can invite, change access, or restrict a game. Moderator can review and hide content; Observer has read access. Every write rechecks permissions on the server. Removing write access returns assigned cases to the queue, and database triggers protect the last administrator.
- Invitations expire in seven days, require the invited email to be verified in Clerk, and can be accepted once. Resending rotates the link. Only token hashes are stored, and links carry tokens in a URL fragment. Pending email is delivered by a durable, leased outbox with bounded retries and a Resend idempotency key. Sender: `SpawnKit <team@spawnkit.cloud>`.
- Signed-in players can report games and comments. Reports deduplicate by account, target and captured content version; limits are five per hour and twenty per day. Original evidence is immutable. Reports concerning the same unresolved target share a case.
- Reports provides search, content/status/assignment filters, original and current evidence, ownership, notes, handoff requests, escalation, and decisions. Viewing current content precedes a decision. Revision and content checks reject stale decisions. Content changes and audit entries are one D1 transaction, and request hashes prevent conflicting retries. Evidence and history are paginated without truncating access to older records.
- Project Settings includes Game listing. Owners edit title, description, genre and dimension; the latest dashboard save or successful production deployment containing usable listing metadata wins. Deployments without configuration preserve the saved details. Cover/trailer cards show processed assets and deployment warnings. Media changes use `spawnkit.config.ts` and another deployment. No submission approval status is exposed to creators or players.

Implementation validation: `apps/control-api/src/community.test.ts` exercises permissions, invitation lifecycle, outbox retries, immutable evidence, rate limits, concurrency, transaction rollback, audit pagination and listing ownership. `tests/community-live.spec.ts` exercises the real components against controlled API responses at desktop and phone widths. Run it with `pnpm exec playwright test --config playwright.community.config.ts`. Provider delivery and production smoke checks are separate from these local tests.

## Outcome

Players should have a short, private way to flag a problem. Reviewers should be able to understand the evidence, coordinate ownership and leave an accountable decision. Administrators should be able to grow the moderation team without accidentally granting excessive access. Creators should understand media preparation and storage without needing to understand the platform's processing infrastructure.

Submission approval stays internal. No creator or player screen exposes an approval queue, reviewer identities, private notes, or publication decisions. A report receipt acknowledges delivery; it does not promise an outcome or response time.

## Review entry points

| Area | Storybook starting point | What to try |
| --- | --- | --- |
| Report investigation | `Administration / Reports / Investigation` | Claim a case, inspect evidence, choose an action, add reasoning and review history |
| Edited evidence | `Administration / Reports / Edited Comment` | Take over with a reason, compare the captured and current versions |
| Conflicting decisions | `Administration / Reports / Updated Elsewhere` | Save a draft, load another reviewer's decision, find the unsent draft under History & notes |
| Team access | `Administration / Team / Members` | Search, filter invitations, renew an expired invitation and compare permissions |
| Player reporting | `Public site / Report content / Entry Points` | Open a game or comment menu, submit a private report, try dismissing a draft |
| Media preparation | `Project dashboard / Media and storage / Overview` | Compare source and delivery sizes, open the typed configuration example |
| Storage cleanup | `Project dashboard / Media and storage / Near Limit` | Select removable releases, review their exact sizes and confirm a cleanup |

The Storybook navigation links these proposals for review. In production, Reports and Team belong within administration; Media & storage belongs within a selected project's settings. Dashboard, Submissions and Manage links open the existing application in a separate tab.

## Visual system

- Use the application's existing brand, sidebar, typography, Lucide icons, buttons, inputs, radio groups, tabs, sheets and semantic color variables. No second visual identity.
- Dark charcoal surfaces, low-contrast borders, a restrained lavender primary action and semantic status treatments. Purple means selection or attention; amber means a condition needs review; red is reserved for failure or destructive effects. Status always has words, not color alone.
- Establish one primary decision per surface. Keep evidence visually dominant. Counts, identities and timestamps support the task rather than competing with it.
- Reports use a queue/detail layout on wide screens. At narrower widths, the queue and investigation become separate views with an explicit back action. The existing sidebar becomes the app's compact rail and expandable navigation.
- Dialogs center on desktop and become bottom sheets on phones. Long content scrolls inside the dialog. Forms retain readable labels, contextual descriptions and visible validation.
- Keep sample-data and prototype explanations in Storybook documentation, outside the product UI. Do not add preview badges, disclaimers or explanatory footers to screens or dialogs.
- Use spacing for adjacent metadata, never dot separators. Keep copy to labels, required instructions, action consequences and feedback; omit taglines, duplicated explanations and promotional copy.

## Player report flow

1. Entry points: the game's options menu and a comment's options menu. No additional play button or interruption to gameplay.
2. Preserve the target: game title/creator, or the comment author and captured text. The player should know exactly what will be reported.
3. Signed-out players see a sign-in boundary before writing. The prototype's demo account button is explicitly labeled and does not call authentication.
4. Choose one reason. Game reasons distinguish unsafe content/links, a misleading listing, advertising and other. Comment reasons distinguish spam, harassment/hate, personal information and other.
5. Add context in a second step. Context is optional except for Other; maximum 500 characters, visible counter, and a reminder not to include passwords or private account details. Back and Change preserve the draft.
6. Submit once. Disable sending while pending. Network failure retains target, reason and text and offers retry in place.
7. A private receipt acknowledges the report and returns the player to the game. It exposes neither moderation actions nor approval state. Duplicate reports receive an acknowledgment without another submission. Rate limiting explains when to try again without inventing a countdown.
8. Closing a nonempty draft asks whether to keep writing or discard. This is local protection for the player's text, not an approval flow.

Production requirements: deduplicate by account/content/version under a bounded policy; apply server-side limits; preserve the original reported content; return a stable receipt across retries; authenticate and authorize every write. The exact deduplication window and abuse limits remain open. The prototype does not persist drafts across reloads.

## Reviewer workspace

### Queue

Open, Resolved and All views; search by game, case ID, reason or author; game/comment filter; Assigned to me; newest, oldest and priority sorting. Each row provides content type, stable case identifier, game, reason, report count, age and ownership. Related reports share a case to avoid multiple reviewers taking conflicting actions on the same content.

Sample priority is a design input, not a claim that an automated severity classifier exists. High priority does not prove a violation. Empty, no-search-results, loading and failed states are distinct. Recovery is local and does not erase filters.

### Investigation

The detail header identifies the game and author, case state, grouped report count and reporting time. The game opens separately on its isolated hosting domain. Evidence is presented as plain text: review does not execute uploaded content or turn report URLs into actionable links.

The Evidence tab separates captured content from player allegations. It includes surrounding conversation, separately expandable player explanations, and privacy guidance. Edited comments show both the reported and current text. The decision action remains disabled until the reviewer has viewed the current version.

History & notes records assignment changes, decisions and supporting reasoning. Internal notes are distinct from public comments. Each history item identifies actor and time. Production must preserve an immutable record of the original and changed content, not rely on a mutable comment row.

### Ownership and decisions

- Start review claims an unassigned case. Cases already assigned to someone else remain readable, but decision controls are disabled.
- An admin may take over with a required explanation. A moderator may request a handoff without silently changing the assignment.
- Each decision states its effect before confirmation and requires a reason and internal notes. The grouped report count makes the scope explicit.
- Hide comment removes that comment from the public conversation. Hide from discovery removes the game from search/browse while keeping direct access. Restrict game access is admin-only and blocks hosted content, including direct requests. These are different operations and must remain distinguishable.
- No violation found resolves the report without changing content visibility. Escalate routes to an admin without silently hiding the game. Reopen preserves the previous history.
- A failed save retains the entire decision draft. A version conflict refuses to overwrite another reviewer's action. Loading the latest decision preserves the unsent note under History & notes.
- After resolution, the next open report is one action away. Reopening requires a fresh reason; restoration of hidden content remains a separate Manage action.

Production requirements: atomic assignment claims; compare-and-set/version checks on decisions; idempotent mutations; authorization on every endpoint; transactional outcome/audit writes; visibility and game-host restrictions enforced independently of UI; immutable captured evidence; pagination and stable sorting; clear handling for content removed by its author. The prototype demonstrates the key conflicts but does not implement cross-tab collaboration.

## Proposed team roles

| Capability | Admin | Moderator | Observer |
| --- | --- | --- | --- |
| Read games, comments, reports and history | Yes | Yes | Yes |
| Claim cases and add internal notes | Yes | Yes | No |
| Resolve reports and hide content | Yes | Yes | No |
| Restrict hosted game access | Yes | No | No |
| Take over another reviewer's case | Yes, with reason | Request handoff | No |
| Invite teammates or change permissions | Yes | No | No |

Observer is a proposed read-only moderation role. Existing production administrator permissions are not changed by this design.

Invitations start with Moderator selected and show concise descriptions of all roles. Choosing Admin exposes the elevated access explicitly. An email address already on the team or pending is rejected inline. Invitations are proposed to expire in seven days, can be renewed, and can be cancelled. Resending invalidates the old link; access starts only after acceptance by the exact invited account. All these policies require backend implementation and review.

The team list distinguishes Active, Invited and Expired, including on phones. Search and invitation filters support larger teams. The access history records invites, cancellations, membership changes and reasons. Removing a teammate must preserve their historical attribution and return active cases to the unassigned queue. A person cannot modify their own access in this proposal; another admin must do so. The last active administrator cannot be removed or demoted.

Production requirements: separate memberships from game ownership; exact-account invitation acceptance; single-use expiring invitations; race-safe last-admin protection; session revocation or permission recheck after removal; audit every access change. Team-level SSO and custom permission roles are outside this proposal.

## Creator media

Two cards distinguish the cover from the hover preview. Both show original bytes, delivered bytes, output dimensions/format and preparation state. The trailer is represented by an explicitly labeled **poster frame** in Storybook, not a fake working video.

Existing input contract: cover up to **1 MiB**, PNG/JPEG/WebP/SVG; trailer up to **2 MiB**, MP4/WebM, maximum 60 seconds. The platform prepares bounded WebP covers and a silent MP4 of the first eight seconds. The UI directs creators to start source footage on actual gameplay; it does not promise automatic highlight selection.

Update media through the existing `spawnkit.config.ts` / `defineConfig()` workflow and the next deployment. The example includes title, description, genre, dimension, coverPath and trailerPath. It uses paths relative to build output and explains Vite's `public/media` convention. There is no decorative upload control pretending to implement a new upload API.

Proposed replacement behavior: validate and prepare new media independently; keep the last valid public asset until its replacement is ready; use the platform fallback if no valid asset exists. Queue wait has no fabricated completion percentage or ETA. Processing, queued and failed stories explain that the game remains available. Retry preserves the current listing. A media problem does not block access to a successfully deployed game.

Isolation of the media processor from untrusted build processes is a backend security requirement, not a creator-facing implementation detail. The design neither implements that isolation nor claims it is deployed. Production needs trusted job creation, bounded processing, deduplication, retry/backoff, stale-job detection and atomic replacement of public references.

## Storage and cleanup

The **1 GiB allowance is illustrative**, not a pricing decision or live quota. Usage includes source uploads, game releases and media. Near-limit and full states explain the consequence for the next deployment while preserving the current game. Extra usage in those fixtures represents other stored project assets outside the removable release rows.

The proposed retention policy protects the current release, one previous working recovery release, and every listing object still referenced publicly. These rows cannot be selected. Older releases and failed-build files may be candidates. “Select removable” never includes protected content.

Cleanup is a two-step flow: select candidates, then inspect the exact releases and bytes in a confirmation sheet. Explain irreversibility and protected content; require acknowledgment; disable duplicate requests; keep the selection when a failure occurs. A successful cleanup updates the local usage and release list and reports the reclaimed bytes. Empty states distinguish a new project from no remaining candidates.

Production requirements: transactional quota reservations for concurrent uploads; reference-aware garbage collection; validation of protection rules immediately before deletion; permission checks against project ownership; idempotent cleanup; reconciliation against actual object storage; treatment of partial failures and delayed reclamation. Do not decrement production usage merely because a delete was scheduled. Preview cleanup is intentionally all-or-nothing; partial success and background cleanup require further design when the storage contract is chosen.

## Accessibility and responsive behavior

- Real buttons, links, forms, radio groups and checkboxes; contextual accessible names for icon-only controls and repeated row actions.
- Keyboard navigation for tabs, menus and radio groups. Dialogs trap focus, Escape closes or protects a draft, and focus returns to the initiating control when possible.
- Textual alerts and status messages; required fields and pending controls communicate state without relying on color.
- Headings and landmarks support scanning. Meaningful image descriptions; purely repeated decorative art has empty alt text.
- Light and dark themes use shared tokens; reduced motion disables animation in these previews.
- Queue/detail switches replace squeezed split panes on narrow screens. Phone member rows retain invitation state. Release metadata wraps rather than producing a horizontal page scrollbar.

## Prototype boundary and review checklist

There are **35 named design stories**: 12 report states, 7 team states, 8 player report states and 8 media/storage states. They live in `apps/dashboard/src/components/moderation/design/`. Production reuses shared visual primitives, but not sample records or prototype state machines. Migration `0020_community_access_reports.sql` supplies live access, invitations, reports, audit history and listing settings. No live storage quota or cleanup operation is introduced.

Acceptance coverage lives in `tests/community-safety-design.spec.ts`: report search/assignment, edited evidence, required decision reasoning, failed saves, stale decisions and retained drafts, role constraints, last-admin protection, invitation retry/resend, player context/privacy/draft protection, cleanup protection and retry, media state transitions, layout boundaries and prototype-only writes.

Validation on October 17, 2026: `pnpm verify` passed. All 28 desktop/mobile checks passed, including badge border rendering in both themes and absence of prototype notices. Automated WCAG A/AA checks found no violations in 28 combinations of the main views, light/dark themes and desktop/phone widths after rendering settled. Screenshots were reviewed at 1440px and 390px. These automated checks supplement visual and keyboard review; they are not a complete accessibility certification.

Review before implementation:

1. Does the queue expose enough information to choose the next case without reproducing private evidence in every row?
2. Is each moderation action's real effect understandable before saving?
3. Are Admin, Moderator and Observer the right operational roles?
4. Is player reporting short enough, with clear privacy and no promises about response times?
5. Is media preparation understandable without exposing build/worker infrastructure?
6. Agree on quota size, quota scope, recovery retention and deletion policy before implementing storage enforcement.
7. Resolve backend contracts for removed content, partial cleanup, audit retention, report abuse and account-level sanctions. These remain follow-up work, not implied functionality.
