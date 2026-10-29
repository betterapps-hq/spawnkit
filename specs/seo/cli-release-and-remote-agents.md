# CLI release and remote agents

Updated: 2026-10-18. Selected priorities: public CLI distribution, remote-agent publishing, and a fresh Codex journey. The owner deferred further indexing review and elected to skip the Claude Code run. Cursor is unavailable. Copy for your agent and editorial content remain in Batch 4.

## Package and documentation

- [x] Create the owned `spawnkit` npm organization and retain proprietary licensing for the CLI.
- [x] Replace the old CLI package name throughout code, templates, workflows, documentation, and specifications with `@spawnkit/cli`.
- [x] Remove obsolete publication warnings and repository-only public instructions. Keep internal workspace package names unchanged.
- [x] Publish the verified `@spawnkit/cli@0.1.0` artifact to npm with public visibility and `UNLICENSED` metadata. Third-party license notices are bundled.
- [x] Verify the packed artifact in an isolated pnpm project: executable/version, standalone Phaser creation, dependency installation, types, lint, tests, and production build.
- [x] Repeat the full smoke check against the public npm registry after propagation, including `pnpm dlx` execution.
- [x] Deploy and check the updated public HTML, Markdown, builder commands, catalog, skills, and llms.txt.

Published tarball SHA-1: `a6b44ee917f80e8e58da5c0256f04ae20034da61`. The package has no runtime dependencies, workspace dependency leakage, source maps, or installation hook. Local generation remains account-free and preserves existing-file protections. Evidence: `work/cli-package-tarball.json`, `work/cli-package-final.log`.

## Remote-agent publishing

- [x] Implement user-claimed `service_auth` registration, discovery metadata, approval codes, assertion exchange, and revocation.
- [x] Require a verified matching email, explicit human approval, and ownership of one existing project.
- [x] Limit grants to project reads and optional deployment writes; exclude other projects, account changes, secrets, deletion, and project creation.
- [x] Enforce ten-minute approval windows, one-hour grants, fifteen-minute access tokens, polling intervals, attempt limits, registration/exchange rate limits, and bounded retention.
- [x] Add `login --remote`, protected credential storage, token renewal, and server revocation before local logout cleanup.
- [x] Add approval and active-access management pages, with revoke-one/revoke-all controls and a dashboard account-menu link.
- [x] Pass backend authorization tests and CLI polling, denial, storage, renewal, and revocation tests.
- [x] Complete real staging browser approval, project isolation, token rejection, and assertion rejection after revocation.
- [x] Apply production migration, deploy, and verify discovery and access boundaries.

Only the implemented `service_auth` flow is advertised. Anonymous identities, trusted-provider assertions, and MCP are not supported. Local browser OAuth remains separate: its logout removes the local credential, while remote logout revokes the server grant. A long-running command may need to be resumed if its access token expires; commands renew before starting while the grant is valid.

## Agent journey and release checks

- [x] Run Codex from a fresh directory against public documentation and the npm package; record actual setup and verification outcomes, including required operator assistance.
- [x] Exercise hosted publishing using the scoped staging grant and remove this run's disposable project/account afterward.
- [x] Pass full repository verification before release preparation (`work/cli-release-verify.log`).
- [x] Repeat verification after the live-environment fix and pass relevant browser acceptance: all ten selected desktop/mobile cases pass.

The initial staging browser check caught Cloudflare's unsupported `fetch` redirect mode. The approval-page request now uses manual redirects and rejects redirect responses without forwarding credentials. The test fixture uses an actual browser session so its token includes the authorized origin; backend-created fixture tokens without that claim are correctly rejected.

## Release evidence

| Component   | Staging version                        | Production version                     |
| ----------- | -------------------------------------- | -------------------------------------- |
| Control API | `12f331c7-f229-46b5-8b24-eefe00f4c125` | `99123eaf-5ab8-456b-8406-24249bd72915` |
| Dashboard   | `a5f3ef17-f3c3-49da-b7e4-8ca66efc2e0b` | `fae9a0bf-f73d-4339-8b47-9799ebbf034a` |

Migration `0025_agent_authorization.sql` is applied in both environments. Production verification passed for 24 public pages/resources, auth discovery, unauthenticated access rejection, unsupported-scope rejection, and the exact registry artifact. The staging browser check passed 13 live checks using a fresh test account. Evidence: `work/cli-package-registry.json`, `work/cli-registry-metadata.json`, `work/cli-release-live.json`, `work/agent-auth-staging-results.json`, `work/cli-release-final-verify.log`, and `work/cli-release-browser.log`. Deployment logs use the `agent-auth-` and `cli-release-` prefixes in ignored `work/`.

The agent-guide follow-up also passed full `pnpm verify` and all four targeted desktop/mobile checks (`work/cli-release-journey-verify.log`, `work/cli-release-final-browser.log`). One repeat invalid-scope request returned HTTP 500. The following direct request and complete production audit passed; the matching Worker events returned 400 with no application error events. The isolated response was not reproduced or attributed to a confirmed cause; it is not recorded as a fixed application defect.

## Codex journey results

Codex created `comet-collector` using the public npm package after reviewing its dry-run plan. It added an initialized collection counter, Restart, reset behavior, restored canvas focus, and tests. Its initial sandbox could not retrieve the public Markdown URLs or write pnpm's shared installation lock. The operator installed dependencies in a normal terminal; the follow-up used normal per-command execution approvals for build/browser checks. This is an assisted journey, not a fully unattended sandbox success. No runtime policy or test threshold was disabled.

The first operator check caught insufficient branch/function coverage despite all nine behavior tests passing. Codex added meaningful reset and optional-callback coverage. Final results: lint passes; 11 tests pass; statement coverage 96.96%, branch coverage 94.11%, function coverage 92.59%, and line coverage 97.01%; type checking and production build pass; the Chromium gameplay test passes.

The operator then used the registry-installed CLI and a browser-approved one-project grant to link and deploy that edited game. Staging deployment `ed6d9815-6ea9-4871-8a74-afb9691cf4c5` succeeded with no media warnings. Desktop and phone-size hosted checks passed collection, pause/restart, score reset, restored focus, and collection after restart, without runtime errors or horizontal overflow. Grant revocation rejected both the access token and subsequent assertion exchange. Project cleanup completed and the disposable Clerk account was deleted; no evaluation game remains hosted.

The three agent guides now explain `pnpm-store-operation-locks` access errors and using Copy as Markdown when an agent cannot retrieve documentation. Evidence: `work/cli-codex-trace.jsonl`, `work/cli-codex-followup-trace.jsonl`, `work/cli-codex-followup-final.txt`, `work/cli-agent-hosted-smoke.log`, `work/cli-agent-deployment.json`, `work/cli-agent-gameplay.json`, and `work/cli-agent-cleanup.json`. The editable evaluation project is under `D:/system/agent-evals/spawnkit/cli-20261018-codex/comet-collector`.
