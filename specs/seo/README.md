# SpawnKit SEO and agent discovery roadmap

Agreed priorities, updated 2026-10-18. Batch 1 and Batch 2 implementation are deployed and verified. Batch 3 now includes the public CLI release, scoped remote authorization, and an assisted Codex publishing journey. Search Console is verified; further indexing review is deferred until enough data accumulates. Copy for your agent belongs in the final phase, Batch 4, alongside blog posts and long-form articles. Small and medium improvements to existing website copy are included throughout.

The objective is to grow qualified player and creator discovery by making existing pages accessible, publishing useful pages from real product data, and helping agents complete actual workflows. No ranking or AI recommendation is guaranteed. The broad term "games" is a long-term ambition; initial targets are browser game creation, supported engine starter kits, hosting, individual games, and useful game categories.

## Delivery order

Status as of 2026-10-18:

- [x] Batch 1: implement the SEO foundation, run the initial production HTTP audit and pass repository and desktop/mobile acceptance checks.
- [x] Batch 1: deploy, verify the Search Console Domain property, submit the sitemap and confirm successful Google live fetches.
- [x] Batch 1: record current game activity and deployment totals; start search-data collection.
- [ ] Batch 1 measurement follow-up: collect the first 28 days, review indexed canonicals and establish attributable creator conversions.
- [x] Batch 2: deploy six supported starter-kit pages, working downloads, complete catalog pagination, optional game facts and related links.
- [x] Batch 2: measure mobile loading and deploy responsive images; builder lab LCP improved from 4.7 to 3.0 seconds in the recorded comparison.
- [x] Batch 2: add interaction and embedded-game load diagnostics; verify the existing field-metrics collector.
- [x] Batch 2 initial measurement follow-up: review available field performance and new-page indexing before expanding inventory; Phaser kit indexed and docs crawl requested. See [evidence and sample limits](selected-follow-ups-2026-10-17.md).
- [ ] Batch 2 measurement follow-up: collect representative field and search-demand cohorts before expanding inventory.
- [x] Batch 2 game-performance follow-up: optimize and approve a new Orchard Snake release, add bounded lossless upload compression and large-image diagnostics, and verify gameplay readiness. Background 2.96 MB → 281 KB; cold mobile frame load 19.5 → 6.1 seconds.
- [x] Batch 3 selected scope: publish shared agent documentation, catalog, scoped OpenAPI, skills, generated AGENTS.md, llms.txt and an accurate auth.md; add local CLI auth status.
- [x] Measurement infrastructure: deploy opt-in curated-kit conversion cohorts and retrieve initial field/crawler reports.
- [x] Batch 3 follow-up: publish `@spawnkit/cli`, verify pnpm installation, and deploy scoped remote-agent authorization with server-side revocation. See the [release evidence](cli-release-and-remote-agents.md).
- [x] Batch 3 evaluation: complete and record the fresh Codex-assisted journey through npm creation, tests, build, scoped hosted publishing, gameplay verification, revocation, and fixture cleanup. Claude Code is skipped at the owner's request and Cursor is unavailable. Fully unattended sandbox execution remains unverified.
- [x] Batch 3 selected follow-up: Codex-assisted game creation, terminal-assisted verification, and live staging failure/recovery acceptance; unattended and additional-agent runs remain open.
- [x] Batch 2 existing-game follow-up: deploy and approve Art of the Steal's deferred/compressed artwork (80.4% fewer startup image bytes) and remove duplicate background transfers in Prism Break and Starfall Squadron. Fix the uploader's empty-warning database error.
- [ ] Batch 4: add Copy for your agent, write articles and develop editorial distribution after the product improvements.
- [x] Documentation: expand the reference library, add highlighting and example tabs, and remove decorative/wordmark dots.
- [x] Documentation: reorganize Build/Guides/Reference, add agent and dashboard workflows, correct standalone CLI guidance, and complete the three-perspective copy review. Deployed and verified; see [corrections and test setup](docs-corrections-and-testing.md) for release validation.
- [x] Developer experience: integrate automatic browser preparation for test add-ons and unify TypeScript/JSON configuration filenames across templates, builds, uploads, and docs. Only the current configuration contract is supported.

| Batch                                   | Scope                                                                                                | Completion gate                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [1 Foundation](batch-1.md)              | Crawl verification, measurement baseline, shared SEO infrastructure, existing-page metadata and copy | Public content can be retrieved and understood, indexing policies are explicit, failures have correct responses |
| [2 Product pages](batch-2.md)           | Engine and selected composition pages, game metadata and category discovery, measured performance    | Each indexed page supplies working functionality or sufficient real inventory                                   |
| [3 Agent workflows](batch-3.md)         | Skills, Markdown docs, llms.txt, catalog/API contracts, auth.md and agent authorization              | Supported agent workflows produce working games using verified instructions                                     |
| [4 Editorial and authority](batch-4.md) | Copy for your agent, articles, tutorials, case studies, original research and distribution           | Copied instructions work, and topics address observed demand and gaps after product improvements                |

## Current site quality work

- [Footer audit, content layouts, and pages to build](footer-and-content-pages.md)
- [Current implementation cleanup](current-implementation-cleanup.md)
- [Selected follow-ups: release, agent journey, indexing and measurement](selected-follow-ups-2026-10-17.md)
- [Builder startup performance — completed and deployed](builder-startup-performance.md)
- [Public CLI release and remote-agent publishing](cli-release-and-remote-agents.md)

## Shared architecture

- `@spawn/templates` owns catalog, composition, compatibility and generation. The builder, programmatic pages, downloads, copied prompts and skill references consume that contract.
- Shared public metadata owns titles, descriptions, canonical URLs, social previews and sitemap eligibility.
- Approved public game records supply player pages and sitemap inventory. Hidden, restricted, unapproved and unavailable games must not enter discovery sitemaps.
- Keep local project creation account-free and generated projects standalone. Never overwrite user files silently.
- Use accurate capability and price information. Describe only implemented services and targets, and use the verified `@spawnkit/cli` distribution.
- Retain stable `/play/<projectId>` URLs. Do not migrate URLs solely to add keywords.

## Measurement

Track player discovery separately from creator and hosting discovery. Search Console should establish nonbrand impressions, clicks, indexed canonical pages and query/page cohorts. Product outcomes are successful plays, kit downloads, local setup success when explicitly observable, and first deployments. File fetches and copied prompts are not proof of AI recommendations or completed setup.

Use [the Batch 1 operations checklist](batch-1.md#production-verification-and-measurement) and [rollout evidence](rollout-2026-10-17.md). Review technical failures weekly and content/page-family performance monthly. Expand page families only after checking correctness, distinct usefulness, indexing and relevant demand. These are review cadences, not scheduled automations.

## Sources and evidence boundaries

- [Google AI search guidance](https://developers.google.com/search/docs/appearance/ai-features): ordinary SEO foundations remain applicable; special AI files are not required for Google's AI features.
- [Google faceted navigation guidance](https://developers.google.com/crawling/docs/faceted-navigation): uncontrolled combinations can consume crawling resources.
- [Google generated-content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content): scaled pages need user value.
- [llms.txt proposal](https://llmstxt.org/), [Agent Skills specification](https://agentskills.io/specification), [auth.md integration guidance](https://workos.com/auth-md/docs/apps): implementation references for Batch 3, to reverify when that batch starts.

Keyword volumes, difficulty, backlinks and actual Search Console performance have not been established. Semrush reported insufficient API units during the initial review. Do not use invented traffic forecasts or treat a repository check as production verification.
