# Current implementation only

Updated: 2026-10-17. SpawnKit is prelaunch with no user compatibility obligation.

## Implementation

- [x] Route all CLI creation and module composition through the current `--add` contract. Update dashboard commands, smoke tests, developer docs, and CLI examples together.
- [x] Remove the unverified public `project set/show/clear` command surface. Use verified `link` and local-only `unlink`; retain the internal association helper used by these commands.
- [x] Accept only `sandbox` and `production` CLI environment names.
- [x] Remove browser-project import/migration behavior and name-only record normalization. Keep fully configured isolated Storybook fixtures.
- [x] Remove retired query navigation and route aliases. All site links use current URLs.
- [x] Remove old game-domain translation, alias routing, numbered-worker selection, and origin-migration operations. Exact current hostname reservations remain authoritative; moderation and isolation checks are retained.
- [x] Remove the obsolete owner manual-submission endpoint. Production activation queues review; the administrative review and current listing-edit APIs remain.
- [x] Remove one-time domain-cutover and database-baselining utilities and their operating instructions.
- [x] Remove obsolete compatibility promises and user migration guidance from developer docs and public guides.
- [x] Preserve numbered SQL schema migrations, transactional safeguards, current artifact rollback rules, and protection against overwriting user-owned project files. These are current functionality.

## Verification

- [x] Full `pnpm verify`.
- [x] Relevant desktop/mobile browser acceptance.
- [x] Generated-project smoke check using the current CLI command.
- [x] Public-site routes and documentation deployed with the dashboard release on 2026-10-17.
- [x] Backend cleanup deployed to staging and production; CLI built, packaged, and exercised against staging. See [release and journey evidence](selected-follow-ups-2026-10-17.md).
      Current npm distribution and verification are tracked in the [CLI release record](cli-release-and-remote-agents.md).

Verified on 2026-10-17. All 52 selected public-site, dashboard, project-setup, and predeployment cases passed across the initial run and targeted reruns. Three initial failures were caused by a shared Storybook rebuild; reruns used an isolated snapshot. The remaining test referenced removed example-game tabs and was updated to verify current starter-kit filtering and selection. The presentational dashboard was separated from its server-auth wrapper so Storybook no longer imports server-only authentication code.

The `pixi-add` generated-project smoke case passed dependency installation, lint, coverage, production build, and browser keyboard interaction. Logs are in ignored `work/current-footer-verify-final.log`, `work/current-footer-app-browser.log`, `work/current-footer-app-browser-retry.log`, `work/current-footer-app-browser-final.log`, and `work/current-cli-template-smoke.log`. Final repository verification passed after the browser-test corrections. The public-site and documentation changes are deployed; see [production release evidence](footer-and-content-pages.md#production-release). Service and CLI release evidence is maintained separately in the linked release records.
