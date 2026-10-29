# Builder startup performance

Status: **Done — implemented, verified, and deployed on 2026-10-17.** Measurement timestamps are October 18 UTC.

## Completed work

- [x] Capture repeated cold mobile loads and browser traces for `/templates`.
- [x] Load the shared project generator only when the visitor opens the file preview or downloads a kit. Keep compatibility validation immediate.
- [x] Load ZIP compression only when downloading. Show a recoverable error if the download tools cannot load.
- [x] Generate the preview from the current configuration; prevent an earlier asynchronous result from replacing a newer selection.
- [x] Separate the lightweight documentation route inventory from guide bodies. Load guide bodies inside the documentation route loader, preserving server-rendered content and metadata.
- [x] Separate server-side curated-kit generation from its client-callable server-function module so unused generator imports do not enter the shared startup bundle.
- [x] Load all four initially visible engine images eagerly with responsive high-priority preloads.
- [x] Verify configuration changes, preview/ZIP agreement, failure recovery, documentation, curated kits, and SEO responses.
- [x] Deploy the dashboard to staging and production; repeat performance measurements and browser acceptance on production.

The generator and compatibility contract remain in `@spawn/templates`. Opening the builder no longer generates every project file. The closed preview says “Project files”; opening it loads the generator and displays the actual file count. Downloading uses a snapshot of the selected options. Guide content still appears in the initial HTML on documentation pages.

## Production measurements

Two blocks of five cold loads before the change and two blocks of five after it, on the same machine and production URL. Each load uses a fresh browser context, disabled cache, a 390 × 844 mobile viewport, DPR 1, 4× CPU throttling, 150 ms network latency, 1.6 Mbps download, and 750 Kbps upload. Each block traces its first run. No builds or acceptance suites ran alongside the measurements. Synthetic RUM delivery is suppressed.

Values below are medians across **all ten runs per version**, including the slower post-release block. The confirmation block is not substituted for the first block.

| Measurement                            |        Before |         After | Result                             |
| -------------------------------------- | ------------: | ------------: | ---------------------------------- |
| Startup JavaScript transferred         | 316,531 bytes | 259,457 bytes | 18.0% less                         |
| Largest Contentful Paint               |      3,234 ms |      3,056 ms | 5.5% faster                        |
| Page controls enabled                  |      4,390 ms |      4,343 ms | Roughly unchanged                  |
| Time to first byte                     |        444 ms |        724 ms | Higher in the after sample         |
| LCP after response starts              |      2,849 ms |      2,328 ms | 18.3% faster                       |
| Controls enabled after response starts |      4,013 ms |      3,577 ms | 10.9% faster                       |
| Load-window layout shift               |             0 |             0 | No observed shift after the change |

The response-relative timings are calculated for each run before taking the median. They help distinguish client startup from response-time variation; they are **not** replacements for end-to-end LCP. The initial post-release block had a 4.68-second control-ready median; the confirmation block had 3.72 seconds. Overall control readiness did not improve reliably enough to claim a meaningful end-to-end gain.

All twenty production measurement runs returned 200, had no browser runtime errors or horizontal overflow, and successfully selected Phaser after the startup observation. The maximum observed layout shift before the change was 0.0047; after it was zero. These are lab observations, not field INP, field p75, or a Core Web Vitals pass. The remaining performance investigation is variable server response time and shared application startup; the existing representative-field-window follow-up remains open.

Reproduce with:

```sh
pnpm seo:builder-performance https://spawnkit.cloud measurement 5
```

The command saves raw resource timings, control readiness, long tasks, screenshots, and a browser trace under ignored `work/` paths. The control-ready marker corresponds to the page's enabled controls; the harness also exercises an actual engine selection.

## Verification and release

- `pnpm verify` passed: formatting, lint, types, unused-code checks, configuration tests, coverage suites, and builds.
- Four builder acceptance cases passed on desktop/mobile locally, on staging, and on production: compatible configuration and ZIP contents; preview updates and exact ZIP file agreement; failed module loading and recovery by reload; invalid project-name protection.
- Six SEO browser cases passed across desktop/mobile: initial HTML and metadata, all curated kit downloads, and all 16 documentation guides with highlighted examples and no runtime errors.
- The production HTTP audit checked 46 routes. Current routes returned 200; `/pricing` and the deliberate missing-page check returned the expected 404.
- Production screenshots were inspected; the initial layout is preserved.

| Environment | Dashboard version                      |
| ----------- | -------------------------------------- |
| Staging     | `12f80707-0b6f-4564-9d9d-2d420740e72c` |
| Production  | `4c1a123f-34a1-49c6-8b44-a1409194a56d` |

This release changes the dashboard only. The comparison baseline was dashboard version `7cd8b638-dd0b-4da9-8ed4-8942f8ea1538`.

## Evidence

Ignored local reports:

- `work/builder-startup-before-2026-10-18T06-02-43-998Z.json`
- `work/builder-startup-before-release-2026-10-18T06-16-23-777Z.json`
- `work/builder-startup-after-release-2026-10-18T06-18-14-678Z.json`
- `work/builder-startup-after-confirmation-2026-10-18T06-22-42-313Z.json`
- `work/builder-startup-comparison.json`
- Matching `.trace.json` and `.png` files for each measurement block
- `work/builder-final-verify.log`, `work/builder-browser.log`, `work/builder-seo-browser.log`
- `work/builder-staging-browser.log`, `work/builder-production-browser.log`
- `work/builder-staging-deploy.log`, `work/builder-production-deploy.log`
- `work/seo-audit-spawnkit.cloud-2026-10-18T06-23-45-150Z.json`

The measurement approach follows [web.dev's LCP breakdown](https://web.dev/articles/optimize-lcp) and [Chrome's performance trace reference](https://developer.chrome.com/docs/devtools/performance/reference). Conclusions about this release come from the captured measurements above.
