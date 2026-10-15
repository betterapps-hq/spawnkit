# Cloud: page brief

Status: proposed narrative, copy, and layout. Updated: 2026-10-14. Read with [public-site positioning](public-site-positioning.md) and [agreed pricing](decisions.md#agreed-pricing).

## The case to make

A playable local project is only the beginning of releasing a game. Developers need a build that can be inspected, a URL players can open, a controlled way to release changes, and enough context to understand problems afterward.

SpawnKit Cloud should present those as one connected workflow. Lead with the frontend-only game that can be hosted, then explain the additional operating model. Do not lead with infrastructure vendors, a complex multiplayer topology, or a claim that every planned service is available.

Primary action now: **Open dashboard** → `/dashboard`. Secondary action: **See pricing** → `/cloud#pricing`. Change the primary label to “Publish your game” only when that destination starts a verified customer publishing flow. No waitlist or sales-contact action should appear without a real destination and process.

## Proposed opening copy

Eyebrow: **SpawnKit Cloud**

Headline: **Bring your game to players. Keep control of every release.**

Body: Build supported game source in the cloud, share a hosted game URL, and manage versioned releases from one project. Inspect what changed, promote a tested build, and return to an earlier release when you need to.

Actions: **Open dashboard** / **See pricing**

Hero visual: one release card connected to a playable game and its URL. Show a specific version and environment without fabricated traffic or uptime metrics. A restrained transition can make the relationship clear; the scene must also work as a static diagram.

This is proposed launch copy. Resolve the customer publishing acceptance gap in the claim ledger before presenting the whole journey as generally available onboarding.

## Page sequence

### 1. Make the release journey understandable

Proposed heading: **From source to a game people can open.**

Use a short, readable sequence with a real artifact at its center:

| Step | Customer outcome | What to show |
| --- | --- | --- |
| Build | Supported source becomes a hosted release | Source revision, build result, completed build logs |
| Check | Open the built game before changing the live version | Immutable release URL and a playable browser view |
| Release | Point the intended environment at that build | Explicit target environment and release confirmation |
| Improve | Inspect a problem and decide the next change | Release history, relevant logs, and rollback control |

Do not call the immutable release URL a pull-request preview. Customer GitHub previews are a separate integration whose live acceptance remains outstanding. Do not animate logs as a live stream: current build logs arrive after completion.

### 2. Explain why environments matter

Proposed heading: **Try the next version without replacing the current one.**

Explain Production as what players receive, and the optional paid Sandbox as a separate staging environment for testing changes. Promotion reuses the built artifact; it does not create a different build. A release history provides a route back to a previous artifact.

Visual: two labeled environment cards, one selected release, and an explicit Promote action. Show the change in destination and preserve the version identity. State near rollback: **Rolling back a release does not undo database changes or player data.**

Keep “Preview,” “Sandbox,” and “Production” distinct. PR previews should join this section only after verification, with their lifecycle and cost explained. SpawnKit's own staging website is not a customer Sandbox example.

### 3. Make the platform visible through the product

Proposed heading: **One place to understand what is running.**

Show a real project view with its active release, environment, game URL, build outcome, and recent errors. Annotate three decisions the developer can make: open this version, inspect its build, or review a problem. This is stronger evidence than an abstract cloud full of provider logos.

The platform benefit is coordination: source, artifact, environment, and operational context belong to the same project. Explain platform-managed infrastructure in one short supporting paragraph. Technical details should explain supported source, build output, and release behavior. Keep private hosting-provider mappings out of public copy, consistent with the development contract.

### 4. Close the feedback loop

Proposed heading: **Give a bug report some context.**

Show a supported error or event tied to a release and session, with nearby logs or breadcrumbs. Explain that configured telemetry helps the developer investigate what happened. The logger is consent-gated and bounded; do not promise complete recording of every player action.

AI can be part of the developer's investigation, but the page must not suggest SpawnKit automatically diagnoses, patches, or deploys fixes. Session replay, symbolication, alerting, and regional analytics are not current logger capabilities. Link to technical setup rather than hiding these distinctions behind an “AI-powered” badge.

### 5. Present the offers and their costs together

Proposed heading: **Start with a browser game. Add what your game needs.**

Use three comparable offer cards, with availability visible beside the price:

| Offer | Best fit | Agreed price | Essential qualification |
| --- | --- | --- | --- |
| Frontend hosting | A frontend-only single-player game | Free production hosting | Usage/build allowances still need definition; free does not mean unlimited or include Sandbox |
| Game services | A single-player game needing supported official Colyseus services | $5 per game/month, service usage included | Coming soon; included quotas and abuse limits unresolved; custom databases separately metered |
| Multiplayer | A game needing a managed Colyseus runtime | $5 per game/month + provisioned runtime usage | Coming soon; allocated idle time counts; no fixed all-in $5 claim |

Place **Optional Sandbox: +$5/month plus usage** below the cards as a shared add-on. It is one Sandbox fee per game, not per region. Do not present it as included in the free plan.

The calculator should say **Fixed monthly fees** if it only adds game and Sandbox fees. For example, multiplayer plus Sandbox has $10 in fixed fees **before usage**, not an estimated $10 total. Put that distinction next to the number.

Keep the detailed rate basis in internal pricing documentation. Public estimates use SpawnKit rates and plan names; do not expose provider costs or infrastructure mappings. Do not invent hourly prices or extrapolate a monthly total before allocation and usage policies are defined. Builds, networking, storage and preview allowances also need explicit policy before checkout.

Paid cards should not contain an enabled purchase or activation action while billing and managed runtime delivery are unavailable. Clearly label their status and link to their explanation. Do not invent an email signup as a substitute.

### 6. Explain multiplayer without letting it take over

Proposed heading: **A path to multiplayer, built around Colyseus.**

Present this as the next offer, with a visible coming-soon status. Explain rooms and synchronized game state in developer-friendly language. Show clients connecting to a game room, not an invented global fleet.

Scope services to supported official Colyseus capabilities. Do not advertise a general economy, achievements, cross-game identity platform, automatic global matchmaking, autoscaling, or seamless room migration. Provider selection is architecture, not proof that the managed customer service is ready.

### 7. End with a concrete next step

Proposed heading: **Give your next release a home.**

Action: **Open dashboard**. Supporting link: **Still building? Create a starter kit** → `/templates`.

Before the final action, answer the practical questions not already resolved: supported static source/build format, whether a SpawnKit starter is required, domain availability, cost boundaries, and rollback scope. Verify import compatibility before claiming that any existing game can be hosted. Link to supported requirements rather than promising arbitrary backends or output directories.

## Evidence and launch gates

Use the October 14 [hosted build acceptance](internal/platform-operations.md#hosted-build-activation--october-14-2026) for the source → isolated build → playable artifact → promotion/rollback story. It proves that path in staging. Complete production-authenticated customer acceptance before asserting frictionless public availability.

Keep customer GitHub preview creation, custom-domain TLS activation, publicly distributed CLI onboarding, and paid runtime/billing as separate gates. Existing internal CI previews or a production health endpoint cannot stand in for them. Recheck [CLI evidence](internal/cli-platform-handoff.md) and [telemetry boundaries](telemetry-design.md) when selecting screenshots and copy.

## Design and acceptance

Use one coherent release visual throughout the page instead of unrelated cloud metaphors. Let visitors inspect a state change without requiring constant animation. Keep pricing easy to compare on mobile, with qualifications adjacent to amounts and availability visible without hovering.

Storybook should cover the page, environment explanation, pricing states/calculator, and reduced-motion/static presentation. Browser acceptance should verify navigation, price arithmetic and labels, disabled unavailable actions, keyboard/touch interaction, and every CTA destination. This brief defines those checks; it does not claim they have run.
