# Game hosting platform specifications

Status: draft for implementation planning. Updated: 2026-10-14.

An AI-native web-game hosting platform: “Vercel meets PlayFab” for developers creating games locally with AI coding tools.

## Specifications

| Document | Responsibility |
| --- | --- |
| [Decisions and open questions](decisions.md) | Agreed product boundaries, pricing, and unresolved choices |
| [Public-site positioning](public-site-positioning.md) | Proposed audiences, offers, value, navigation, and evidence boundaries |
| [SEO and agent discovery](../specs/seo/README.md) | Foundation and product pages live; public CLI and scoped remote-agent publishing verified. Search measurement awaits more data; articles and Copy for your agent remain last |
| [For Creators page brief](creators-page.md) | Proposed creator narrative, copy, demonstrations, and starter-kit journey |
| [Cloud page brief](cloud-page.md) | Proposed hosting narrative, release workflow, pricing presentation, and availability |
| [Deployment](deployment.md) | Source upload, isolated builds, environments, promotion, rollback, and GitHub Actions |
| [Management dashboard](management-dashboard.md) | Developer workflows, operational visibility, environment controls, and billing |
| [Project settings](project-settings-design.md) | Approved settings, saves, media replacement and Danger Zone |
| [Project deletion](project-deletion.md) | Resource cleanup, domain deprovisioning, retries and audit retention |
| [Project dashboard design](project-dashboard-storybook.md) | Storybook screen matrix, template creation, version operations, PR previews, and domains |
| [Analytics experience](analytics-experience.md) | Detailed Sentry feature study, Analytics workflows, Storybook walkthrough and capability boundaries |
| [Telemetry analytics architecture](telemetry-analytics-architecture.md) | Proposed self-hosted ClickHouse/ClickStack system, game metrics, and EU endpoint routing based on server location |
| [Games platform](games-platform.md) | Control plane, hosting, containers, routing, isolation, metering, and provider ownership |
| [Game publishing](game-publishing.md) | Creator submissions, administrator review, approved discovery and isolated players |
| [Community safety design](community-safety-design.md) | Implemented reports, team permissions and listing settings; Storybook proposals for storage cleanup |
| [Game services](game-services.md) | Supported official Colyseus capabilities and their configuration/persistence lifecycle |
| [Project templates](project-templates.md) | Presets, composable stack selection, generation, import, install, and add |
| [Domains](domains.md) | Environment mappings, typed local configuration, authentication and webhook migration |
| [Development](development.md) | Current workspace, local commands, template implementation, and next steps |
| [Performance and usage controls](internal/performance-and-limits.md) | Polling, cache behavior, build allowances, rate limits, CPU bounds and billing alerts |
| [Game upload security audit](internal/game-upload-security-audit.md) | Upload/build boundaries, iframe and CSP controls, verified risks and remediation priorities |

## Reading requirements

Implemented telemetry: [design and boundaries](telemetry-design.md), [setup and operations](telemetry-operations.md), and [independent judge review](internal/telemetry-judge-review.md).

- **Agreed** means explicitly established in the project conversation.
- **Proposed** means an implementation recommendation awaiting review; it is not a settled product promise.
- **Open** means a decision or verification is needed before implementing the dependent behavior.
- Acceptance criteria describe target behavior, not tests already run or features already implemented.
- Current documentation describes capabilities; a compatibility spike must verify pinned package versions before adoption.

## Scope

Launch includes local project creation/import, CLI source publishing, hosted isolated builds, sandbox/staging and production, promotion, rollback, generated GitHub Actions workflows, and dashboard management. Provider accounts belong to the platform.

Single-player web-game hosting is free. Single-player game services and Sandbox are separate $5/month add-ons. Multiplayer costs $10/month per game, including Sandbox and game services, plus machine usage. Included service quotas and separately metered resource policies remain open. See [the decision log](decisions.md) for exact boundaries and internal usage pricing.

Game services are limited to official Colyseus capabilities at launch. The free single-player preset is frontend-only. Broader custom services and browser workspaces remain later scope. Managed GitHub App integration is included in the current implementation work.

## Proposed implementation order

1. Define project manifests, deployment plans, resource ownership, event contracts, and version compatibility.
2. Validate provider APIs and the current Colyseus packages; investigate Void source, license, and deployment adapter feasibility.
3. Implement frontend source upload, isolated build, sandbox release, and production promotion with immutable artifacts.
4. Implement one Colyseus runtime path, scoped secrets, persistent storage, health checks, room draining, and rollback.
5. Add dashboard operations, metering, paid sandbox gating, and billing reconciliation.
6. Generate GitHub Actions workflows and test the same release path through CLI, dashboard, and CI.
7. Complete the four default presets and validate supported advanced stack combinations.

## Proposed repository structure

```text
apps/
  dashboard/
  control-api/
  deployment-worker/
  build-runner/
  edge-router/
  node-agent/
packages/
  cli/
  contracts/
  project-config/
  resource-inference/
  template-generator/
  template-modules/
  database/
  providers/cloudflare/
  providers/neon/
  providers/vultr/
  providers/void/
examples/
  phaser-single-player/
  phaser-colyseus/
  babylon-single-player/
  babylon-colyseus/
docs/
```

This expanded structure is a proposal. The implementation includes the dashboard, CLI, templates, authenticated control API and isolated static game host. Project persistence, source uploads, release promotion, rollback and Sandbox activation have been verified against live infrastructure. Hosted builds await Workers Paid. The production GitHub App and signed ping delivery are configured; repository installation and webhook-driven deployment verification remain outstanding. SpawnKit domains follow the [domain contract](domains.md). See [platform operations](internal/platform-operations.md) for deployment instructions, verified behavior and current limits, and [development](development.md) for local commands. A separate shared game-service API remains deferred.
