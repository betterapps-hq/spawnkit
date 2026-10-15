# Public site: positioning and offers

Status: proposed messaging and design brief. Updated: 2026-10-14.

The agreed creative direction is **playful and polished: game visuals, clear product explanations, restrained motion**. This brief defines the case the public site should make before further page implementation. It does not change product scope or pricing.

## One platform, two useful starting points

SpawnKit helps developers turn a game idea into a standalone web project, then bring that project to players. The site should make those two offers independently understandable:

| Entry | Visitor's question | Offer | Next step |
| --- | --- | --- | --- |
| [For Creators](creators-page.md) | How do I start building my game? | A playable starting point, a compatible stack, and source you can develop locally | Build a starter kit |
| [Cloud](cloud-page.md) | How do I release and operate my game? | Source builds, hosted releases, environment controls, and operational context | Open the dashboard; use guided publishing when verified |
| Discover | What could I make or play here? | Games and creative inspiration | Play a game or explore creation |

The connection is **build, publish, improve**. Creation should remain valuable without buying hosting. Cloud should be presented as a useful continuation, not a prerequisite for opening or editing the generated project.

Primary audience: independent developers and small teams making browser games, including people working with AI coding tools. They may understand code without wanting to assemble every tool and release process themselves. Avoid implying a no-code editor, a prompt-to-finished-game service, or a replacement for game design.

## Make the value concrete

| Friction | Value to explain | Evidence to show |
| --- | --- | --- |
| Choosing tools and wiring a project before anything plays | Begin with a compatible, editable foundation | Live builder choices, generated file preview, a playable starter loop |
| Uncertainty about what the generator produces | See and keep the source | Actual folder structure and a short generated code excerpt |
| Changing a game without knowing what broke | Include checks in the development loop | A real selected test and its player action, rather than a decorative green score |
| Turning local source into a shareable game | Publish a built release to a game URL | A verified source-to-build-to-browser example |
| Releasing the wrong version or losing a known-good one | Make releases inspectable and reversible | Same artifact moving between environments, with clear release history |
| Debugging a report without context | Relate logs and errors to a release and session | Actual telemetry fields and a useful filtered view |

Do not lead with a wall of vendor logos. Explain the benefit first, then identify the engine, tools, or infrastructure that makes it possible. Avoid unmeasured promises about time saved, speed, reliability, or cost compared with alternatives.

## Offer architecture

**Create:** choose an engine and compatible modules, inspect the result, download a standalone starter, and work in a local editor. The download is a development foundation, not a finished commercial game. AI assistance belongs in this local workflow; the site should not imply a hosted AI game generator.

**Publish:** upload supported source, build it in isolation, and serve an immutable release through a project URL. Show the release controls as a coherent workflow rather than separate feature cards.

**Operate:** inspect errors and logs, manage environments, and return to a known-good release. Paid services and multiplayer extend the offer when available; they must not obscure the simpler frontend-only path.

## Navigation and visual language

Keep the header direct: brand, Discover, For Creators, Cloud; a quiet Dashboard link and one primary “Make a game” action. Use readable text and a clear active state rather than a miniature dashboard-style segmented control. Mobile navigation must preserve the same choices and keyboard access.

Use game artwork to create desire and product demonstrations to establish trust. Each major visual should explain something: engine choice changes the starter, an item reacts to physics, a release moves into an environment. Avoid floating labels that merely repeat the adjacent heading.

Use a warm light surface, purple accents, generous type, and occasional dark code or release panels. Reserve motion for a small playable interaction or a clear state change. No large cursor-following glow, constant parallax, or animation required to understand the page. Provide a static equivalent and respect reduced motion.

Do not invent customers, player counts, testimonials, awards, uptime, or performance numbers. Keep routine fixture documentation out of polished page copy, consistent with the existing homepage direction. Put availability labels beside genuinely unavailable offers; do not add blanket “demo” badges to every illustration.

## Claim boundaries at this date

This is an editorial ledger, not public page copy. Recheck it before launch because the implementation is changing quickly.

| Capability | Evidence and boundary | Editorial treatment |
| --- | --- | --- |
| Standalone starter generation | Shared catalog, compatible selections, file preview and ZIP generation are implemented | Demonstrate the actual output; do not imply every combination supports every module |
| Public CLI installation | Repository CLI exists; registry publication remains outstanding | Prefer the browser builder. Do not publish an unverified `npx` install command |
| Hosted source builds | Real isolated build, playable output, promotion and rollback verified in staging on October 14 | Describe the mechanism; complete production-authenticated customer acceptance before a frictionless public publishing promise |
| Customer GitHub previews | Integration code and App ping exist; live webhook-driven game preview remains unverified | Present as planned until the complete customer flow passes |
| SpawnKit's own PR previews | App and Storybook previews are operational | Internal delivery evidence, not proof of customer game previews |
| Project domains | SpawnKit project subdomains are routed; customer domain TXT verification exists but custom TLS activation is pending | Show a project URL; do not claim custom domains are generally available |
| Telemetry | Bounded consent-gated logs, events, errors and dashboard queries implemented | Show supported context. Do not imply session replay, autonomous fixes, or deployed regional analytics |
| Paid multiplayer and services | Pricing direction agreed; managed multiplayer runtime and customer billing deferred | Clearly marked coming soon; no working checkout implication |
| Native distribution | Browser is current; desktop/mobile packaging is future scope | Lead with browser games; qualify native export near any platform visual |

## Success and implementation handoff

Creators succeeds when a visitor understands what they receive and completes a compatible starter download. Cloud succeeds when a visitor understands the release workflow, the available offer, and its cost boundaries before entering the dashboard.

Proposed measurement: page CTA, builder completion, download, and successful first deployment where existing privacy controls permit it. Treat these as separate steps; a download does not prove a game ran. Do not add tracking as part of the visual overhaul without defining its consent and data contract.

Implement the page briefs after the messaging is settled, then verify desktop/mobile layouts, navigation, real CTA destinations, reduced motion, and each interactive demonstration in Storybook and browser acceptance. Keep the docs' capability ledger synchronized with verified releases.

## Source of truth

- [Product decisions and pricing](decisions.md)
- [Current generator and development workflow](development.md)
- [Hosted build activation and operational limits](internal/platform-operations.md#hosted-build-activation--october-14-2026)
- [CLI acceptance scope](internal/cli-platform-handoff.md)
- [Telemetry implementation and exclusions](telemetry-design.md)

Later dated operational evidence supersedes earlier “hosted builds pending” text. A deployed component or staging acceptance does not, by itself, prove public customer onboarding.
