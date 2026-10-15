# Game hosting platform specifications

Status: draft for implementation planning. Updated: 2026-10-14.

An AI-native web-game hosting platform: “Vercel meets PlayFab” for developers creating games locally with AI coding tools.

## Specifications

| Document | Responsibility |
| --- | --- |
| [Decisions and open questions](decisions.md) | Agreed product boundaries, pricing, and unresolved choices |
| [Deployment](deployment.md) | Source upload, isolated builds, environments, promotion, rollback, and GitHub Actions |
| [Management dashboard](management-dashboard.md) | Developer workflows, operational visibility, environment controls, and billing |
| [Project dashboard design](project-dashboard-storybook.md) | Storybook screen matrix, template creation, version operations, PR previews, and domains |
| [Analytics experience](analytics-experience.md) | Detailed Sentry feature study, Analytics workflows, Storybook walkthrough and capability boundaries |
| [Telemetry analytics architecture](telemetry-analytics-architecture.md) | Proposed self-hosted ClickHouse/ClickStack system, game metrics, and EU endpoint routing based on server location |
| [Games platform](games-platform.md) | Control plane, hosting, containers, routing, isolation, metering, and provider ownership |
| [Game services](game-services.md) | Supported official Colyseus capabilities and their configuration/persistence lifecycle |
| [Project templates](project-templates.md) | Presets, composable stack selection, generation, import, install, and add |
| [Development](development.md) | Current workspace, local commands, template implementation, and next steps |

## Reading requirements

Implemented telemetry: [design and boundaries](telemetry-design.md), [setup and operations](telemetry-operations.md), and [independent judge review](internal/telemetry-judge-review.md).

- **Agreed** means explicitly established in the project conversation.
- **Proposed** means an implementation recommendation awaiting review; it is not a settled product promise.
- **Open** means a decision or verification is needed before implementing the dependent behavior.
- Acceptance criteria describe target behavior, not tests already run or features already implemented.
- Current documentation describes capabilities; a compatibility spike must verify pinned package versions before adoption.

## Scope

Launch includes local project creation/import, CLI source publishing, hosted isolated builds, sandbox/staging and production, promotion, rollback, generated GitHub Actions workflows, and dashboard management. Provider accounts belong to the platform.

Frontend-only production is free. Multiplayer incurs $5/month per game plus usage. Single-player services cost $5/month including service usage. One optional Sandbox adds a separate $5/month plus usage, regardless of region count. Sandbox Neon/Vultr/D1 costs have 50% markup; production costs have 100% markup. See [the decision log](decisions.md) for exact boundaries and unresolved pricing.

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

This expanded structure is a proposal. The implementation includes the dashboard, CLI, templates, authenticated control API and isolated static game host. Project persistence, source uploads, release promotion, rollback and Sandbox activation have been verified against live infrastructure. Hosted builds await Workers Paid; GitHub App credentials are still needed for its end-to-end integration. SpawnKit domains follow the [domain contract](domains.md). See [platform operations](internal/platform-operations.md) for deployment instructions, verified behavior and current limits, and [development](development.md) for local commands. A separate shared game-service API remains deferred.
