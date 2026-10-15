# SpawnKit Analytics: research and Storybook experience

2026-10-14. This is a UX design and interactive prototype, not a claim that SpawnKit has deployed every Sentry backend feature. Analytics is a separate project destination from Logs. Logs answers “what happened, in order?” Analytics answers “what is hurting the game, who is affected, what changed, and what should I investigate?”

## Sentry feature inventory

The following summarizes current official documentation, checked on 2026-10-14. Product names have changed over time: current documentation places curated Insights under Sentry Dashboards, uses Trace Explorer, and separates monitors from alert actions. Platform, plan, instrumentation and sampling affect availability. Older documentation about the retired metrics beta should not be confused with the current Application Metrics dataset.

### 1. Issue discovery and prioritization

Sentry groups repeated error events by fingerprint into an issue. The issue stream exposes type, description, project, first/last seen, frequency and affected users. Search can use browser, device, unhandled state and other event properties; saved searches preserve an investigation. Sorting can favor recency, frequency, impacted users or recommended priority. Errors are only one category: performance and other detected problems share the workflow. Event quotas are distinct from issue counts, an important distinction when presenting volume. The design lesson is to make a prioritized problem list the actionable center of the product, instead of asking developers to interpret thousands of individual log rows. [Issues](https://docs.sentry.io/product/issues/), [issue query API](https://docs.sentry.io/api/events/list-a-projects-issues/).

### 2. Issue investigation and collaboration

The issue detail page combines an occurrence graph, event filtering and a representative event with stack traces, breadcrumbs and tags. It also exposes first/last seen, activity, linked work items, participants, related replay and feedback. Workflow controls include ownership, priority, resolve/archive and subscription. This gives both the aggregate impact and a concrete example of the failure. SpawnKit should retain the investigation's filters when moving between list and detail, keep triage separate from fixing the underlying code, and distinguish issue-wide information from the selected session's evidence. [Issue details](https://docs.sentry.io/product/issues/issue-details/).

### 3. Performance and automatic detection

Performance monitoring uses SDK instrumentation and distributed tracing to measure operations across application layers. Sentry's curated dashboards cover frontend web vitals, backend queries/caches/queues, mobile starts/screens, and AI execution. Automatic performance issues can identify patterns such as N+1 requests and blocking operations, bringing slow behavior into the same triage feed as exceptions. For SpawnKit, frame time, scene load, save latency and room join latency deserve first-class treatment. A p95 must state its unit, sample population and time window; a slow frame measurement is not proof that an entire session crashed. [Performance monitoring](https://docs.sentry.io/product/performance/).

### 4. Traces and spans

Trace Explorer searches span samples, aggregates numeric attributes and groups operations by dimensions. A trace connects operations across services; spans identify individual timed work. Trace IDs preserve context between requests and provide the link between aggregated performance and a particular execution. A waterfall communicates overlap, critical paths and failure location. SpawnKit's concept includes an inspectable room/save waterfall with a selected span, duration and attributes. The deployed logger currently supports trace correlation only; exporting and storing actual spans is a separate backend milestone. [Trace Explorer](https://docs.sentry.io/product/explore/).

### 5. Structured logs and ad hoc exploration

Sentry's exploration API distinguishes errors, logs, profile functions, spans, application metrics and uptime results. Query fields depend on the dataset. Structured logs can be filtered by attributes and message patterns rather than treated as unstructured text. SpawnKit should offer a simple event explorer with explicit event, outcome and dimension controls, a matching result table, and inspectable attributes. Saved views should store the query, not a stale result snapshot. Raw chronological logs remain accessible separately. [Explore datasets and querying](https://docs.sentry.io/api/explore/query-explore-events-in-table-format/).

### 6. Dashboards and coherent filters

Sentry dashboards combine widgets from several datasets. Global project, environment, release and time filters apply across the view; custom filters target relevant datasets. Time-series zoom changes the shared investigation window. Dashboards can be curated, duplicated or customized, with edit access restricted to teams. SpawnKit's overview should be opinionated for game health, with one shared scope across counts, charts, lists and drilldowns. Empty filtered data must be distinct from no instrumentation. Every chart needs readable labels and a useful path to investigate. [Dashboards](https://docs.sentry.io/product/dashboards/).

### 7. Release health and regressions

Releases connect shipped code to new issues, regressions, adoption and crash-free sessions/users. Sentry can associate commits, identify likely responsible changes, and link resolution to releases. Release details make it possible to assess whether a rollout improved or worsened the experience. SpawnKit should connect operational health to its existing deployment identity, compare two releases with visible sample counts, and let developers filter to a newly introduced issue. Correlation with a deploy is evidence to investigate, not automatic proof of causation. [Releases](https://docs.sentry.io/product/releases/).

### 8. Sessions and replay

Session Replay reconstructs a user's experience with a synchronized timeline of interactions, network requests, console output and errors. It connects frustration signals, feedback and replay context, with access controls. Web and mobile replay have different capture requirements. A game canvas does not become reconstructable merely because DOM replay exists. SpawnKit's first UX therefore provides an event-based player journey, correlated issue and trace context, and a clear statement that no screen recording exists. Actual game replay requires a separate engine-aware capture design, consent model, storage budget and privacy review. [Session Replay](https://docs.sentry.io/product/session-replay/).

### 9. Profiling

Profiling complements spans with function-level execution and call-stack information. Sentry distinguishes continuous backend profiling from UI profiling for slow interactions and animation. Platform support and maturity differ. The important UX pattern is descending from a symptom to expensive work, with units and scope retained. SpawnKit's performance screen includes operation breakdowns and span detail; a CPU flame graph would require actual profile samples and must not be fabricated from logs. [Profiling](https://docs.sentry.io/product/profiling/).

### 10. User feedback

Sentry collects explicit reports through a persistent feedback widget or crash-report modal. Reports can include a description, screenshot, email, associated replay and contextual tags, depending on collection configuration. This captures failures that do not throw exceptions and gives technical evidence a human description. SpawnKit's session detail should eventually associate consented player reports with the technical timeline; email collection is not a default requirement for analytics. [User Feedback](https://docs.sentry.io/product/user-feedback/).

### 11. Monitors, alerts and incident lifecycle

Current Sentry alerts define sources, triggers, filters, actions and throttling. They can send notifications, create work items or call webhooks through configured integrations. Monitors can use thresholds, changes or anomaly detection to create actionable issues. Alert detail includes execution history and connected monitors, with edit permissions. SpawnKit's prototype supports composing a rule, inspecting a threshold preview, and toggling a local rule. It must not claim a Slack notification was sent or a production detector was enabled. [Alerts](https://docs.sentry.io/product/alerts/), [monitor configuration](https://docs.sentry.io/api/monitors/create-a-monitor-for-a-project/).

### 12. Scheduled work and availability

Cron Monitoring checks whether scheduled jobs run and finish within expected timing, allowing detection of misses, timeouts and failures. Uptime results are another exploration dataset. These are different signals from client telemetry. SpawnKit can later use these patterns for scheduled leaderboards, world resets and persistence jobs, but hosted game probes and cron check-ins need explicit collectors. [Cron Monitoring](https://docs.sentry.io/product/crons/), [exploration datasets](https://docs.sentry.io/api/explore/query-explore-events-in-table-format/).

### 13. AI-assisted debugging

Seer connects issue, trace, log, profile and repository context to root-cause analysis, solution proposals and code changes. Its automation can stop at different stages, and source integration is needed for repository actions. The UX lesson is to show the evidence behind an inference and retain review control. SpawnKit now prototypes this workflow with a cancellable investigation, linked evidence, a proposed patch, a verification checklist and an export for a coding agent. A Storybook-only service adapter supplies deterministic responses; no live model or repository writes are connected. [Seer](https://docs.sentry.io/product/ai-in-sentry/seer/).

### 14. Data quality, privacy and operational trust

Sentry distinguishes accepted, filtered and dropped usage and exposes health summaries. Filters, sampling and missing instrumentation affect what any view can conclude. For SpawnKit, observed sessions are not unique people, error-free sessions are not crash-free sessions, and samples are not complete traffic. The design must disclose missing signals, retain units, provide no-data/loading/failure/read-only states, and never present sample game data in an authenticated production view. [Stats](https://docs.sentry.io/product/stats/).

## Experience direction

The goal is a game-focused investigation experience that is competitive with Sentry's connected workflows, not a pixel copy or a false assertion of complete backend parity. Use the existing SpawnKit shell, restrained purple accents, compact typography, precise charts, consistent surfaces and strong visual hierarchy. Red/amber indicate problems; avoid painting every metric as an alert. Lead with impact and next action, then expose diagnostic depth.

| Primary destination | Developer's question | Local views / actions |
| --- | --- | --- |
| Overview | What needs attention? How is the game doing? | Highest-priority regression, diagnostic health, compact player summary and trend |
| Players | Are players playing and returning? | DAU / WAU / MAU, new vs returning, active playtime, exact-day retention, cohort comparison and level completion |
| Health | What should I fix? What changed? | Issues, Performance, Releases |
| Explore | What does the evidence show? | Events, Sessions |
| Alerts (utility) | How will we catch it next time? | Rule drafts, threshold preview, pause/resume and delivery status |

Health owns issue and trace details. Explore owns session details. Back follows the actual investigation path, including across these sections. Local views are intentionally visible only within their parent section; there is no More menu hiding tools. All four primaries fit the mobile viewport.

## Scope and state contract

All preview data is deterministic and isolated to Storybook. Environment is the only global filter. Release and dates apply to diagnostics, beside Game health on Overview and in Health / Explore. Players has its own date selector, always includes all releases, and uses complete UTC-day windows. A player upgrading releases remains in their original acquisition cohort.

The date picker ports Copacker's Shopify-style interaction (`D:/ecommerce/apps/copacker/src/components/period-picker.tsx` and `src/lib/date-range.ts`) to Spawn's existing Shadcn/Radix primitives. Grouped presets, month navigation, two-click ranges, typed dates and Apply/Cancel share a reversible draft. Calendar navigation supports arrows, Home/End and PageUp/PageDown. Reversed typed ranges, invalid dates, future dates and dates more than three years old cannot be applied. No package dependency was added. Diagnostics retains recent hourly presets and includes today through the data clock; calendar end dates are inclusive, implemented as half-open UTC intervals. The diagnostic cohort uses session start time, with linked event journeys retained as session context.

Player dates select the chart, playtime totals, new/returning players, level completion and acquisition cohorts. DAU is the last selected complete day; WAU and MAU retain their rolling 7/30-day definitions ending on that day. Playtime comparisons use the preceding equal-length period. Retention includes selected acquisition cohorts and observes exact-day returns through the latest complete covered day, excluding immature cohorts. Missing coverage produces gaps and unavailable totals, never fabricated zeros. The range survives navigation and environment changes. The compact Overview player summary remains explicitly dated to the latest complete day.

Drilldowns keep an in-memory history with a scope snapshot and mounted parent detail. Back restores the originating view, its filters, selected evidence pane, AI result and reviewed checklist. Returning from a cited trace reopens the AI result. Release comparisons retain their baseline and candidate. Alerts has a separate test scope; changing preview filters does not discard or rescope the underlying investigation. Changing the global environment intentionally resets the detail context.

Search, selection and triage actions are real in-memory interactions. Saved views, alert drafts and issue activity survive navigation; all reset with the story. Read-only states disable issue and alert mutations. Loading, connection failure, no telemetry, no matching diagnostics, missing player rollups, partial history and known-zero activity are separate reviewable states. Release comparison uses its two release selectors and the diagnostic time window.

Releases opens on release health: a searchable, paginated history with recorded sessions, issue-free session rate, newly observed issue groups, and adoption. Selecting a version opens Issues scoped to that release. Compare is a secondary action on a specific row, prefilled with that version and its chronological predecessor (or the nearest newer version for the oldest entry). Its two selectors sit above the metric columns, with sample sizes visible and no adoption chart competing with the comparison. Back restores the history query, page and keyboard focus. No-data cohorts show unavailable rates rather than a healthy zero. Comparison remains optional; its selections survive issue and Alerts detours.

Release filters use a searchable catalog instead of a flat dropdown. Search matches version or commit across the full fixture history and ranks exact matches first. Browsing renders 20 releases per page, ordered by release creation time, with the current selection retained when it falls outside the page. A release known only from telemetry displays its first-observed date, never an invented deployment date. Releases remain selectable when the current environment/date window has no matching sessions. The same picker serves diagnostics, Alerts, baseline and comparison. Arrow keys and Enter select results; PageUp/PageDown browse pages; Escape cancels without changing the filter. Closing a picker does not steal focus from the next control.

The Many Releases stories contain 500 catalog entries, a long prerelease identifier, commit metadata, and 60 older client versions with current traffic. Adoption shows the five busiest versions plus a summed Other releases row; the denominator still includes every matching session. This fixture is local: production needs tenant-authorized catalog search and cursor pagination, with the selected release fetched independently of the current result page. The bounded popup should not require downloading an entire production history.

The existing deployed telemetry remains available in the new Analytics project destination. Its working ingestion/settings workflow is preserved; Logs becomes only the operational log viewer. The rich proposed analytics screens are injected only by Storybook, so the application cannot accidentally display fixture player counts or false alert status.

## Backend capability map

| Capability | Today | Needed for live advanced Analytics |
| --- | --- | --- |
| Events, errors, scalar attributes, measurements | Implemented | Aggregation endpoints and field metadata |
| Error fingerprints, event details, environment/release filters | Implemented | Durable issue lifecycle, ownership and comments |
| In-memory session IDs | Implemented | Explicit session start/end/outcome schema and sampled denominators |
| Trace IDs on logs | Implemented | Span ingestion, relationships and waterfall storage |
| Seven-day retention and quotas | Implemented | Preaggregates, rate/cost budgets for larger analytics tiers |
| Release configuration | Implemented | Stable deployment correlation and release-health aggregation |
| Player activity and retention | Storybook daily facts | Consented stable identities, active-time heartbeats, idempotent daily rollups and unsampled cohort denominators |
| AI investigation | Interactive Storybook adapter | Tenant-authorized evidence retrieval, model service, persistent jobs, quotas and repository integrations |
| Replay, profiling, feedback, notifications | Not implemented | Dedicated collection, permissions, storage, workflows and delivery systems |

## Review walkthrough and acceptance

Start at Overview. Inspect the save regression, assign and resolve/reopen the issue, inspect its source context and affected session, then open its trace. Compare the suspect release with the preceding release. Explore a specific event, group by device, save the query and export matching results. Create an alert draft and toggle it. Switch environment/release/time and confirm the same scope persists. Review mobile, dark mode, loading, empty, unavailable and viewer stories. Browser acceptance verifies these transitions, keyboard access, actual filtering and no horizontal page overflow.

A polished prototype can establish usability and information architecture. Matching Sentry's complete capture, scalability and operational feature set is a separate implementation program; it is not implied by a visual review.

## Revised experience and decisions

The persistent preview banner, coverage footer, marketing headings, repeated explanations and redundant instructional panels have been removed. Storybook documentation owns the sample-data disclosure. The product retains a short unavailable state only where it affects an action, such as alert delivery or an absent AI service. Metadata uses spacing, concise labels and parentheses rather than decorative dot separators. Metric definitions live in focusable tooltips. Recharts supplies responsive area charts, hover details and keyboard navigation; small table sparklines remain lightweight SVG.

Overview leads with the highest-priority unresolved issue, breaking ties by regression and affected sessions. Compact health and player summaries follow; the full engagement view lives in Players. Logs remains a separate destination. Sessions are not substituted for people. Revenue, ARPDAU, payer conversion and LTV are deferred until commerce events exist; current concurrency is deferred until reliable presence/heartbeat coverage exists. Neither is inferred from sampled errors or session totals.

### Game metric contract

GameAnalytics distinguishes acquisition, engagement, retention and monetization, including DAU, playtime and return cohorts. Its metric definitions use UTC calendar days. Those conventions informed this design. [Dashboard guide](https://docs.gameanalytics.com/products-and-features/analytics-iq/dashboards/overview/), [metric definitions](https://docs.gameanalytics.com/events-metrics-and-filtering/metrics/).

| Metric | Definition |
| --- | --- |
| DAU | Distinct player IDs active on the last selected complete UTC day |
| WAU / MAU | Distinct player IDs across 7 / 30 complete UTC days ending on the last selected day |
| DAU / MAU | Daily active players divided by monthly active players |
| Hours played | Active seconds in the selected range / 3,600; idle and background time excluded |
| Playtime / player | Active minutes divided by distinct active players in the selected range |
| Average session | Active minutes divided by session count in the selected range |
| Sessions / player | Session count divided by distinct active players in the selected range |
| D1 / D7 / D30 retention | Players returning on the exact day after first activity / eligible new-player cohort; weighted over mature acquisition cohorts within the selected range |
| Level completion | Completed attempts joined to their start-day cohort / started attempts in the selected range; includes finishes after midnight |
| New / returning | Distinct active players split by first activity within / before the selected range |

Player identity persists across sessions and upgrades within an environment. Diagnostic release filters do not apply to player activity or retention. Rollups must be idempotent, split active intervals at UTC boundaries and deduplicate identities across release shards. The adapter supplies a complete UTC-day coverage interval per environment. Uncovered activity is unknown, not zero; MAU and WAU require full window coverage. Known-zero covered days display zero, while missing trend points remain gaps. Missing or immature retention displays a dash. Coverage must never bridge a failed rollup day. Production must query tenant-scoped aggregates rather than shipping raw player-day history to the browser. The 64-day fixture is only a reproducible design and metric test source.

### AI investigation design

Sentry's issue-fix API exposes an asynchronous, staged run: root cause, solution, code changes and PR creation. It accepts developer context, resumes a run, supports retrying from a step and can hand work to a coding agent. These are more useful patterns than an ungrounded chat box. [Issue Fix API](https://docs.sentry.io/api/seer/start-seer-issue-fix/).

| Workflow | SpawnKit interaction |
| --- | --- |
| Start | One click opens a scoped investigation with progress and cancellation |
| Findings | A hypothesis, direct evidence links and explicit remaining uncertainty |
| Fix | A proposed change, readable diff and copy action; no claim that code was applied |
| Verify | A review checklist distinct from actual test results |
| Refine | Add developer context and rerun the investigation |
| Handoff | Copy scope, context, evidence, uncertainty, patch and checks for a coding agent |
| Failure / access | Retry a failed run; show an unavailable service; disable starting for read-only roles |

The component accepts an asynchronous `Investigator` adapter with an abort signal and progress callback. Only the Storybook module imports the sample adapter. Cancellation and unmount ignore late responses; result export uses the input snapshot from that run. Evidence navigation retains the issue and moves focus to the source or sessions; only issues with a known operation expose a trace citation. Citations carry concrete source locations, session IDs and operation names. Session trace actions select that operation; unrelated or healthy sessions explicitly name the save trace. Fixture trace outcomes match operation-specific failures and do not invent an observed retry.

A live service still needs authenticated tenant/project scope, bounded evidence retrieval, source revision identity, persisted run state, usage limits, cancellation, retry/idempotency and an audit trail. Treat telemetry and repository text as untrusted evidence, never as tool instructions. Keep diagnosis and repository mutations separate; require repository permissions and explicit review before applying a patch. Structured responses should bind citations to authorized evidence IDs. No fabricated confidence percentages, test passes or automatic PR success appear in the design.

## Live Storybook walkthrough

Open **Project dashboard → Analytics → Overview** at `http://127.0.0.1:6009/?path=/story/project-dashboard-analytics--overview`. Twenty-two stories cover the four primary sections, local views, direct details, AI failure/access states, diagnostic/player data boundaries, and a 500-release history. All main workflows are reachable from Overview.

1. Open the urgent checkpoint regression from Overview. Select **Investigate with AI**, inspect Findings / Proposed fix / Verify, follow trace evidence, and return to the preserved result.
2. In Players, open the date picker, choose **Last → Last 90 days**, and Apply. Inspect DAU / MAU and incomplete range totals, page to mature D30 cohorts, and open a cohort comparison. Try custom historical dates or **Last 7 days** to compare playtime. On mobile the picker opens as a bottom sheet; choose the retention return day above the cohort table.
3. In Health, assign and resolve/reopen an issue. Follow a session to its matching trace and back. Compare releases and return from an introduced issue with the comparison unchanged.
4. In Explore, search `checkpoint.failed`, group by device, save a query and export matching CSV rows. Switch to Sessions to inspect a player journey.
5. Open Alerts, edit/test/pause a draft, change its date range, and return to the originating investigation with its original dates preserved. Delivery remains unconnected. Check dark mode, mobile, keyboard navigation and viewer access.
6. Open **Many Releases** and search `1.3.3`, `a41e9c8`, or `checkpoint` in the release picker. Browse pages, select a version without recent traffic, and clear back to All releases. **Many Releases Health** opens the 500-version history with compact adoption. Open a release's issues, or choose Compare on its row, change either version, and return to the same history page. **Release Health** shows the smaller catalog. Existing comparison story URLs remain valid.

See the [independent LLM judge review](internal/analytics-judge-review.md) for the rubric, findings, corrections and scope-limited verdict.

## Verification

- `pnpm verify`: formatting, lint, types, unused-code checks, coverage suites and production builds.
- `pnpm build:storybook`: stable review build. Advanced Analytics fixtures and AI adapter are excluded from the production application.
- 46 Analytics browser checks across desktop/mobile: custom dates and presets, reversible drafts, validation, keyboard calendar navigation, range persistence, 500-release searching/paging, commit lookup, optional comparison and history restoration, comparison/adoption bounds, filtering, cohort paging, AI cancellation/retry/absence/permissions, real clipboard export, evidence navigation, issue triage, CSV, sessions/traces, releases and alerts.
- Unit tests cover distinct identities across releases, UTC boundaries, active-time units, environment isolation, exact-day retention, mature denominators, weighted cohorts, cross-release returns and explicit coverage, alongside the original observation contracts.
- Axe: zero WCAG 2 A/AA and 2.1 AA violations across 15 light/dark/mobile checks, with manual screenshot review. This is automated evidence, not complete accessibility certification.

Evidence is saved in ignored `work/analytics-v3-*.png`, `work/analytics-v3-accessibility.json`, `work/analytics-v3-browser.log`, `work/analytics-v3-verify.log`, and `work/analytics-v3-build.log`.

The date-picker follow-up adds 18 passing date/metric contract tests and four picker accessibility checks (light/dark desktop and mobile). Evidence: `work/date-picker-*.png`, `work/date-picker-accessibility.json`, and `work/analytics-date-browser-final.log`. The final workspace-wide verification attempt is in `work/analytics-date-verify-final.log`; concurrent public-site and authentication changes prevent a clean workspace-wide result. Targeted Analytics lint, types, unit tests, and Storybook build are checked separately.

The release-picker follow-up extends the unit suite to 22 passing date/metric/catalog checks. Release catalog tests cover chronological sorting, source immutability, exact version and commit lookup, and adoption denominator conservation. All 44 desktop/mobile browser checks pass, and four additional light/dark desktop/mobile accessibility checks report zero WCAG 2 A/AA and 2.1 AA violations. Screenshots and accessibility results are in `work/release-picker-*.png` and `work/release-picker-accessibility.json`; browser results are in `work/analytics-releases-browser-final.log`. Full `pnpm verify` passed at that checkpoint (`work/analytics-releases-verify.log`), superseding the earlier date-picker verification limitation.

The contextual release-health follow-up passes all 46 desktop/mobile browser checks and eight light/dark desktop/mobile accessibility checks, with manual screenshot review. Targeted Analytics formatting, lint, types, 22 unit tests and the Storybook build pass. Evidence: `work/analytics-release-health-browser.log`, `work/release-health-accessibility.json`, `work/release-health-*.png`, and `work/analytics-release-health-build-final.log`. The current full verification attempt (`work/analytics-release-health-verify.log`) stops on formatting in concurrent CI/deployment files; dashboard-wide types also report an unrelated unsupported `Github` import in `src/components/public/company-pages.tsx`. These checks are not reported as passing.
