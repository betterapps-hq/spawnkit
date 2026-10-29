# Cloud page

Updated: 2026-10-14.

## Offer and audience

SpawnKit handles the infrastructure around a web game so creators can focus on gameplay with their preferred AI agent. Explain the work the platform takes off their hands: project setup, repeatable checks, managed builds and CI/CD, environments, versioning, and investigation using telemetry.

Keep the existing playful, polished visual design. Improve the substance and remove repetition instead of replacing the artwork, colors, cards, or page identity.

## Page narrative

The hero keeps “Bring your game to players.” Supporting copy connects the creator's local AI workflow to hosting and iteration. The artwork represents Orchard Trail in production, with one specific deployment confirmation: the checkpoint fix is live. Remove abstract slogans, floating promises, and the redundant free-hosting reassurance line.

Use one interactive workflow:

- **Create:** standalone TypeScript templates and CLI composition give creators and their AI agents an editable foundation.
- **Test:** configured type checking, linting, and formatting, with optional Vitest and Playwright. Explain unit testing baselines for movement, world boundaries, and independent sessions. Demonstrate a regression check such as restoring a checkpoint.
- **Deploy:** CLI source publishing and generated GitHub Actions workflows feed managed builds. Saved versions, Sandbox, promotion, and rollback explain delivery without asking the creator to assemble infrastructure.
- **Monitor:** game events, errors, logs, version, environment, and session context help investigate a failed player action with the preferred AI agent.

Use distinct animated illustrations for each task: a movement-code edit connected to a playable preview, queued/running/passed build checks, a pull request merging into staging before promotion or rollback, and session activity connected to an inspectable checkpoint error. A build is a saved version before production; reserve release language for publishing it. Remove the repeated source/build/artifact strips and the separate project-overview and error-context sections.

Animations pause outside the viewport and in hidden tabs. Provide pause controls and replay for the workflow sequences. Reduced motion shows meaningful static states while keeping deployment inspection and service selection usable. The service orbit also pauses on hover or keyboard focus so its buttons are easy to use.

The multiplayer section explains Colyseus rooms, matchmaking, synchronized state, and reconnection. Managed game services orbit the game server, replacing the static player tokens. Selecting an orbit icon selects the matching service in the integrated browser below. It uses the shared catalog's official capabilities: player authentication, cloud saves, leaderboards, live configuration, game analytics, moderation, and player notes. Each description explains its practical function, shows a concrete example, and links to its official documentation. Managed multiplayer and game services remain coming soon.

## Pricing

The revised offer replaces the earlier optional-Sandbox multiplayer structure:

| Offer | Fixed fee | Includes |
| --- | --- | --- |
| Single-player | Free | Templates, CLI, managed build/deployment workflow, production hosting, version history, rollback, and platform telemetry |
| Single-player Sandbox | +$5/month | Separate staging environment; metered resources remain separate |
| Single-player game services | +$5/month | Official game services, including service usage within the eventual published quotas |
| Multiplayer | $10/game/month plus machine usage | Managed Colyseus, Sandbox, and game services |

Show two offer cards, with the single-player add-ons inside its card and dedicated Sandbox and managed game services inclusion cards in the multiplayer offer. Do not repeat the cards in a fixed-fee calculator.

The compute calculator belongs directly under the multiplayer offer. Use shared catalog machine specifications and customer hourly estimates, with distinct production/Sandbox rates. Following the location-first pattern in the [Colyseus pricing simulator](https://colyseus.io/cloud-managed-hosting/), visitors choose a location and machine before adding it. Keep every configured region visible in its own card with its machine, production/Sandbox hours, and subtotal. A separate summary charges the bundle once. Prevent duplicate regions and hide the total if any region has invalid hours. Show CPU, memory, hourly rates, and estimated allocated hours. Default the example to one standard production machine at 730 hours and zero Sandbox machine hours. A zero-hour Sandbox does not mean its allocated machine can run for free.

The estimate includes the $10 bundle exactly once and selected machine hours. Never charge another $5 for multiplayer Sandbox or services. Include idle allocated time; identify separately metered resources and estimated rates adjacent to the estimate. Do not expose internal provider costs or claim unlimited usage.

Keep the dashboard estimate consistent with the same pricing helper. Including Sandbox in the price does not silently enable or provision it in an existing project's saved configuration.

## Editorial rules

The hero deployment confirmation is a compact angled toast with a success icon and subtle depth. Orbit icons are larger, with an individual color for each service and readable labels. Service previews use distinct account, checkpoint save, leaderboard, live settings, activity chart, moderation, and support-note layouts. Intro typography uses explicit spacing; wrapping service tabs leave room for their keyboard focus outlines.

The seven services come from SpawnKit's current shared catalog, not an exhaustive Colyseus inventory. The [current Colyseus database overview](https://docs.colyseus.io/database) also lists player segments for targeting. Matchmaking, room management, state synchronization, and tooling are framework capabilities rather than additional entries in this managed-service browser. Adding a new managed service requires updating the shared product contract, not just marketing copy.

No em dashes, decorative numbering, text-character arrows, or dots as separators. Primary actions have no arrow; secondary navigation may use an icon. Use “Start with a kit” for the starter CTA. No slogans that could fit any product, decorative three-item flows, or captions that repeat headings. Every paragraph must explain a feature, its value, a concrete example, or a necessary next step.

## Availability and verification

Templates, the local CLI, source builds, version controls, and consent-gated telemetry have implementation evidence in the repository. The October 14 customer GitHub acceptance in [platform operations](internal/platform-operations.md) verifies production and Sandbox branch deployments, same-repository PR preview creation/update, and cleanup after closing the PR. The production GitHub App is enabled; staging retains its separate configuration. Public CLI registry distribution, paid multiplayer runtime, paid checkout, and native exports remain separate launch gates. Do not turn a pricing or copy change into infrastructure activation. Removing a consent caption does not change telemetry's consent behavior.

Product visuals use illustrative records, not live deployments or monitoring results. The editor, check timings, PRs, version transitions, session activity, and service records are authored examples. Buttons inspect the examples without changing a project or provisioning resources. Keep that distinction documented here without adding redundant demo badges throughout the page.

Storybook reuses the page, workflow, managed services, and pricing components, with focused build-check, promotion/rollback, and monitoring stories. Check desktop/mobile rendering, theme contrast, keyboard tabs and machine selection, multi-region estimates, invalid-hour handling, animation playback/reduced motion, service selection, and CTA destinations. Run the repository verification suite and relevant browser acceptance checks.
