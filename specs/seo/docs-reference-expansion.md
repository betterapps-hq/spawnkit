# Documentation reference expansion

Selected subjects: **1 CLI**, **3 project structure**, **4 publishing examples**, **7 testing/debugging**, and **8 updating an existing game**. Package-manager setup, engine guides, and gameplay recipes remain unselected.

The subsequent [documentation corrections and test-setup work](docs-corrections-and-testing.md) supersedes the repository-oriented CLI instructions described below with standalone `@spawnkit/cli` installation and usage guidance.

## Implementation

- [x] Add `/docs/cli`: pnpm/npm installation, standalone project setup, creation, module addition, authentication, linking, deployment commands, flags, JSON output, and retries.
- [x] Add `/docs/project-structure`: annotated files, configuration responsibilities, scripts, asset paths, local domains, and browser-visible environment variables.
- [x] Add `/docs/publishing-examples`: equivalent TypeScript/JSON listings, verified archive layout, PowerShell/Bash packaging, live checks, and existing-project updates.
- [x] Add `/docs/testing`: available scripts, Vitest score examples, a clearly limited browser smoke test, diagnosis table, and useful failure reports.
- [x] Add `/docs/updating`: recoverable baseline, preview/apply workflow, ownership/conflict behavior, ownership validation, and verification.
- [x] Generate Shiki highlighting at build time with GitHub light/dark themes. Render escaped React token spans; preserve raw code for copying. No highlighter or grammar runtime is shipped to readers.
- [x] Add accessible example tabs with arrow/Home/End keyboard navigation, explicit labels, selected state, and related panels. Include every alternative in Markdown and local search.
- [x] Remove the shared wordmark dot and decorative starter-kit dot; remove unused decorative-dot styles. Preserve semantic list bullets, data indicators, and punctuation.
- [x] Include new guides automatically in navigation, search, sitemap and llms.txt through the shared document collection.

## Capability boundaries

The CLI package is `@spawnkit/cli`. Public instructions use `pnpm dlx @spawnkit/cli` or a global installation; generated projects do not depend on a repository checkout. See the [CLI release record](cli-release-and-remote-agents.md) for registry verification.

Generated projects and hosted source deployments currently use pnpm. Tabs are available for genuinely equivalent formats/shells. npm/Yarn/Bun workflows must be verified through generated project configuration and hosted lockfile handling before adding supported package-manager tabs.

Browser ZIP upload creates a new project. The update guide targets an existing project through the implemented CLI flow and does not invent a browser update operation. Rollback does not reverse database migrations.

## Validation

- [x] Full repository verification (`work/docs-reference-verify.log`). The first coverage run hit a shared Vitest-cache file lock; sequential coverage passed, then the full verification passed.
- [x] Desktop/mobile acceptance: all 20 checks pass across the final suite and focused rerun (`work/docs-reference-browser-final.log`: 18 existing checks; `work/docs-reference-tabs.log`: 2 new reference checks). New checks cover guide navigation and Markdown, server-rendered highlighting, theme colors, keyboard tabs, exact code copying, search, and responsive layout. Test timing was corrected to await hydration and theme-menu closure.
- [x] Production deployment: dashboard version `e333dfc2-1585-4cf6-9ef6-e8f113ba8da7` (`work/docs-reference-deploy.log`). All 10 HTML guides return 200 with one canonical, expected anchors, and syntax tokens; their Markdown matches the maintained source (`work/docs-reference-live.json`). All five new guides are present in `/sitemaps/pages.xml`; llms.txt includes the new references. Live browser switching to JSON showed 50 highlighted tokens (`work/docs-reference-live.png`).

Implementation: `apps/dashboard/src/lib/docs-reference.ts`, shared document renderer, and `apps/dashboard/docs-highlight.ts`. Existing guide URLs and anchors are preserved.
