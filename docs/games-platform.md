# Games platform process

## Purpose and boundaries

Operate a multi-tenant hosting platform that builds and serves customer games while retaining provider credentials and deployment authority. Developers do not need Cloudflare, Neon, or Vultr accounts.

The platform supplies hosting and operations. Customer game logic and official Colyseus modules supply launch game behavior. A separate cross-game auth/economy/achievement API is deferred.

## Proposed architecture

| Component | Responsibility |
| --- | --- |
| Control API | Accounts, games, permissions, environment configuration, operation submission |
| Coordinator | Durable deployment steps, provider reconciliation, promotion, rollback |
| Build scheduler/runners | Isolated source builds and immutable artifact production |
| Edge routing | Game/environment hostnames, frontend delivery, public release configuration |
| Vultr node agent | Restricted container lifecycle, capacity reporting, health and log collection |
| Provider adapters | Cloudflare, Neon, Vultr, optional verified Void integration |
| Platform database | Ownership, desired/observed state, releases, migration/operation ledgers, metering |
| Artifact storage/registry | Source snapshots, frontend artifacts, immutable server images |
| Metering/billing | Resource usage attribution, markup, fees, reconciliation |

Use TypeScript/Node.js for control and build processes initially. Cloudflare-specific edge code uses the Workers runtime. Drizzle manages platform schemas; the platform database provider is still a design choice and does not imply every game must use Neon.

## Resource hierarchy

```text
account
  project (game)
    optional sandbox environment
      releases / secrets / resources / runtime allocations
    production environment
      releases / secrets / resources / runtime allocations
```

Every resource has an owner account/game/environment, purpose, provider ID, creation operation, and deletion policy. Shared infrastructure has an allocation ledger rather than pretending each game owns a VM. Cross-environment references are denied unless a later explicit feature authorizes them.

## Frontend hosting

- Cloudflare hosts game frontends. Evaluate Workers Static Assets for ordinary static/SPAs and Workers for Platforms when running tenant Workers.
- R2 is the candidate artifact/asset store; choose the serving path after validating cache behavior, isolation, limits, and cost.
- Content-addressed assets have immutable caching. Release pointers/configuration have deliberate freshness rules.
- The platform router resolves verified hostnames to game/environment/release identity; unknown hostnames never fall through to another game.
- Supply explicit SPA fallbacks and headers per template/manifest.
- Use separate origins for untrusted game content and the management dashboard. Dashboard cookies must not be available to customer games.

Custom domains use Cloudflare domain/routing infrastructure. Customer hostname validation and TLS are asynchronous operations; do not mark a domain ready until both routing and certificate status are valid.

## Multiplayer scheduling

Agreed base: isolated Colyseus containers on shared Vultr VMs, 1 vCPU/2 GB per game, with optional higher tiers.

Each multiplayer region in production or the single optional Sandbox receives an independently selected compute tier. Single-player Sandbox serves static assets without a multiplayer allocation. Exact shared-host allocation and draining policy must be finalized before actual billing.

Scheduler process:

1. Check game entitlement and requested region/tier.
2. Reserve available host capacity, leaving explicit system/agent headroom.
3. Provision another Vultr host when the approved capacity policy requires it.
4. Start an immutable image with game/environment-scoped configuration and credentials.
5. Register a release-specific HTTPS/WebSocket endpoint after readiness succeeds.
6. Reconcile desired and observed container state using heartbeats and leases.
7. Stop/remove allocations on completion of draining, explicit shutdown, or defined suspension.

A 1 vCPU quota is an allocation on shared compute, not a promise of a dedicated physical core. Do not oversubscribe beyond a documented policy. Enforce CPU/memory/PID limits, scoped networking, non-root execution, dropped capabilities, filesystem restrictions, and denial of Docker socket/host credentials. Select and validate a stronger container isolation layer appropriate for untrusted Node.js code before public launch; ordinary shared-kernel containers alone are not a sufficient reviewed security design.

Build jobs run separately from player-serving containers. They cannot control runtime nodes or enumerate other games. Nodes expose a narrow authenticated command API, not an arbitrary platform shell endpoint.

## Storage and game databases

- Neon PostgreSQL is optional and provisioned through its API for games requiring it.
- Keep database credentials out of frontend bundles; issue credentials scoped to each game's environment.
- D1/R2 are supported platform resources, but access from Node.js Colyseus needs a verified integration rather than assuming Worker bindings exist on Vultr.
- Persistent data lives independently of container images and temporary files.
- Database creation, migration, credential rotation, backups, export, and deletion have recorded ownership and operation status.
- Sandbox data is independent from production. Production data cloning is not part of ordinary promotion.

Backups, retention, restoration objectives, and database topology remain open. Choose per-environment resources with explicit isolation; do not rely solely on unreviewed application filters in a shared database.

## Logs, health, and recovery

Collect build/runtime logs and metrics tagged with game, environment, release, and process. Redact known secrets; restrict access and set finite retention. Optional Sentry integration uses explicitly configured environment credentials and must not replace platform health monitoring.

Track process liveness, application readiness, restart count, resource pressure, room count, connection count, and deployment status. A healthy process is not proof that gameplay is correct.

On container failure, reconcile desired runtime and restart according to policy; volatile rooms may be lost. On host failure, fence stale allocations before moving/restarting them. Recovery claims, downtime targets, and room persistence are not yet committed.

## Metering and billing

Maintain an append-only usage ledger with game/environment, provider resource, tier, interval, measured quantity, provider unit-cost basis, and adjustment references.

For paid games:

```text
monthly multiplayer charge = one $10 bundle including Sandbox and game services
               + 1.5 × attributable sandbox Neon/Vultr/D1 cost
               + 2.0 × attributable production Neon/Vultr/D1 cost
```

Measure Vultr allocation duration, including provisioned idle time; no room-count billing assumption. Stopping a container ends its compute allocation charges once termination is recorded, while retained storage can continue to incur costs. Aggregate duplicate heartbeats/events without charging intervals twice.

Shared VM costs need an agreed allocation formula for CPU, memory, host overhead, unused capacity, rollout overlap, bandwidth, and billing granularity. Provider invoice costs and per-game usage are different data sets; reconcile them and retain auditable adjustments. Define how free allowances and discounts affect the cost basis.

Builds, R2, and other resource pricing remain open. Count the multiplayer bundle once, regardless of region count; do not charge another base fee for its included Sandbox or game services. Single-player service usage is included in its $5/month add-on, with Sandbox a separate $5/month add-on. Custom databases remain separately metered. Free single-player production does not enable free Sandbox use.

## Lifecycle and controls

Proposed environment states: unprovisioned, provisioning, running, draining, stopped, failed, suspended, deleting. Model frontend availability and backend allocation separately: stopping multiplayer does not automatically remove frontend files.

Deletion must distinguish environment compute, deployment history, and persistent data. Preserve provider-resource ownership checks to prevent deletion of another tenant's resources. Payment failure, abuse suspension, grace periods, hard caps, and recovery behavior require a published policy.

## Provider and tooling constraints

- Cloudflare: use `cf` unless an existing project has a Wrangler configuration.
- Neon: API provisioning with operation-status tracking and least-privilege secret handling. [Neon API](https://neon.com/docs/reference/api)
- Vultr: provision hosts through its provider interface; query supported plans/regions rather than hardcoding assumed availability.
- Void: candidate Cloudflare adapter only. Its coordinator must not independently become the authority for cross-provider release state. Adoption depends on verified source/license and integration tests.
- Any Git worktrees must follow the user's `D:\system\worktrees\<repo-name>\<worktree-name>` rule and be removed when finished.

## Acceptance criteria

- One game cannot read another game's secrets, artifacts, runtime endpoints, or private logs.
- Concurrent sandbox and production allocations are independently observable and metered.
- Resource reconciliation survives a coordinator restart without duplicate provisioning.
- A failed host is fenced before replacement allocations are activated.
- Dashboard and customer-game origins do not share privileged cookies.
- Every billed interval can be traced to a provider-cost basis and environment multiplier.
- Database credentials and provider tokens never enter public assets or customer build jobs.
