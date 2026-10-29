# Game services process

## Launch boundary

Agreed: expose capabilities provided by Colyseus and its official packages; do not build an additional custom game-services platform at launch. The free single-player preset is frontend-only and has no hosted player accounts, cloud saves, or leaderboard backend.

Single-player games may add official game services for $5/month including service usage. Included quotas and abuse limits remain open. Single-player Sandbox costs a separate $5/month plus usage. The $10/month multiplayer bundle includes game services and Sandbox, with machine usage billed separately. Developer login for the hosting platform is required independently of game player authentication.

## Capability inventory

Current official documentation is the discovery baseline. Each module needs a pinned-version compatibility check and working example before being advertised as supported.

| Capability | Candidate official interface | Launch treatment |
| --- | --- | --- |
| Rooms/state sync | Colyseus runtime and client SDK | Core multiplayer template |
| Matchmaking/lobbies | Room definitions and official matchmaking features | Configurable within supported runtime |
| Reconnection | Colyseus room/client lifecycle | Demonstrated in multiplayer examples |
| Player auth | `@colyseus/auth` | Optional module; auth methods/configuration must be selected |
| Database | `@colyseus/database` + Drizzle | Optional persistence module |
| Saves/leaderboards | Official database services/plugins | Optional template modules |
| Live configuration | Official typed configuration service | Optional module |
| Analytics/moderation/notes | Official database services | Supported only after verification and access-control review |
| Administration | Official admin/monitor tooling | Private, game-scoped integration |

Achievements, economy, inventory, purchases, and custom cross-game APIs are not launch promises. A third-party integration mentioned in Colyseus documentation does not automatically become a platform-supported service.

Sources: [Colyseus overview](https://docs.colyseus.io/), [database services](https://docs.colyseus.io/database/services), [auth module](https://docs.colyseus.io/auth/module).

## Enablement process

1. Developer adds an official capability through the generator or declares it in the manifest.
2. Generator adds pinned dependencies, server configuration, client example, and migration files when needed.
3. Import inference identifies known official imports and recommends missing configuration; it does not create paid resources by merely scanning files.
4. Platform plan shows database, runtime, secrets, and charge implications.
5. Deployment provisions environment-scoped resources and applies migrations.
6. Health checks verify module initialization; gameplay checks exercise a disposable test identity where appropriate.
7. Dashboard exposes relevant health and private administration, not unrestricted database access.

The platform owns resource orchestration, while each game's code uses upstream APIs directly. Avoid a proprietary SDK wrapper unless needed for endpoint discovery/configuration; such a wrapper must not change upstream service semantics silently.

## Player identity

Proposed: identity is scoped to game and environment. Sandbox accounts do not sign into production automatically. Platform developer identities are not player identities.

`@colyseus/auth` documents anonymous, email/password, and OAuth support and is marked beta. Its database integration can supply user storage, but email delivery callbacks still require wiring. Supported launch login methods, sender/provider ownership, OAuth credentials, abuse controls, and branded UI are open decisions.

Generate per-environment signing/session secrets. Do not copy signing keys between environments on promotion. Configure allowed origins and OAuth callbacks explicitly. Room authentication must verify identity and permissions before admitting clients; session IDs alone are not durable player identity.

## Persistence and migration

The documented database package was introduced in Colyseus 0.18 and depends on a Drizzle release candidate. Pin and test a compatible package set rather than using floating tags in generated projects. [Database setup](https://docs.colyseus.io/database)

Proposed production default for this module: Neon PostgreSQL. Local development can use an upstream-supported local database. D1 compatibility in a Node.js runtime is a separate spike; its availability on Cloudflare does not prove compatibility here.

Keep durable data outside ephemeral container filesystems. Record migration checksums and execution results per environment. Development auto-migration convenience does not establish a production rollback strategy. Run reviewed migrations through the coordinator before activation; preserve compatibility during draining.

## Saves, scores, and configuration

- Saves use upstream slot/version semantics. Demonstrate conflict handling rather than silently overwriting concurrent changes.
- Game code defines what data is persisted and when. A container shutdown is not a guarantee that every player's latest in-memory state was saved.
- Leaderboard score writes should originate from authoritative server logic for competitive games. A client-supplied score is not automatically trustworthy.
- Live configuration changes are authenticated administrative mutations. Scope values to the environment and validate them using the upstream schema.
- Promotion does not move saves, scores, accounts, live config values, or analytics rows. A later explicit data-copy feature requires its own process.

Room plugins must be exercised against lifecycle ordering in the pinned release, particularly loading after a player state entry exists and saving before it is removed.

## Administration and telemetry

Operational telemetry monitors hosting health. Game analytics records developer-defined player/game events. Keep their purposes, access, and retention distinct.

Protect Colyseus admin/monitor endpoints through game-scoped access. Review any CRUD, moderation, notes, and role-management functions before dashboard integration. Do not expose privileged upstream panels directly on public game origins.

Player deletion/export and analytics retention need documented policies before these modules are offered publicly. Avoid collecting unnecessary identifiers in generated examples.

## Scaling and recovery

Initial single-process operation avoids introducing horizontal coordination by default. Multi-process Colyseus scaling needs upstream-compatible shared presence/driver infrastructure and process-specific room endpoints; Redis is documented for that path. [Scaling](https://docs.colyseus.io/scalability)

Official persistent services can survive server replacement when storage survives. Live room state does not automatically survive process/host failure. Do not advertise seamless room restoration or competitive anti-cheat solely because the runtime is authoritative.

## Acceptance criteria

- An optional persistence template can register a supported test identity, save/load data, and submit/read a leaderboard using pinned official APIs.
- Saves survive code deployment and backend replacement with the same environment database.
- Sandbox identities/data cannot access production services.
- A forged identity cannot join an authenticated room or write another player's save.
- A stale save version produces a handled conflict.
- Schema-incompatible rollback is blocked without modifying player data.
- Disabling a module reports retained resources and costs rather than deleting durable data implicitly.

## Dashboard service inventory (2026-10-13)

The Services section lists player authentication and the six services documented at [Colyseus database services](https://docs.colyseus.io/database/services): cloud saves, leaderboards, live configuration, analytics, moderation, and player notes. They are selectable in both single-player and multiplayer configuration drafts. Selection records a persistence requirement; it does not install adapters or activate backend operations. Rooms, state synchronization, matchmaking, and reconnection belong to the core Colyseus runtime rather than optional persistence-service checkboxes. Admin/monitor tooling and third-party payments are separate integrations.
