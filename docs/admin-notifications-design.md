# Dashboard notifications

Status: interactive Storybook design, 17 October 2026. Production delivery and Novu credentials are not configured by this work. Team invitation email continues through Resend.

## Review surfaces

`Dashboard/Notifications` (existing story IDs retained) contains Inbox, Escalation, Unread, Archived, Header preview, Preferences, Moderator, Empty, Loading, Failed, Save failed Report unavailable, Creator and Creator preferences stories. The components share the dashboard theme, sidebar, buttons, tabs and focus behavior. Fixture events remain in the design directory; the production dashboard does not import them.

Notifications sits in the general Workspace navigation, outside Administration. Creator/Observer fixtures contain only deployment and comment events; moderation alerts remain role-scoped. The inbox is a flat, full-width list with compact rows. Selecting an item reveals an unboxed detail pane on desktop. Small screens show one pane at a time with a back action. Notification selection marks the item read; archiving only changes the recipient's inbox. It never resolves a report. Counts exclude archived entries. All, Unread and Archived filters combine with title/game/report-reference search. Header preview uses the same state as the full inbox. Escape restores focus to the bell.

Report IDs remain internal fixture references and are not displayed. Details show the event, a compact report summary and one route to the report. Current report state must be fetched independently of the event snapshot. Deleted or inaccessible targets retain the event but replace its details with an unavailable state. The Storybook Open report links go to existing report stories; live links will go to the authorized dashboard route.

Preferences cover deployment/comment updates for creators, and in-app delivery and email for assignments, escalations, report updates and a daily unassigned-queue summary. Escalations appear only for Admin. The mock summary uses 9 AM and the account time zone. Saving is explicit; failed saves retain edits, retry is safe, and Cancel restores the last saved values. Loading, empty and error states carry only the information needed to continue. No prototype notice or decorative dot separators appear in the UI.

## Proposed workflow contract

| Event | Recipients | Default delivery | Grouping |
| --- | --- | --- | --- |
| `moderation.report.assigned` | Current assignee, excluding the actor | In-app and immediate email | One per assignment revision |
| `moderation.report.escalated` | Active Admins, excluding the actor | In-app and immediate email | One per escalation revision |
| `moderation.report.updated` | Current assignee | In-app | Group repeated evidence on the same case |
| `moderation.queue.digest` | Active Admins and Moderators who opt in | Daily in-app and email | One per recipient, local date and queue |

Observer access is read-only and must not imply assignment or escalation notifications. Observers may read history in the authorized report UI. No submission approval, rejection, internal review note, reviewer identity or review timestamp is sent to creators or players. Report text, reported comment excerpts and unsafe URLs are omitted from email. The email contains the event type and a fixed SpawnKit report link. Report links require sign-in and current permission.

## Novu integration after design approval

Use Novu for workflow orchestration, in-app delivery and channel preferences, with the existing verified Resend sender for the email channel. The custom inbox can use Novu's [headless integration](https://docs.novu.co/platform/inbox/headless-mode); [workflows](https://docs.novu.co/platform/workflow) support the channel and digest behavior. Pin the selected SDK version during implementation rather than adding an unused dependency to this design.

1. Write an outbox event in the same D1 transaction as the assignment, escalation or report change. Provider failure must not roll back a successful moderation action.
2. Resolve recipients from current community membership at dispatch time. Exclude the actor, inactive members and unrelated project owners. No browser-provided subscriber ID or recipient list is trusted.
3. Give every event and recipient a stable deduplication key. Persist attempts, provider transaction ID and next retry time. Retry with bounded backoff; reconcile ambiguous timeouts before creating another delivery. Batch queue summaries, not urgent escalations.
4. Use distinct staging and production subscribers and credentials. Store API keys only in Worker secrets. Generate inbox identity from the authenticated Clerk subject. Novu requires [server-generated HMAC authentication](https://docs.novu.co/platform/inbox/prepare-for-production) for a browser-connected inbox; public application IDs alone are insufficient.
5. A cached HMAC is not continuous SpawnKit role authorization. Prefer a server-controlled feed boundary for internal moderation data, rechecking membership on every request. If direct browser Novu access is selected, demonstrate subscriber revocation and deletion of retained private content before enabling it; hiding the bell is not revocation.
6. Recheck current permission and target existence when opening a report. Event snapshots never authorize report access. Render content as text, validate links against fixed dashboard routes, and never embed reported HTML or external links in the notification body.
7. Reconcile removed members, reassigned cases and deleted targets. Suppress obsolete pending deliveries and prevent notifications being sent after role loss. Record delivery outcome separately from the immutable moderation decision audit.

## Acceptance before production integration

Test duplicate and out-of-order delivery, provider timeouts, retries, last-minute role removal, cross-account inbox reads, read/archive idempotency, daily time-zone boundaries, preferences failure and recovery, inaccessible report links, and creator accounts receiving no internal events. Require real delivery verification in staging before enabling production events.

The current browser checks cover local interaction, mobile layout, theme parity, keyboard dismissal, failure recovery and zero mutation requests from the prototype. They do not establish working Novu delivery.
