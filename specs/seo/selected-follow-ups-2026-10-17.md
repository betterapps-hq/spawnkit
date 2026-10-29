# Release, agent journey, and measurement

Updated: 2026-10-17. Covers selected priorities 1, 5, and 6. The subsequent [CLI release and remote-agent work](cli-release-and-remote-agents.md) covers npm distribution and remote authorization. New page families, articles, and Copy for your agent remain separate.

## 1. Current implementation release

- [x] Full repository verification and empty pending-migration lists in both environments.
- [x] Deploy telemetry, game hosting, and control API to staging, then production.
- [x] Verify API health, anonymous access rejection, telemetry method boundaries, and game-host routing.
- [x] Build/package the CLI and exercise current creation and deployment contracts.
- [x] Deploy the additional agent setup guidance and favicon to production.
      Current npm distribution and verification are tracked in the [CLI release record](cli-release-and-remote-agents.md).

| Service             | Staging version                        | Production version                     |
| ------------------- | -------------------------------------- | -------------------------------------- |
| Telemetry           | `3a5c3686-e091-46df-a9a4-d3d073d3637b` | `976fd0ad-e87f-4376-88f6-703d3bb32dbe` |
| Game host           | `86fed320-1848-4880-a0f1-7b570d86dd4c` | `c784dc70-a7f5-495c-8b14-1a50e00b3943` |
| Control API         | `313cb17b-c19f-4e82-ae1a-c8b250eeffbc` | `fd102d64-ac26-49cc-93c5-b374b53e3bd3` |
| Dashboard follow-up | —                                      | `7cd8b638-dd0b-4da9-8ed4-8942f8ea1538` |

Evidence: ignored `work/seo-selected-staging-deploy.log`, `work/seo-selected-production-services.log`, `work/seo-selected-production-dashboard.log`, and `work/seo-selected-final-verify.log`. Previous versions are recorded in `work/seo-release-before-*.json`. This earlier journey used a local package artifact. The [current release record](cli-release-and-remote-agents.md) records npm installation verification.

## 5. Agent-assisted journey

- [x] Run Codex against a freshly downloaded public Phaser kit and public Markdown guides, outside the SpawnKit repository.
- [x] Have Codex add a collected-stars counter, reset control, and behavior tests while preserving movement.
- [x] Record setup failures rather than treating generated code as a completed journey.
- [x] Verify the edited project after terminal-assisted installation: lint, seven browser/unit tests, and production build pass. Statement coverage is 98.96%; branch and line coverage are 100%.
- [x] Deploy the edited project to staging; verify keyboard collection, reset, restored focus, and collection after reset, with no browser runtime errors.
- [x] Verify CLI existing-folder protection and incompatible-module decisions.
- [x] Verify expired credentials, interrupted watchers, reconnection, and recovery through CLI regression tests.
- [x] Exercise real hosted success → deliberate build failure → detached successful retry → resumed log watch. Failure preserved the active release.
- [x] Remove this run's isolated staging project after acceptance. Cleanup completed after one automatic provider retry; no test game remains in staging.
- [ ] Repeat a fully unattended agent journey with an execution environment that supports setup and browser testing. This run required operator assistance.
- [ ] Separate Claude Code and Cursor behavioral runs. Claude's CLI still reported signed out after the user opened it; Cursor's agent CLI was unavailable. The user approved proceeding with Codex and automated checks.

The first Codex run could read and edit the kit, but pnpm could not write its shared lock and the sandbox could not reach the registry. Switching to npm did not resolve permissions. A second attempt stopped at a runtime-policy rejection before executing commands; that policy was not bypassed. Subsequent project verification and hosted acceptance were performed by the parent operator using the existing authorized tools, not attributed to the blocked Codex session.

The shared agent guides now explain how to run `pnpm install` in the user's terminal when the agent cannot access the registry/cache, then continue with the existing package manager and lockfile. They also explain `pnpm test:setup` for Chromium.

The project and original evaluation are under `D:/system/agent-evals/spawnkit/seo-20261017-codex`. Ignored evidence includes `work/seo-codex-trace.jsonl`, `work/seo-codex-assisted-trace.jsonl`, `work/seo-staging-journey.json`, `work/seo-staging-journey.log`, `work/seo-codex-deployment.json`, `work/seo-codex-gameplay.json`, and `work/seo-staging-cleanup.json`. No production game was rebuilt or replaced.

## 6. Indexing, performance, and setup measurement

- [x] Review the verified Search Console property and successful sitemap read.
- [x] Confirm `/kits/phaser` is indexed, with valid HTTPS and breadcrumbs.
- [x] Inspect `/docs`: initially unknown to Google; live test passed and indexing request accepted. Acceptance is not completed indexing.
- [x] Inspect field performance, verified crawler responses, and the opt-in creator cohort.
- [x] Expand HTTP/field audit coverage to include the docs landing page, all 16 guides, and footer resource pages.
- [x] Repair the reproducible `/favicon.ico` 404 using a 48-pixel conversion of the existing brand SVG.
- [x] Complete the builder startup performance follow-up: defer generation/compression and guide content, load visible images early, verify, and deploy. See [measured results and release](builder-startup-performance.md).
- [ ] Review query/page impressions, clicks, and canonical selection after Search Console finishes processing.
- [ ] Review a representative 28-day field window and attributable conversions before expanding programmatic page families.

Google's October 17 sitemap report shows success and 13 discovered pages. The current static sitemap contains 34 URLs; this does not mean all are indexed. Performance and aggregate indexing reports still show processing, so there is no verified query-demand or ranking baseline yet.

Field window: October 16 00:00 UTC–October 18 04:46 UTC. Homepage desktop p75 LCP is 1,728 ms (77 represented events); mobile is 1,716 ms (15). Quickstart desktop p75 LCP is 1,088 ms (8), with p75 INP 184 ms (5). These small sampled cohorts are not unique people or a 28-day CWV pass; team/older synthetic traffic may influence them. The expanded collector has no docs-index or kit-page cohort yet. EU exclusion remains enabled.

Verified crawlers returned 510 successful search-engine responses, 485 AI-crawler responses, and 42 AI-search responses. No 403 or 5xx responses appeared in those cohorts. Historical errors include sitemap and old hashed assets; the current sitemap returns 200. Unauthorized personal-feedback requests remain 401 as intended.

The 90-day opt-in download cohort is empty, and local starts are unobserved. Setup abandonment and download-to-deployment conversion cannot yet be calculated. Unattributed traffic is not a zero conversion rate.

A throttled mobile lab pass recorded LCP of 3.35 s for `/docs`, 2.80 s for `/kits/phaser`, and 10.66 s for `/templates`, with slow interactions. Concurrent builds make this a diagnostic signal requiring an isolated repeat, not a regression comparison. Synthetic RUM and game-activity delivery were suppressed; lab event timings are not field INP.

The isolated repeat measured `/templates` at 4.21 s LCP, `/docs` at 2.93 s, and `/kits/phaser` at 2.49 s, with zero observed layout shift. The longest sampled interactions were 192, 128, and 128 ms respectively. The resulting builder startup task is now completed and deployed: [ten-run comparisons](builder-startup-performance.md) show 18% less initial JavaScript and median LCP improving from 3.23 s to 3.06 s, while overall control readiness is roughly unchanged. A single throttled sample still cannot establish a field regression. Original evidence: `work/seo-performance-2026-10-18T04-51-26-181Z.json`.

Evidence: `work/seo-field-1792298781244.json`, `work/seo-selected-creator-cohort.json`, `work/seo-performance-2026-10-18T04-40-07-785Z.json`, `work/seo-phaser-indexed.png`, and `work/seo-docs-indexing-requested.png`.

## Additional improvements

Removed obsolete browser-project import wording from the current operations instructions. Cold Vite compilation also exposed a short browser-test deadline: SEO acceptance now allows 15 seconds for development-server assertions, while deployed performance is measured separately. Remote-agent authorization is covered by the [current release](cli-release-and-remote-agents.md). MCP, new generated pages, and articles remain deferred.

Final acceptance: all four selected desktop/mobile browser cases passed across the rerun and the corrected cold-start deadline check. All 16 guides loaded highlighted examples without runtime errors; footer links and resource layouts passed. The final production HTTP audit found no unexpected failing routes, the favicon returns 200, all three agent Markdown pages include the setup guidance, and all five current published games still serve HTML successfully. The expected missing-page and retired `/pricing` checks remain 404.
