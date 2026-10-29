# CLI judge review — 2026-10-14

Method: one LLM evaluated the implementation through three explicit perspectives, then checked findings against source, actual command output and contract tests. These are perspective-based judgments, not independent human usability tests or three independent model runs. Scope: game creation, authentication/project association, source deployment, release inspection, promotion and rollback. No live deployment was attempted.

## Game developer perspective

Criteria: discoverable next action, minimal repeated setup, clear game/environment identity, actionable errors.

* Project linking and unlinking locate the nearest game root, including use from `src/`.
* Fixed: the agreed linking vocabulary was absent. Added `spawn link --project <id>` and `spawn unlink`; link verifies authenticated account access before writing, while unlink removes local association only.
* Integration blocker: post-login New project / Existing project / Skip, searchable project picker and editable default project name require the list/create API. Link help explicitly identifies this limitation and gives the usable ID-based path. Do not describe onboarding as complete until it is connected.

Judgment: explicit-ID workflows are usable; novice onboarding remains incomplete pending the project API.

## CLI architect perspective

Criteria: consistent command/flag semantics, context inference, predictable side effects, truthful states.

* Fixed: every platform command printed the entire platform help block. Each now has focused syntax, behavior and relevant options; rollback explains that migrations are not reversed, logs explains pagination, and shared project inference is stated.
* Fixed: invalid or missing environment options could trigger credential lookup/API calls first. Validation now occurs before filesystem context, authentication or network activity, with tests asserting no project API invocation.
* Preserved: Accepted CLI environments are `sandbox` and `production`; promotion only targets production. Mutation preview includes the current release, selected target, retry identity and build behavior. JSON does not prompt or open a browser.

Judgment: `link` verifies project access and `unlink` removes the local association.

## Experienced platform developer perspective

Criteria: safe automation, source isolation, immutable releases, explicit project targeting, failure visibility.

* Fixed: `status` could report a failed deployment while exiting successfully. Failed/cancelled status and immediate mutation responses now set exit code 1 while preserving structured JSON output.
* Verified: no local build execution; bounded source packaging, required lockfile, environment/credential/output exclusions, traversal/link checks, upload digest acknowledgement, conditional predecessor and idempotency keys. Promotion/rollback do not package local files or request rebuilds.
* Verified: account-denied linking leaves the folder unlinked. Switching project IDs requires unlink first; hosted project data is not deleted by unlink.
* Known boundaries: `.spawnignore` uses additive globs rather than Git ignore semantics; logs are paginated rather than streamed; no refresh-token renewal; live platform integration is still pending. These are explicitly documented capabilities, not promises of implemented behavior.

Reference: the directory-to-project association and explicit project override follow the established model documented by [Vercel link](https://vercel.com/docs/cli/link). This comparison informs the judgment; SpawnKit keeps hosted source builds and its own environment/promotion contract.

Judgment: the implemented operations follow sound release and automation practices. Production readiness still requires live API/authorization, build and activation integration checks.

## Validation and unresolved cleanup

69 CLI tests pass; CLI type checking, lint and bundle build pass. Added regressions for nested linking/unlinking, access-denied linking, validation before API use and failed deployment exit status. Existing contract tests cover source upload, promotion, rollback, cancellation, safe errors and JSON.

Full `pnpm verify` stops at formatting in `verdun` and concurrently edited `apps/control-api` files. Backend files were left to their owning session. The user's requested deletion of `D:\spawn\verdun` was retried only after verifying the exact resolved path, parent and non-reparse directory. Automatic approval review rejected `Remove-Item` with “blocked by policy”; no deletion occurred and no bypass was attempted.

## Follow-up implementation and validation

The project picker is now implemented. Interactive login offers New project / Existing project / Skip inside a game or with `--directory <game-folder>`. `spawn link` offers the same flow. Creation defaults to the local manifest name, permits editing, requires confirmation, and creates a production-only project. Existing project access is verified before linking. JSON mode requires an explicit project ID. Interrupted or uncertain creation reports the project ID for reconciliation; link failures preserve successful login and hosted projects.

80 CLI tests and 68 template-composition tests pass. CLI/template lint, types, formatting, and the bundled CLI build pass. Four desktop/mobile CLI-auth browser acceptance checks pass. Eighteen distinct renderer/module combinations pass the generated 90% gate after the final test updates: all four renderers with plain, bitECS, and Koota movement; five physics/UI/telemetry combinations; and the no-UI variant. Production build and keyboard smoke checks also passed for these combinations. A deliberately added untested source file caused the coverage gate to fail, proving unimported source is counted; the probe was removed afterward.

The coverage work also fixed render loops continuing after physics disposal on page exit and removed unreachable pause paths in no-UI starters. Vitest uses real Chromium rendering, controlled simulation positions for renderer unit tests, separate movement/input tests, and mocked Sentry transport. Independent browser smoke tests exercise real keyboard collection.

Verdun is now absent. The live authenticated project-list request returns HTTP 500, so live project creation/deployment/promotion/rollback is not verified. The Storybook combination could not finish installing because npm DNS resolution repeatedly failed for `@testing-library/user-event`. Full `pnpm verify` remains blocked by formatting in concurrently edited control-API/dashboard files. These are unresolved integration/environment checks, not passing results.

Evidence: `work/templates-Ggei98`, `work/templates-vhi2Np`, `work/templates-XPOeFd`, and `work/templates-mXI7pb` contain generated fixtures and coverage reports. Each final recheck writes `coverage-recheck.log`. `work/cli-journey-demo.ts` demonstrates link and deployment previews against a clearly labeled fixture API without hosted mutations.
