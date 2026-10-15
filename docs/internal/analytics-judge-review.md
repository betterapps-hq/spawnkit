# Analytics information architecture: LLM judge review

2026-10-14. Scope: the interactive Analytics experience in Storybook, including metric meaning, navigation, investigation continuity, presentation and access/data boundaries. This is a design review, not a certification of live AI, backend scalability or Sentry feature parity.

## Method

Three separate LLM reviewers worked independently, with no implementation responsibility: information architecture, data/workflows, and visual presentation/accessibility. They used the current source, rendered desktop/mobile screenshots and the existing feature study. The IA reviewer also reproduced the alert-return defect and its correction in the running Storybook. Reviewers scored their own criteria from 1 (materially deficient) to 5 (excellent), identified concrete failures, and supplied acceptance conditions. These are qualitative judgments from separate contexts, not different-model consensus or human usability research.

The implementation was revised after the first review, then reviewed again. Targeted closure checks resolved the two remaining substantive defects found in the second round. Automated browser and metric tests provide separate behavioral evidence.

## Decision

Replace eight equal tabs with four primary destinations and one utility:

| Destination | Owns |
| --- | --- |
| Overview | Urgent issue, diagnostic health, compact engagement summary |
| Players | Activity, active playtime, new/returning players, retention and cohort comparison |
| Health | Issues, Performance, Releases; issue and trace details |
| Explore | Events, Sessions; session details |
| Alerts utility | Rule drafts and an independent test scope |

All primary choices remain visible on mobile. Existing functionality remains reachable in one or two navigation choices. Health and Explore show their local choices only when relevant. A More menu was rejected because it hides the tools; a broad Investigate destination was rejected because it mixes diagnosis with evidence without a clear boundary.

## Findings and corrections

| Finding | Correction and acceptance evidence |
| --- | --- |
| Eight peer tabs mix outcomes, diagnosis, evidence and configuration | Four primary sections, contextual local navigation and named Alerts utility; browser checks assert all four fully fit the viewport |
| The urgent save regression was below a large engagement dashboard | Overview prioritizes severity, regression, then affected sessions; the issue and action are visible in the first desktop/mobile viewport |
| Overview repeats the entire Players dashboard | Compact DAU/MAU/playtime summary and trend; detailed engagement and retention stay in Players |
| Global diagnostic filters imply they control complete-day player metrics | Environment alone is global; release/time controls sit beside diagnostic content and are absent from Players |
| Release-filtered returns can misclassify an upgrading player as churn | Player identities and cohort returns span releases; a regression test follows an identity from one release to another |
| Missing rollups appear as zero activity | Explicit complete UTC coverage; missing and partial windows show unavailable values, known-zero days remain zero, and charts preserve gaps |
| AI → trace → Back discards findings and reviewed checks | Mounted detail trail and scope snapshots preserve result, context, selected pane and checklist; trace return reopens the result |
| Release and alert detours lose the originating view | Release selectors and original scope survive; Alerts uses independent test filters. The reviewer verified both alert filters can change before returning to the same AI Verify pane and checked item |
| Generic evidence routes to whichever session is first | Trace citations bind session ID and operation; source locations and line numbers use supplied fixture context |
| Session actions open a save trace for unrelated failures | Known issue operation selects the trace; other actions explicitly say Inspect save trace. Browser checks follow renderer, asset and frame issues through session and trace |
| Load failures show Completed and save traces imply an unproven retry | Operation-specific fixture outcomes; failed asset fetches have no unexecuted downstream spans; error handling replaces invented retry evidence |
| Mobile retention hides D30 and wraps footer dates | Visible return-day selector, compact three-column table and stacked pagination; cohort rows open real return-rate comparisons |
| Supporting numbers and metric labels are inconsistent | Larger supporting text, metric-definition tooltips, aligned health values and shortened issue sorting label |

## Final scores

| Reviewer / criterion | Initial | Final |
| --- | --- | --- |
| IA: findability | 3 | 4 |
| IA: conceptual clarity | 2 | 4 |
| IA: progressive disclosure | 2 | 4 |
| IA: context preservation | 1 | 4 |
| IA: mobile fit | 2 | 4 |
| Data: metric truthfulness | 3 | 4.5 |
| Data: decision usefulness | 3 | 4.5 |
| Data: diagnostic continuity | 2 | 4.5 |
| Data: AI evidence/action usefulness | 3 | 4.5 |
| Data: capability honesty | 4 | 4.5 |
| Visual: information architecture | 2 | 4 |
| Visual: signal prioritization | 2 | 4 |
| Visual: metric clarity | 3 | 4 |
| Visual: AI investigation | 4 | 4 |
| Visual: desktop presentation | 4 | 4 |
| Visual: mobile presentation | 2 | 4 |
| Visual: accessibility | 3 | 4 |

All three reviewers accepted the revised experience for the Storybook walkthrough. No critical or major findings remain in this scope. Their acceptance requires the final behavioral checks to pass. A collapsible event breakdown remains an optional future improvement, not a blocker.

## Metric coverage and executive decisions

The design covers acquisition (new/returning), engagement (DAU/WAU/MAU, stickiness, hours, session duration/frequency), retention (exact-day returns and comparisons), progression (completion of joined attempt cohorts), reliability (issues and recorded-session denominators), performance (scene/save/frame timings), release regression, and investigation evidence.

Revenue, ARPDAU, payer conversion and LTV need commerce events. Concurrency needs reliable presence. Engine replay, CPU profiles and player feedback need dedicated capture. They remain explicit future capabilities rather than empty tiles or estimates inferred from sampled diagnostics. Production should query bounded tenant aggregates, not transfer the fixture's raw player-day history. Daily coverage cannot bridge a missing rollup day; completion events must join the attempt's start cohort across midnight.

The AI design includes evidence, uncertainty, a proposed fix, review checks and a coding-agent export. Its adapter is still Storybook-only. Actual source retrieval, durable AI jobs, tenant authorization, quotas, repository changes and notification delivery remain backend work, described in [the experience specification](../analytics-experience.md).

## Verification receipts

- Full repository gate: `pnpm verify` (formatting, lint, types, unused-code checks, coverage and production builds).
- Static review build: `pnpm build:storybook`.
- 32 browser checks across desktop/mobile, including visible navigation/urgency, player coverage, upgrade-safe scope, AI evidence round trips, alert filter isolation, release origin restoration and non-save traces.
- Five player-metric unit tests cover identities, units, UTC windows, coverage, cross-release returns and weighted exact-day retention; original diagnostic model tests remain passing.
- 15 representative light/dark/mobile accessibility scans: no WCAG 2 A/AA or 2.1 AA violations. Screenshots were also visually inspected. This is not complete accessibility certification.

Receipts live under ignored `work/analytics-v3-*`: `browser.log`, `accessibility.json`, `verify.log`, `build.log` and screenshots. Browser artifacts use a separate output directory to avoid collisions with concurrent work in this shared checkout.

The final main browser run passed 30 checks; the two new trace checks initially had an ambiguous text selector matching the preserved hidden parent. After restricting that assertion to visible content, both passed in `work/analytics-v3-trace-browser.log`. The 15 accessibility checks comprise 13 screen/state scans plus desktop/mobile cohort-dialog scans in `work/analytics-v3-cohort-accessibility.json`.

Repository verification also exposed shared development-tooling issues: generated Vite caches were entering formatting checks, a Windows lint glob found no files, and unused-code analysis did not understand the local host binary, public development helper, or dashboard-owned Storybook build dependency. Cache ignores, explicit lint paths and narrowly scoped Knip declarations address those checks. Formatting changes preserve the concurrently edited functionality.
