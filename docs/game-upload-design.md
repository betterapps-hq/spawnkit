# Browser game uploads

Status: live new-project upload at `/dashboard/upload`, with separate simulated Storybook scenarios, 17 October 2026.

## Review

`Publishing/Upload game` includes Upload, Uploading, Upload failed, Invalid archive, Details, Imported config, Media, Existing game and Complete. The navigation sits in the general dashboard workspace. The page uses the existing theme and UI components.

1. Game files: choose or drop a browser-build ZIP containing `index.html`. Read `spawnkit.config.json` and its referenced cover/video immediately, populating the adjacent preview before continuing. Download template provides a starter JSON config. Upload progress, interrupted transfer, retry, replacement and invalid archive stories remain available.
2. Details: title, description, shared genre vocabulary and 2D/3D choice. Character limits match the listing contract. Editing updates the adjacent game card. Missing fields prevent advancement.
3. Media: cover selection, replacement and removal; optional MP4/WebM hover clip. The browser checks file types and the existing 1 MiB / 2 MiB limits before accepting a replacement. Invalid replacements retain the previous image. Object URLs are released when replaced or unmounted.

The card preview and controls adapt to phone layouts and both themes. Reduced-motion users see the cover. No internal approval state or prototype banners appear in the product surface.

Completion includes an external game URL, a linked cover, Play game, Open project and Edit details. Game links illustrate the resulting `.spawnkit.games` address; the prototype does not provision that address. Open project leads to the project overview Storybook. The production flow must use the project ID and assigned hostname returned by deployment rather than constructing them from the title.

ZIP listing inspection and config downloads work in Storybook. File transfers, draft persistence and deployment remain simulated. Media files remain local object URLs. No requests create projects, persist drafts or upload artifacts. Production implementation must use platform-owned validation, archive limits/path checks, isolated media processing and release activation. A client file check never replaces server validation.

The browser accepts ZIPs up to 64 MiB with at most 2,000 entries. It checks names and duplicates, requires root `index.html`, and decompresses only the listing (4 KiB maximum) plus referenced cover (1 MiB) and video (2 MiB). It never executes uploaded HTML or JavaScript. Malformed config, missing referenced media and exceeded bounds show errors. Removing/replacing a file cancels stale import results. Missing config preserves the current details.

`spawnkit.config.json` is the shared version-1 build artifact for CLI and ZIP uploads. CLI templates use typed `spawnkit.config.ts` to generate it. Uploaded ZIPs place the JSON beside `index.html`. Download config exports the current title, description, genre, dimension, media paths and optional gameplay facts as this same JSON. It downloads metadata only; referenced media must also be included in the ZIP. Download template provides `spawnkit-config-template.zip`, containing starter `spawnkit.config.json` and `spawnkit.config.schema.json`. The JSON references its adjacent schema for editor completion. The schema includes every supported field, enum value, length limit and media constraint. Download config continues to export current settings as JSON.

## Listing precedence

The activation contract applies to both CLI and browser upload ingestion:

- A successful production deployment with usable listing configuration replaces the project's title, description, genre, dimension and optional details.
- A later dashboard save replaces those values immediately.
- A deployment without configuration preserves the latest saved details. A generated media-only manifest does not count as a listing config.
- Missing optional fields in a supplied config clear their previous values; this is replacement rather than a permanent dashboard override.
- Failed, superseded and preview deployments do not change production listing details. Retrying the same successful deployment cannot reapply metadata over later edits.

The control API applies this rule in the activation transaction. Saved settings hold the current metadata regardless of its source. A deployment-specific audit marker provides idempotency; revision and release checks reject stale dashboard edits. Existing processed cover/trailer paths remain release-scoped. Dashboard media upload is still a proposed capability.

The imported-config story shows prefilled fields; the existing-game story starts with saved dashboard details. Selected ZIPs now derive their listing and preview from actual archive contents. Production must load existing-game defaults from the saved project listing.

## Live deployment

The dashboard Upload game action uses the reviewed form without the Storybook shell or simulated draft controls. On Deploy game, it packages the selected browser build under `game/`, adds a dependency-free copy build, and sends the existing `spawn-source-v1` archive protocol through the authenticated dashboard proxy. This is an adapter to the existing source build service, not a second trusted upload path. The server independently checks paths, credentials, digest, expanded size and project ownership, builds in isolation, processes listing media and activates the release. No uploaded HTML runs in the dashboard origin.

The deploy adapter replaces the bundled manifest with the details currently shown in the form and includes selected cover/video data. ZIP selection still imports the original manifest automatically. Uploaded browser builds are limited to 20 MiB expanded and fewer than 1,996 files to leave room for the adapter files; the initial ZIP inspection limit remains 64 MiB. Cover and trailer limits remain 1 MiB and 2 MiB.

Project and operation IDs are retained across retries in the open form. The UI polls real deployment state and logs, shows failures without claiming success, and shows completion only after the API reports success with an assigned game URL. Open project uses the created project ID on the current dashboard origin. Existing-game upload and persistent browser drafts remain future work; their Storybook scenarios are not connected to live mutation paths.

Publishing displays Check files, Upload, Prepare and Publish stages from real API state, without fabricated percentages or raw build logs. Build failures receive a focused recovery panel with Try again and Open project; authentication interruptions offer Sign in. Detailed build output remains in project logs. Request timeouts and polling limits return recoverable errors. Generated coverage, Storybook and build output are excluded from Vite file watching so verification does not reload active forms.

Game titles in the live upload form are checked against normalized reserved addresses after a 350 ms debounce. A taken name or failed availability check prevents proceeding. Creation with `requireUniqueName` reserves the address in the project transaction; a collision returns 409 without a partial project. Existing project retries retain their original address.

Project Settings supports direct cover and gameplay-preview replacement alongside listing details. Media saves repackage the owned browser release into a queued deployment in the same project. The existing isolated processor enforces the 1 MB cover and 2 MB trailer input limits, generates optimized derivatives, and retains the live release if processing fails. Media updates consume the normal build allowance and produce a new version; text-only saves do not build. The backend rejects stale release/revision requests and accepts retries idempotently. Project deletion remains separate work.

Selected upload media is read from its File/Blob directly, rather than fetched from a blob URL, so production CSP does not need to permit blob connections.
