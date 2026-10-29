# Batch 1 SEO foundation

Authorized scope: shared SEO infrastructure and improvements to existing pages. Skills and auth.md are in Batch 3; Copy for your agent is deferred to Batch 4 with editorial content. New programmatic landing pages are in Batch 2.

Status, 2026-10-17: implemented, deployed and verified in production. Search Console Domain ownership is verified and the sitemap was processed successfully. Historical search metrics and attributable conversion reporting remain follow-up work; see [rollout evidence](rollout-2026-10-17.md).

## Completed implementation

- [x] Establish a repeatable read-only production HTTP and metadata baseline.
- [x] Check anonymous public access and document the differing 403/200 observations.
- [x] Centralize titles, descriptions, canonical URLs, social metadata and structured data for existing public pages.
- [x] Populate approved game metadata from its actual record; safely serialize creator text into JSON-LD.
- [x] Add a production robots.txt and sitemap index with static pages and bounded game shards.
- [x] Keep sitemap inventory independent of discovery's newest-100 limit. Exclude hidden/restricted, pending, rejected, unpublished and unavailable releases.
- [x] Define production, staging/preview, private-page and search/filter indexing rules.
- [x] Link directly to current canonical pages and stable `/play/<projectId>` game addresses.
- [x] Distinguish catalog outages from an empty catalog; return a temporary failure response and useful recovery content.
- [x] Improve concise existing-page copy and contextual links without claiming unavailable features.
- [x] Run repository verification and relevant desktop/mobile browser acceptance checks.

## URL policy

| Surface                                                                 | Policy                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Production public pages                                                 | Self canonical on `https://spawnkit.cloud`, useful initial HTML, included in static sitemap |
| Approved discoverable game                                              | `/play/<projectId>` canonical and game metadata; included in game sitemap                   |
| Hidden game with a working direct URL                                   | Accessible under existing moderation policy, but noindex and excluded from sitemap          |
| Homepage search/filter/sort URLs                                        | Noindex, follow; canonical homepage; excluded from sitemap                                  |
| Template engine selection and tracking parameters                       | Canonical clean public path; no separate landing-page claim                                 |
| Dashboard, sign-in, CLI consent, invitations, admin, internal functions | Noindex; omitted from sitemap; authentication still controls access                         |
| Staging, previews, local and alternate hosts                            | Noindex HTTP header, robots disallow, no public sitemap inventory                           |
| Missing content                                                         | Real 404 plus noindex                                                                       |
| Temporary catalog failure                                               | 503 and Retry-After; never imply the inventory was deleted                                  |

Initially allow crawling of public filtered pages so crawlers can observe noindex. Do not combine a robots block with a newly required noindex instruction. Consider narrower crawl restrictions later if logs show a material facet problem. Nonproduction robots restrictions are additional protection, not authorization.

Do not add invented ratings, aggregate offers, release dates or lastmod timestamps. Social fallbacks should represent SpawnKit; game artwork must come from approved game media. Structured data matches visible facts and does not promise rich-result eligibility.

## Acceptance

Local acceptance passed; see delivery evidence below. The regression checks inspect HTTP status and initial HTML, not only hydrated DOM. Coverage includes canonical uniqueness, descriptions, approved game metadata, JSON-LD escaping, sitemap XML and pagination, hidden/unpublished exclusion, nonproduction/private headers, filter normalization, HEAD responses, method handling, failures and permanent redirects. Mobile layout and ordinary navigation were checked after the copy edits. The existing nonce-based CSP and private HTML caching policy are preserved.

## Production verification and measurement

- [x] Run the initial `pnpm seo:audit` and save the JSON report in ignored `work/`. It reads public URLs only and records status, robots headers, canonical and metadata presence. It is not a ranking report or an authenticated crawler simulation.
- [x] Deploy the control API, then the dashboard, using the deployment order in the delivery evidence below.
- [x] Verify the Domain property for `spawnkit.cloud` in Google Search Console and submit `https://spawnkit.cloud/sitemap.xml`. Google reported successful sitemap processing and 13 discovered pages before Batch 2 expanded it to 20 public URLs.
- [x] Confirm homepage, creator and template pages are available to Google using Live URL Inspection. The homepage and templates were already indexed; the creator page was discovered but not indexed, and an indexing request was accepted.
- [x] Finish representative hosting and game Live URL Inspection: `/cloud` and Orchard Snake were already indexed, and both live tests passed with valid breadcrumbs.
- [ ] Review Google-selected canonicals after recrawling the new metadata and page families.
- [x] Verify actual Google live fetches succeed and inspect Cloudflare bot/WAF configuration. No WAF or crawler policy was changed. User-agent spoofing was not used as proof.
- [ ] Review ongoing verified crawler traffic and challenge decisions when traffic history is available.
- [ ] Record a 28-day baseline by country/device and branded versus nonbrand query, plus page-family impressions, clicks, CTR and indexing coverage. If the property is new, begin collection instead of inventing historical metrics.
- [x] Record existing game view/play totals and current hosting deployment outcomes: four games, 24 views and 11 plays; 42 successful and nine failed production deployment records at the baseline snapshot. These include team activity and are not SEO-attributed conversions.
- [x] Establish opt-in curated-kit attribution and first-deployment cohorts in production D1. Copied folders share a download ID; deployed projects count separately. The clean initial baseline is empty; local starts and SEO-source attribution are unobserved.
- [x] Repeat the production HTTP audit, validate initial metadata and structured-data serialization, and confirm successful Google sitemap processing. Google live inspection also detected valid breadcrumbs.
- [ ] Recheck sitemap processing, indexing and Google-selected canonicals at the next weekly review.

## Initial live observation

On 2026-10-17, ordinary Node HTTP requests returned 200 for `/`, `/create`, and `/robots.txt`; `/sitemap.xml` returned 404. The robots response contained an edge-provided content-signal explanatory preamble, without a sitemap directive. Earlier requests from other tooling returned 403. Googlebot access and Search Console ownership were still unverified at that initial observation; the rollout checklist above records the later verification. No Cloudflare account settings were changed by the initial audit.

## Delivery evidence

Implemented locally on 2026-10-17. `pnpm verify` passed formatting, lint, types, unused-code checks, configuration checks, unit coverage and production builds, including Storybook. `pnpm exec playwright test --config playwright.seo.config.ts` passed all 10 desktop/mobile checks. The dedicated harness runs the real SSR app with local catalog fixtures and does not mutate hosted data. Unit checks include a real SQLite inventory of 1,001 games, moderation exclusion and sitemap shard boundaries. Creator-page mobile layout and the branded social image were visually inspected.

The initial read-only production audit is stored at `work/seo-audit-spawnkit.cloud-2026-10-17T18-52-56-083Z.json` (ignored local output). Public marketing pages returned 200 without canonical links; `/sitemap.xml` returned 404; `/pricing` returned 307. These are pre-deployment observations. The post-deployment audit at `work/seo-audit-spawnkit.cloud-2026-10-17T19-48-22-197Z.json` confirms public pages with one canonical each, working robots/sitemaps, a permanent pricing redirect, private/filter noindex policies and real missing-page 404s. Search Console setup and production snapshots are documented in the rollout evidence.

Deploy the control API before the dashboard: the new public `GET /api/platform/v1/games/sitemap?page=1` supplies 1,000-record shards and a total count, and game records now identify whether they are discoverable. Deploying the dashboard against an older API correctly leaves its game sitemap temporarily unavailable. Then deploy the dashboard, repeat the audit and check the edge-served robots body still includes the application directives and sitemap after Cloudflare's existing content-signal processing. No edge settings were changed.

The initial page family uses nine static canonical routes and approved game pages. Game shards use stable project-ID ordering, omit speculative lastmod timestamps and remain uncached so moderation changes do not wait on a new sitemap cache. The sitemap index returns 503 rather than publish a partial catalog if its inventory service fails. A future larger rollout should measure count/query cost and add invalidation-aware caching if needed.

Initial verified-crawler HTTP responses were reviewed on 2026-10-17 through cf SQL Analytics. Continue the ongoing traffic/challenge review; status codes alone do not identify challenge decisions. Search Console still reports processing. See the agent-discovery delivery evidence in the rollout report.
