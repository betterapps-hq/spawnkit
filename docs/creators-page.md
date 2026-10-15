# For Creators: page brief

Status: proposed narrative, copy, and layout. Updated: 2026-10-14. Read with [public-site positioning](public-site-positioning.md).

## The case to make

Starting a game should begin with something playable. SpawnKit provides the project foundation so a developer can spend their attention on the game: choose compatible tools, get editable source, and iterate locally with checks alongside the code.

The offer is a **standalone starter project**, not access to a proprietary browser editor. The page must answer, in order: what can I make, what do I receive, how do I make it mine, and how does it reach players?

Primary action: **Build your starter kit** → `/templates`. Secondary action: **Explore games** → `/`. Engine-specific links may preselect `/templates?engine=pixi`, `phaser`, `babylon`, or `three`. Do not send the first action to a sign-in screen when the visitor can use the builder directly.

## Proposed opening copy

Eyebrow: **For game creators**

Headline: **Start with a playable game. Make it yours.**

Body: Choose your engine, add the tools your game needs, and download a standalone TypeScript project. Build in your own editor, with your own ideas—and your AI coding tools if you use them.

Actions: **Build your starter kit** / **Explore games**

Supporting line: **Editable source. Compatible tools. A starting point you can play.**

The hero should show a small playable starter beside a compact view of its project files. Game artwork can frame the experience, but should not imply the generator delivers the illustrated finished game. Keep the primary action visible without scrolling on common laptop screens.

## Page sequence

### 1. Choose the starting point that fits your game

Visitor question: “Is this for the kind of game I want to make?”

Explain 2D and 3D before listing libraries. Present PixiJS and Babylon.js as the default paths, with Phaser and Three.js as alternatives. Avoid declaring one engine universally best. A selected engine changes the relevant visual, a short explanation, and the builder link.

Proposed heading: **Your game, your starting point.**

Proposed copy: Start in 2D or 3D. Pick an engine, then choose the compatible pieces your project needs. You can inspect the files before downloading them.

Visual: two clear 2D/3D groups with engine choices and one selected preview. Use the actual shared catalog to determine available selections; do not maintain a separate marketing compatibility matrix.

### 2. Show what comes in the download

Visitor question: “What am I actually getting?”

Proposed heading: **A real project, ready to become your game.**

Show an actual generated file tree with three annotated areas: game source, selected modules, and development commands. Explain that the ZIP is standalone, dependencies are installed locally, and source can be edited in a normal editor. Hosting is optional.

Make the first-use path explicit: **configure → download → install dependencies → run locally**. Use exact commands from the selected generated README when implemented. Avoid an unpublished global CLI command or a fake one-click path that skips installation.

Proof: a file preview linked to the builder, not an illustration of files the generator does not produce. Describe selectable tests and modules as selections, rather than implying every starter includes every option.

### 3. Make the benefit tangible through play

Visitor question: “How does this help me build?”

Proposed heading: **Less setup. More things to try.**

Pair a small physics interaction with its editable source and a meaningful test example. Let visitors drop an object or collect an item, then explain the small behavior they could change. Keep interactions bounded, touch-friendly, and optional.

Three messages are enough:

- **Change the game:** own the movement, rules, and presentation in readable source.
- **Add compatible pieces:** select supported physics, interface, and data options in the builder.
- **Check your changes:** selected unit and browser tests give the development loop concrete checks.

Do not frame tests as a guarantee that AI-written code is correct. Show what a check actually verifies, such as movement and collection, rather than an invented quality score.

### 4. Explain the local and AI-assisted workflow

Visitor question: “Do I have to change how I work?”

Proposed heading: **Keep your editor. Bring your imagination.**

Proposed copy: Work with the source locally. Read it, change it, commit it, and use the coding tools you already prefer. SpawnKit gives you a foundation to build on; you decide what the game becomes.

Use a compact source/change/play sequence. Do not fabricate an AI chat that promises to generate a finished game, and do not make an AI subscription appear required. Include the CLI as a secondary workflow only once public installation is verified.

### 5. Connect creation to players

Visitor question: “What happens when I want to share it?”

Proposed heading: **Built for the browser. Ready for your next step.**

Lead with browser play and responsive game experiences. If the platform showcase includes desktop or phone frames, distinguish playing in those browsers from native application export. Native packaging remains coming soon.

Briefly introduce Cloud: **When your game is ready to share, explore hosted builds, release controls, and a game URL with SpawnKit Cloud.** Link **Explore Cloud** → `/cloud`. Keep this subordinate to creating the starter, rather than turning the page into a second pricing page.

Final action: **Make your first move.** / **Build your starter kit**.

## Questions the page should resolve

| Question | Answer to communicate |
| --- | --- |
| Do I need to code? | This is a developer workflow using editable TypeScript, including AI-assisted coding |
| Is it a finished game? | It is a playable foundation to develop into your game |
| Can I keep the source? | The generated project is standalone and editable; do not imply ownership of third-party engines or assets |
| Do I need SpawnKit hosting? | No; creation and hosting are separate offers |
| Does every engine support every feature? | Available combinations come from the builder's shared compatibility contract |
| Does it export native apps? | The current offer is browser games; native distribution is future scope |

Use short inline explanations where the question arises. Add a small FAQ only for answers that do not fit naturally; do not repeat the entire page below the CTA.

## Design and acceptance

Give the page one memorable playable moment, one concrete source view, and a clear progression. Avoid several simultaneous animated scenes. Real engine logos support selection; they should not dominate the hero.

Before shipping: verify selected-engine links, generated-output accuracy, keyboard/touch behavior, static fallback, reduced motion, narrow screens, and the absence of unpublished install instructions. Add full-page and key-interaction Storybook coverage. These are acceptance requirements, not claims that the current draft has passed.
