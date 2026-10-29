# Documentation corrections and test setup

Follow-up to [the reference expansion](docs-reference-expansion.md), incorporating the usability report and Playwright add-on request on 2026-10-17.

## Documentation and navigation

- [x] Separate navigation into Build, Guides, and Reference, with the same order for previous/next links.
- [x] Add a complete CLI create/install/develop/check/build journey, using `@spawnkit/cli`. Include package-runner commands and downloadable kits as supported starting paths.
- [x] Remove repository-build and shell-alias instructions from public CLI documentation. Describe standalone generated games throughout.
- [x] Add Codex, Claude Code, and Cursor onboarding with project guidance, a practical first task, verification, and links to official product instructions.
- [x] Add existing-game upload instructions: static build requirements, ZIP root, supported limits, listing, and new-project versus existing-project behavior.
- [x] Add dashboard instructions for projects, uploading, production URLs, deployments, build logs, and project IDs. Identify unavailable operations accurately.
- [x] Keep code highlighting, example tabs, Markdown alternatives, search, sitemap, and llms.txt driven by the shared document collection.
- [x] Fix clipped keyboard focus indicators and dismiss search by clicking its backdrop, the close button, or Escape. Preserve inside clicks and focus return.
- [x] Validate every internal documentation link and anchor. Correct publication-step numbering, guide sequence, CLI confirmation behavior, shell placeholders, and beginner terminal instructions.

## Playwright and Vitest integration

- [x] Put a shared standalone browser runner in the selected test add-ons. Playwright declares its runtime dependency directly and works independently of Vitest.
- [x] Prepare the matching Chromium browser before local `pnpm e2e` and `pnpm test`; reuse cached downloads and stop before tests if installation fails.
- [x] Add `pnpm e2e:ui`, with test arguments forwarded to Playwright.
- [x] Add `pnpm run setup` for local HTTPS and Chromium, and `pnpm test:setup` for Chromium only. Use `run setup` because `pnpm setup` is a pnpm built-in.
- [x] Keep dependency installation free of new postinstall hooks. Local certificate trust remains an explicit machine setup action; no public domains or cloud projects are created.
- [x] Keep CI browser provisioning explicit, support `--with-deps`, and document the preprovisioned offline opt-out.
- [x] Update generated README/AGENTS instructions and public testing guidance for automatic local browser setup and explicit CI preparation.
- [x] Resolve test binaries through each installed package's exported manifest and declared `bin`, rather than unexported internal paths.
- [x] Exercise download failure, argument forwarding, CI, offline behavior, standalone working-directory handling, and combined add-ons in focused tests.
- [x] Use an isolated loopback server for browser tests by default, so a fresh test run does not depend on local DNS or certificate trust. `SPAWN_E2E_HTTPS=1` opts into named HTTPS after setup; CI always uses loopback.

## Consistent configuration filenames

- [x] Support `spawnkit.config.ts` and `spawnkit.config.json` as equivalent authoring formats at the project root. New templates detect the chosen format automatically.
- [x] Emit `dist/spawnkit.config.json`; name the editor schema `spawnkit.config.schema.json` and download archive `spawnkit-config-template.zip`.
- [x] Update all active examples, downloads, UI labels, CLI validation, upload preparation, media processing, release readers, and documentation to use the canonical filename.
- [x] Use only the current filenames throughout the code and docs. This app is prelaunch: no legacy formats, compatibility fallbacks, or migration guidance.
- [x] Verify real Vite builds for both authoring formats, invalid values, conflicting files, missing root configuration, and misplaced public configuration. Verify canonical upload and hosted listing reads.

## LLM-as-judge review

Three independent read-only reviewers examined the documentation as a technical developer, beginner vibe coder, and copywriter. Findings were checked against actual CLI, template, and dashboard behavior before editing. Scores are qualitative reviewer assessments out of five, not a user research or SEO ranking result.

| Perspective         | Findings resolved                                                                                                                                                       | Review outcome                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Technical developer | CLI confirmation and publication status, safe shell placeholders, login/link prerequisites, update scope, actual file locations, local-domain behavior, dashboard paths | Documentation accuracy and completeness 4.5/5; no remaining documentation must-fix findings in the second pass   |
| Beginner vibe coder | Prerequisites, folder/terminal instructions, suggested first kit, practical agent task, backups, browser-error instructions, first publication versus update            | Clarity 4.5/5, completeness 4/5, navigation 4.5/5 after final folder-instruction correction                      |
| Copywriter          | Guide order, concise action-led instructions, consistent terminology, internal links, unnecessary repository detail                                                     | Clarity/concision/consistency 4/5; organization/internal links 4.5/5; final folder-instruction finding corrected |

A subsequent technical review of the new browser runner caught unexported binary paths and two example mismatches. The runner now uses package manifests, the generated test is correctly named `e2e/game.spec.ts`, and the filter example matches `keyboard`. Stub tests now model manifest exports rather than inventing CLI subpath exports. The final source review of the corrected runner and filename change found no must-fix issues, with accuracy and completeness both 4.5/5.

## Validation and release

- [x] Documentation corrections passed repository verification and all 22 desktop/mobile SEO acceptance checks before the test-setup follow-up (`work/docs-corrections-verify.log`, `work/docs-corrections-browser.log`).
- [x] Final repository verification: `work/docs-config-release-verify.log` (format, lint, types, unused-code checks, media/config tests, coverage, and builds). A transient Storybook output-file write failure passed on rerun.
- [x] Real standalone games: PixiJS, Phaser, Babylon.js, and Three.js; adding tests to an existing kit; Vitest alone; Playwright alone. Evidence: `work/browser-setup-templates-loopback.log`, `work/browser-setup-babylon-rerun.log`, `work/browser-setup-remaining.log`, and `work/playwright-default-server.log`. An overlapping test run occupied port 4173; the affected Babylon check passed when rerun sequentially. Named-HTTPS testing exposed local DNS setup dependencies, so fresh automated tests now default to loopback; HTTPS remains explicit.
- [x] Final desktop/mobile acceptance: all 22 SEO/docs checks pass (`work/docs-config-browser.log`), and both real upload-form checks pass with canonical config/schema downloads (`work/config-upload-browser.log`).
- [x] Deploy the control API first: version `e9595df4-2758-4891-89d1-d6150d437c32`, including media processors; live health returns 200 (`work/docs-config-api-deploy.log`).
- [x] Deploy the dashboard: version `df60eacb-7fb5-4e45-a606-61a3829711aa` (`work/docs-config-dashboard-deploy.log`). All 16 HTML guides return 200 with one canonical, expected sections, and highlighting wherever code is present; all 16 Markdown documents match the source (`work/docs-config-live.json`).
- [x] Verify all six production kit ZIPs include the standalone browser runner, automatic test setup, canonical schema, and config detection (`work/docs-config-live-kits.json`). Sitemap and llms.txt include all six new workflow guides.
- [x] Verify live desktop/mobile JSON tabs, highlighted tokens, backdrop dismissal, focus return, and zero page errors (`work/docs-config-live-browser.json`; corresponding search screenshots).

Shared template generation serves both `@spawnkit/cli` and website downloads. See the [CLI release record](cli-release-and-remote-agents.md).

## Prelaunch simplification

- [x] Remove former-filename readers, normalization, optional plugin configuration arguments, and public-directory config fallback. Root TypeScript or JSON is the only template authoring contract.
- [x] Remove older-kit setup and configuration migration guidance. Retain safeguards against conflicting source files and invalid ownership records.
- [x] Rerun repository verification (`work/current-config-only-verify.log`), all 22 desktop/mobile SEO/docs checks (`work/current-config-only-browser.log`), and both upload checks (`work/current-config-only-upload-browser.log`). The ownership test now checks the current error instead of expecting migration guidance.
- [x] Deploy the simplified contract: control API `264129e6-7996-4554-a8a2-20ce70f3498a` and dashboard `506eb4e4-82d1-420a-9a99-323d229b3dc6`. API health returns 200. All 16 HTML/Markdown guides, six kit downloads, and desktop/mobile tabs, search dismissal, focus return, and page-error checks pass (`work/current-config-only-live.json`, `work/current-config-only-live-kits.json`, `work/current-config-only-live-browser.json`). Deployment logs: `work/current-config-only-api-deploy.log` and `work/current-config-only-dashboard-deploy.log`.
- [x] Record the prelaunch rule in `docs/development.md`: update the current contract directly, without backward-compatibility layers or user migration guidance.
