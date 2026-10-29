# Batch 3 Agent onboarding and execution

The goal is successful agent-assisted project creation and publishing, with documentation generated from the same contracts as the product. Copy for your agent and its selection-specific prompt UI are explicitly deferred to Batch 4 with content writing.

## Skills and documentation

- [x] Use the owned `@spawnkit/cli` distribution and verify its npm installation and standalone generated projects. See the [release record](cli-release-and-remote-agents.md).
- [x] Publish a reusable Agent Skills `SKILL.md` package with focused references for create, extend and publish operations.
- [x] Include concise project-specific `AGENTS.md` instructions in new generated projects; preserve existing user instructions on updates.
- [x] Offer readable HTML, Markdown equivalents and Copy as Markdown from a shared documentation source.
- [x] Redesign the five public guides with documentation typography, task-focused copy, responsive navigation, section search and copyable examples. See [documentation experience](docs-experience.md).

## Discovery and machine contracts

- [x] Publish `/llms.txt` (plural) as a curated index of setup, catalog, authentication, publishing, pricing, limitations and troubleshooting resources.
- [ ] Add `/llms-full.txt` only if a bounded combined document materially helps tested clients.
- [x] Expose a versioned machine-readable catalog using existing compatibility and availability data.
- [x] Validate public API documentation/OpenAPI against implemented endpoints.
- [x] Standardize CLI JSON outputs, errors, noninteractive decisions, dry runs and resumable operations.
- [x] Add an authentication-status command without returning credentials.
- [ ] Evaluate a thin MCP adapter only after underlying CLI/API contracts are stable.

Discovery files improve documentation consumption for clients that use them. They are not authorization policies and do not establish an AI-search ranking benefit.

## Authentication

- [x] Publish `/auth.md` explaining the currently supported account creation, browser authorization, expiration and recovery paths, permissions, account requirements, pricing and support.
- [x] Distinguish a guide to the existing login flow from conformance with the WorkOS-authored auth.md protocol.
- [x] Implement and test remote-agent user-claimed authorization, token expiration and actual server-side revocation. See the [deployed release and live checks](cli-release-and-remote-agents.md).
- [x] Implement discovery metadata, registration, claims, token and revocation behavior for `service_auth`. Advertise only supported identity types and scopes.
- [ ] Evaluate trusted-provider assertions only when supported provider integrations justify them. Preserve account linking, user consent and audit boundaries.

Local CLI login uses authorization code with PKCE and a localhost callback. Remote agents use `login --remote` with user approval, one-project scopes, one-hour grants, and 15-minute access tokens. Remote logout revokes the grant before deleting its local credential; local OAuth logout removes only the local credential. Local creation remains account-free. Deployment and live-test evidence are in the [release record](cli-release-and-remote-agents.md).

## Evaluation and measurement

- [x] Exercise Codex-assisted creation, existing-folder conflicts, incompatible modules, expired authorization, interrupted watchers, and real staging deployment recovery. See [results and assistance boundaries](selected-follow-ups-2026-10-17.md).
- [x] Complete the fresh npm-based Codex-assisted journey and scoped hosted deployment; see [results and assistance boundaries](cli-release-and-remote-agents.md#codex-journey-results).
- [ ] Fully unattended sandbox execution remains unverified. Claude Code is skipped at the owner's request; Cursor's agent CLI is unavailable.
- [x] Verify skill instructions against downloaded kits and current published commands in CI.
- [x] Track prepared downloads, observed local starts and first deployments separately. Do not infer unobserved completion. Copy-event measurement is deferred with Copy for your agent to Batch 4.
- [x] Use opt-in/privacy-conscious attribution and avoid source-code or credential collection.

Remote authorization is selected for this delivery. Advertise only the implemented `service_auth` user-claimed flow; trusted-provider assertions and anonymous identities remain unsupported.

## Selected-scope delivery

Priorities 1, 2 and 4 shipped on 2026-10-17. See [production evidence](rollout-2026-10-17.md#agent-discovery-and-measurement-delivery--2026-10-17). Current public instructions cover `@spawnkit/cli` and downloadable kits. OpenAPI covers catalog/download endpoints only. Existing CLI automation contracts were documented and regression-tested; auth status was added. Skill packaging, shared Markdown and generated project instructions are validated in repository tests. Broader independent multi-agent behavioral evaluation remains open.

Attribution covers opted-in curated kits, with copied-folder semantics: one download may produce multiple first-deployed projects but converts only once. Local starts are unobserved, not inferred; custom builder downloads remain outside the first cohort implementation. Reports use the confirmed production D1 destination. Initial field/crawler data was retrieved; Search Console and 28-day cohort reviews still need more data.

Remote authorization and registration/revocation are tracked in the [current release](cli-release-and-remote-agents.md). Trusted-provider assertions, MCP and llms-full.txt remain deferred. Copy for your agent stays in Batch 4.
