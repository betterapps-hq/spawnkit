# For Creators: page brief

Status: implemented locally, updated 2026-10-14. Read with [public-site positioning](public-site-positioning.md).

## The offer

SpawnKit provides a playable TypeScript starting point with compatible development tools. Creators choose an engine, inspect and download standalone source, then develop the game in their preferred editor. Hosting is optional.

Use **Start with a kit** for the primary action. The user is building a game from a kit. Engine-specific links preselect the shared catalog choice at `/templates?engine=pixi`, `phaser`, `babylon`, or `three`. The public builder does not require sign-in.

## Page sequence

The hero says **Start with a playable game. Make it yours.** Supporting copy: “Pick an engine and the tools your game needs. Download a free TypeScript starter and make it your own in your preferred editor.” Keep the engine-specific game art and source confirmation. Remove decorative captions and repeated reassurance lines. Concept art does not imply the generator delivers that finished game.

**Start your engines** introduces PixiJS, Phaser, Babylon.js, and Three.js from the shared template catalog. Explain their 2D/3D roles and preserve the chosen engine in builder links and the setup summary.

The tools section explains a development stack handpicked by experts. TypeScript, Vite, Oxlint, and Oxfmt have concrete roles. Two spacious workbench rows demonstrate physics and regression protection instead of generic feature cards.

The physics illustration is a real Rapier 3D marble course with an inclined track, barriers, collision posts, and a landing target. “Release marbles” starts a bounded simulation. WebGL failure keeps a static SVG course and the surrounding content available. Reduced motion directly renders a settled state.

The testing workbench switches between unit and browser suites. Unit testing baselines demonstrate movement bounds, consistent simulation, and independent sessions. Browser checks show a keyboard-controlled player collecting an item. Queued, running, and passed states explain repeatable checks without claiming a guarantee of correctness. Pause and replay are available; offscreen/hidden-tab playback stops and reduced motion shows passed examples. Copy explicitly connects tests to preventing regressions and use by the preferred AI agent.

The local setup panel uses the generated project commands: `pnpm install`, `pnpm dev:setup`, and `pnpm dev`. Copy remains available in the panel header. Runtime prerequisites belong in the generated README and getting-started documentation, rather than a second marketing footer.

The browser showcase places a laptop and phone in one composition. The Prism Break screen is drawn in SVG, with browser chrome, device bezels, a keyboard, and trackpad. The laptop participates in document flow so its height cannot overlap the next section. Both devices represent browser play. Native desktop and mobile exports are separately marked coming soon.

The finale says **Choose a kit. Build your game.** It repeats the primary action and offers a secondary Cloud link.

## Visual and editorial rules

Use the existing theme tokens and shadcn controls. Scope marketing typography so the public base styles cannot collapse heading size, line height, or paragraph spacing. Headings need room for multiple lines. Default new visitors to dark mode across the app; honor explicit Light and System preferences, including OS changes.

No em dashes, decorative numbering, text arrows, or dot separators. Primary actions have no arrow. Secondary navigation uses icons. Avoid filler, repeated promises, and generic lists that do not explain the product.

The gameplay, test results, and device screens are illustrative examples. Keep tests and optional physics honest about builder selections. Native exports remain future scope.

## Acceptance

Verify selected-engine links, standalone download accuracy, keyboard and touch controls, animated test pause/replay, reduced motion, WebGL fallback, and actual physics settling. Check that both devices stay within the section at desktop, tablet, and narrow-phone widths.

Storybook reuses the full Creators page and has focused creator-workbench and browser-device stories. Browser acceptance covers the dark default and saved theme choices. Run `pnpm verify` and the public, marketing, Cloud, and Creator browser suites after coherent changes.
