# Batch 2 Product driven landing pages

Start after Batch 1's shared infrastructure is working. This batch publishes useful product surfaces from structured records, with small editorial explanations rather than a blog program.

Status, 2026-10-17: product pages, downloads, game facts, catalog discovery and measured responsive-image improvements are implemented, deployed and verified. Search indexing, inventory growth and field performance remain ongoing measurement work. See [rollout evidence](rollout-2026-10-17.md).

## Tasks

- [x] Create one server-rendered page per supported engine, driven by `@spawn/templates`: `/kits/pixi`, `/kits/phaser`, `/kits/babylon`, `/kits/three`.
- [x] Provide actual configuration, prerequisites, generated-file lists, source previews and account-free ZIP downloads. Artwork is labeled as an illustration; the source preview comes from the generated project.
- [x] Add two supported compositions: `/kits/phaser-arcade` and `/kits/three-rapier`. All six resolve through the shared composition contract; combinations are not automatically enumerated.
- [x] Gate publication through the curated allowlist, composition validation and checks for working downloads/builds, canonical URLs, metadata and related links. Unknown kit paths return 404.
- [x] Extend game metadata with optional objectives, controls, device support, creator attribution and permitted source/kit links. Owners provide facts through listing configuration or dashboard settings; missing facts are not invented. Source links require HTTPS, a license and explicit permission.
- [x] Add contextual related-game and related-kit links from real records and declared kit IDs.
- [x] Implement category routes and sitemap eligibility with a five-approved-game minimum. Current inventory has no eligible category, so those URLs return 404 and are not advertised. Five is a product threshold, not a search-engine rule.
- [x] Keep existing homepage search/filter/sort URLs outside the index with noindex and a clean canonical (completed in Batch 1).
- [x] Add `/browse` with 24 games per page, stable ordering, real previous/next links and self-canonical page URLs. Category routes use the same pagination. Page 1 redirects permanently to the clean path; out-of-range pages return 404. Invalid values normalize to the invalid page-0 route and return 404; arbitrary filters remain noindex.
- [x] Measure cold mobile lab LCP, load-window CLS, TTFB, transferred JavaScript, overflow and runtime failures. Add repeatable `pnpm seo:performance` reports.
- [x] Optimize builder startup imports and visible-image loading; verify and deploy. Ten before/after production loads show 18% less initial JavaScript and LCP improving from 3.23 s to 3.06 s; overall control readiness is roughly unchanged. See [builder startup measurements](builder-startup-performance.md).
- [x] Deploy responsive 320/640-pixel engine illustrations and compare production lab performance. Builder LCP moved from 4,744 ms before Batch 2 to 3,040 ms after the image change; the new Phaser page measured 2,028 ms. The initial priority-only change did not help, so the final implementation addresses measured image transfer size. These are single lab samples, not field results.
- [x] Extend the repeatable lab audit with mobile menu, engine-selection and file-preview interaction timings, network failures, and embedded-game document/resource timing. Synthetic runs suppress game counters and Cloudflare RUM delivery. Frame loading is reported separately from gameplay readiness.
- [x] Confirm existing Cloudflare real-user monitoring is enabled for `spawnkit.cloud`, with automatic injection and the existing EU exclusion preserved. No extra collector was installed.
- [x] Retrieve and review the initial field p75 LCP/INP/CLS by public path and device with pnpm seo:field. Early cohorts are small and may contain team/test traffic; this is not a stable Core Web Vitals pass.
- [ ] Review a representative longer field window, including starter-kit pages once sufficient data exists.
- [x] Establish the version-1 `spawnkit:ready` contract in Orchard Snake after artwork/font loading and rendering, and verify exact frame source/origin in the lab collector. Other games remain unknown until they implement and validate the contract; no loading UI was shipped.
- [x] Optimize Orchard Snake's background in its source and publish through the normal release/review workflow. The approved new release serves a 281,198-byte WebP at original dimensions, versus the 2,956,496-byte PNG. The original release remains immutable. Cold mobile frame load improved from 19,529 to 6,139 ms; verified readiness measured 6,458 ms.
- [x] Extend the isolated upload media job with bounded, lossless PNG recompression and build-log warnings for game images above 512 KiB. Preserve paths, pixels and metadata, retain originals when unsupported or no smaller, and avoid automatic lossy texture conversions.
- [ ] Review new-page indexing and relevant usage before expanding a page family.
- [x] Publish and approve optimized existing releases for The Art of the Steal, Prism Break and Starfall Squadron. Art's fresh-start images decreased 80.4%; the arcade games no longer download their background twice. Hosted gameplay, chapter artwork and public catalog pointers verified. Fix the empty-warning database batch exposed during deployment.

## Performance acceptance

Target field mobile p75 LCP at most 2.5 seconds, INP at most 200 milliseconds and CLS at most 0.1 when enough real-user data exists. Record lab measurements separately. Reserve image dimensions, serve appropriate image sizes and defer optional demonstrations. Keep usable initial HTML and safe authentication/CSP boundaries when considering caching.

## Content and lifecycle rules

Every indexed page must provide working functionality, distinct supported configuration or useful inventory. Avoid pages that differ only by keywords. Retire or merge weak collections deliberately; do not silently redirect unrelated retired pages to the homepage. Revalidate templates after dependency changes, and remove unpublished games promptly. Use source/remix links only with creator permission and suitable licensing.

## Implementation and acceptance

`packages/templates/src/kits.ts` owns the six public recipes. The kit page and `/downloads/kits/<id>.zip` use the same resolved plan. ZIP tests compare every extracted file against that plan. All six exact recipes passed dependency installation, linting, coverage, production build and browser gameplay smoke checks; two additional composed configurations also passed.

Migration `0022_game_details.sql` adds optional details to submissions and listing overrides. Production migration and API deployment precede the dashboard. Existing review permissions, visibility rules, version checks and audit boundaries remain in place. Public facts are bounded plain text; source links are never fetched by the server and are rendered with user-content/no-follow protections.

Repository verification, 14 desktop/mobile SEO browser checks and 10 community browser checks passed. Coverage includes initial HTML, working downloads, category eligibility, pagination, outage responses, related facts and source-link consent. The public production check downloaded and opened all six ZIPs and verified metadata, sitemap membership, redirects and missing-page responses.

The follow-up audit on the same day again found 13 public pages with 200 responses and exactly one canonical. Eight scripted mobile interactions completed successfully; the longest observed event was 168 ms for engine selection. Evidence and measurement limits are recorded in [the rollout report](rollout-2026-10-17.md#batch-2-measurement-follow-up).

Do not populate existing games' optional facts without creator evidence. Do not mark category publication or new-page indexing as achieved merely because the route implementation exists. Skills, auth.md and llms.txt remain Batch 3. Copy for your agent is deferred to Batch 4 with articles; neither is part of Batch 2.
