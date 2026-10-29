# Project settings

Status: Approved design, shared by the live dashboard and Storybook fixtures.

## Fields

| Field | Behavior |
| --- | --- |
| Game name | One display name for the project and game listing. Renaming does not change the assigned address. Existing listing titles become the project display name when this feature ships. |
| Description | Existing 10–500 character listing description. |
| Genre | Existing shared genre vocabulary. |
| Dimension | Existing 2D / 3D values, presented as two choices. |
| Cover image | Replace the existing cover; 1 MB input limit. |
| Gameplay preview | Optional MP4 or WebM; 2 MB input limit. |

Save and Discard appear in the page-level actions beside the Settings title only when the draft changes. One save action covers the draft. Success clears the page actions and shows a dismissible “Changes saved” toast for five seconds; hover or keyboard focus pauses dismissal. Discard restores all text, choices and media. Failed saves retain input. The existing metadata precedence remains: a deployment with a listing config replaces dashboard edits; a deployment without one preserves them. Media still goes through platform processing.

The assigned game address and project ID sit directly beneath the Settings title with copy controls, plus a repository link when connected. The game address is an external link. There is no separate Project info section. Source connection belongs with deployment configuration. There are no telemetry controls, placeholder environment-variable panels, metadata-source badges, or duplicate save actions in this proposal.

Objective, controls, supported devices, creator, source licensing and starter-kit attribution were not approved as dashboard fields. They have been removed from the live listing editor and the raw “Public game details” expander has been removed from submission cards. Existing stored metadata is preserved when saving the remaining fields.

## Deletion

Danger Zone contains one Delete project action. The dialog identifies the game and address, explains removal of the listing, versions and hosted files, and requires the exact saved game name. Cancel receives initial focus. Closing resets confirmation; failed deletion retains it for retry. Deleting disables repeat actions. Storybook demonstrates these transitions in memory only.

The owner-authorized backend takes the game offline and stops new builds first, then removes project resources with persistent retries. The slug remains reserved until cleanup finishes. See [Project deletion](project-deletion.md) for the full resource inventory and audit retention. Completion is shown only after the server confirms cleanup.

## Review

`Project dashboard/Settings`: Game, Unsaved changes, Saved, Save failed, Connected repository, Delete confirmation, Deleting, and Delete failed. Storybook uses the same form with simulated operations. Browser acceptance covers draft changes, discard, media selection, save failure/retry, exact-name deletion, cancellation/focus restoration, mobile containment, real API contracts, and absence of API calls from Storybook.
