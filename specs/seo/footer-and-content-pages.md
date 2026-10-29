# Footer and content page audit

Updated: 2026-10-17. Implemented, deployed to production, and verified live. Articles and blog posts remain last.

## Completed implementation

- [x] Remove social icons and placeholder GitHub, Discord, and social-profile destinations.
- [x] Replace compound footer labels with task names: Play, Starter kits, Documentation, Code with AI, and SpawnKit.
- [x] Link directly to kit pages, onboarding, uploads, the dashboard guide, testing, publishing, CLI reference, API resources, and all three AI-agent guides.
- [x] Add Documentation to desktop navigation and the mobile menu. Build `/docs` as a useful overview of every current guide, grouped into Build, Guides, and Reference.
- [x] Rewrite About, Help, Contact, and Community guidelines around implemented features and useful next steps.
- [x] Add Contact and the documentation overview to shared metadata and sitemap eligibility.
- [x] Use three standard content layouts: resource hub (About, Help, Contact, docs overview), reading page (guidelines, privacy, terms), and documentation guide (existing sidebar, examples, and outline).
- [x] Use descriptive page titles instead of large promotional slogans. Add a visible Home breadcrumb, one H1, readable line lengths, and consistent section spacing.
- [x] Load the intended Inter variable font locally; preload the 48 KB Latin font. Typography previously depended on system fallbacks. Other subsets load only when needed. [Fontsource implementation reference](https://fontsource.org/docs/getting-started/variable).
- [x] Remove “Made for the web. Built by you.” Replace the footer description with “Discover browser games. Create and publish your own with AI.”
- [x] Correct UTF-8 character corruption, including the copyright symbol. Check linked pages for the same defect.
- [x] Use responsive footer columns, semantic navigation groups, touch-sized links, and visible keyboard focus.
- [x] Reproduce and resolve the local docs syntax-highlighting module failure. Both the isolated preview and `local.spawnkit.cloud` now resolve the module and render highlighted examples.
- [x] Keep sticky documentation sidebars below the shared header with a 24px gap, viewport-bounded scrolling, and matching section-anchor offsets on desktop, tablet, and phone.

## Destination audit

| Destination                                                     | Decision and resulting content                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/browse`                                                       | Keep: complete browser-game catalog. Link as Browse games.                                                                                 |
| `/templates` and `/kits/{pixi,phaser,three,babylon}`            | Keep: real downloadable starter projects. Link directly to each engine.                                                                    |
| `/cloud#pricing`                                                | Keep: hosting availability and pricing live on the Cloud page. Remove the retired `/pricing` route and point callers directly here.        |
| `/docs`                                                         | Built: all current guides, grouped by task and reference.                                                                                  |
| `/docs/getting-started`                                         | Keep and feature: standalone kit setup.                                                                                                    |
| `/docs/upload-existing-game`                                    | Keep and feature: static build requirements and upload workflow.                                                                           |
| `/docs/dashboard`                                               | Keep and feature: project navigation and hosted workflows.                                                                                 |
| `/docs/testing` and `/docs/publishing`                          | Keep: verification and deployment instructions.                                                                                            |
| `/docs/{codex,claude-code,cursor}`                              | Keep and feature: agent-specific project onboarding.                                                                                       |
| `/docs/cli` and `/docs/api`                                     | Keep: current CLI/API contracts, with CLI publication status stated accurately.                                                            |
| `/about`                                                        | Rewritten: what SpawnKit provides, current availability, and direct setup links.                                                           |
| `/help`                                                         | Rewritten: task directory, player controls, loading issues, feedback, reports, activity counts, and support. `#playing` is a real section. |
| `/contact`                                                      | Rewritten: working support email, useful diagnostic details, privacy requests, and relevant guides. `#support` is a real section.          |
| `/community-guidelines`                                         | Rewritten: feedback, rights, reports, moderation, and contact links.                                                                       |
| `/privacy` and `/terms`                                         | Keep existing policies; apply the reading layout. Remove the obsolete browser migration-backup claim from Privacy.                         |
| Social icons and `/contact#github`, social/Discord placeholders | Removed. Do not advertise accounts or communities that have no verified destination.                                                       |

## Pages still to build, in priority order

These are proposed pages, not empty routes. Do not add them to the footer or sitemap until they deliver the described content.

| Priority | Page                                              | Required substance and internal links                                                                                                                                                                                      | Status                                      |
| -------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1        | `/docs/choose-a-kit`                              | Compare the four actual engines, 2D/3D use cases, supported combinations, and kit downloads. Derive capabilities from the shared catalog. Link from builder, kit pages, and quickstart.                                    | To build                                    |
| 2        | `/docs/hosting-limits`                            | Verified upload, build, media, runtime, quota, and static-hosting limits. Explain failures and recovery; derive numerical limits from their source of truth where possible. Link from upload, Cloud, and dashboard guides. | To build                                    |
| 3        | `/docs/assets`                                    | Import paths, public assets, relative URLs, image/audio formats, current image optimization, cover/trailer rules, and missing-asset diagnosis. Include runnable examples.                                                  | To build                                    |
| 4        | `/docs/engines/{pixi,phaser,three,babylon}`       | Four focused guides based on each generated project: files to edit, actual engine API examples, development, build, and browser checks. Cross-link the matching kit page.                                                  | To build                                    |
| 5        | `/docs/licensing`                                 | Explain the actual kit license, engine dependencies, game/asset rights, and repository visibility. Confirm repository licensing before stating permissions; link to Terms and publishing.                                  | To build after license confirmation         |
| 6        | `/security`                                       | Verified platform boundaries, a working reporting channel, and supported disclosure process. No unsupported certification or response-time claims.                                                                         | To build after reporting process is defined |
| 7        | `/status`                                         | Real monitored services and incident history. Build monitoring before linking a status page.                                                                                                                               | To build with monitoring                    |
| 8        | `/changelog`                                      | Actual dated releases and links to changed guides. Prefer maintained release data over manually duplicated announcements.                                                                                                  | To build with release workflow              |
| Last     | Blog, articles, case studies, Copy for your agent | Follow Batch 4 after product, programmatic, and documentation improvements.                                                                                                                                                | Deferred by user                            |

## Verification

- [x] Repository verification (`pnpm verify`).
- [x] Desktop/mobile browser checks for all footer URLs and fragment targets, headings, Home links, typography, and light/dark themes.
- [x] Browser checks of all documentation routes, highlighting, tabs, and search.
- [x] Production deployment and live verification.

Verification completed on 2026-10-17. The 26 SEO/browser checks passed across the initial run and targeted reruns. The initial run had one cold-start readiness timeout; it passed on rerun. Screenshot checks now wait for hydration before Playwright modifies caret styles.

The actual `https://local.spawnkit.cloud` site also passed navigation through all 16 guides and seven content pages: HTTP 200, one H1, no Vite error overlay, and no browser page errors. Documentation navigation and overflow checks passed at widths 390, 768, 1024, and 1440.

Evidence in ignored `work/`: `current-footer-verify-final.log`, `current-footer-browser.log`, `current-footer-browser-retry.log`, `current-site-local.log`, and `current-local-docs-{390,768,1024,1440}.png`. Final repository verification passed after the browser-test corrections.

Sticky-navigation follow-up: six desktop/mobile browser checks passed, including sidebar clearance and link hit targets at 1440, 1024, 900, and 390px widths, sidebar scrolling on a 600px-high viewport, search dismissal, and section anchors. The actual local site also verified an 81px header, sidebars beginning at 105px, and working search. Evidence: `work/docs-sticky-browser.log`, `work/docs-sticky-local.log`, and `work/docs-sticky-local.png`.

Full `pnpm verify` also passed after the sticky-navigation fix (`work/docs-sticky-verify.log`).

## Production release

Deployed on 2026-10-17 with `node scripts/deploy.mjs --environment production --component dashboard`, using Cloudflare `cf` and the production configuration. Worker: `spawnkit-dashboard`. Version: `fd606d56-ed46-4dd3-94bb-b935e2993e05`. Live site: https://spawnkit.cloud/docs.

Live browser verification passed for all 16 guides, seven content pages, and 26 unique footer destinations, including fragment targets. Confirmed syntax highlighting, the loaded Inter font, Home links, Documentation navigation, copyright encoding, and removed social links. Sidebar clearance, search dismissal, section anchors, and overflow checks passed at 1440, 1024, 900, and 390px widths with no browser page errors.

Release evidence: `work/docs-footer-production-deploy.log`, `work/docs-footer-production-check.log`, `work/docs-footer-production-evidence.json`, and `work/docs-footer-live-{1440,1024,900,390}.png`.
