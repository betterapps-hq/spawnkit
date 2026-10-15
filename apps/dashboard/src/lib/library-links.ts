export interface LibraryLink {
  label: string
  href: string
}
const pair = (website: string, github: string): LibraryLink[] => [
  { label: "Website", href: website },
  { label: "GitHub", href: github }
]
export const libraryLinks: Record<string, LibraryLink[]> = {
  "ui:react": pair("https://react.dev/", "https://github.com/facebook/react"),
  "addon:playwright": pair("https://playwright.dev/", "https://github.com/microsoft/playwright"),
  "addon:storybook": pair("https://storybook.js.org/", "https://github.com/storybookjs/storybook"),
  "addon:vitest": pair("https://vitest.dev/", "https://github.com/vitest-dev/vitest"),
  "addon:xstate": pair("https://stately.ai/docs", "https://github.com/statelyai/xstate"),
  "addon:zustand": pair("https://zustand.docs.pmnd.rs/", "https://github.com/pmndrs/zustand"),
  "addon:koota": [{ label: "GitHub", href: "https://github.com/pmndrs/koota" }],
  "addon:bitecs": [{ label: "GitHub", href: "https://github.com/NateTheGreatt/bitECS" }],
  "physics:rapier2d": pair("https://rapier.rs/", "https://github.com/dimforge/rapier.js"),
  "physics:rapier3d": pair("https://rapier.rs/", "https://github.com/dimforge/rapier.js"),
  "physics:arcade": [
    { label: "Documentation", href: "https://docs.phaser.io/phaser/concepts/physics/arcade" },
    { label: "GitHub", href: "https://github.com/phaserjs/phaser" }
  ],
  "physics:matter": pair("https://brm.io/matter-js/", "https://github.com/liabru/matter-js"),
  "physics:havok": [
    {
      label: "Documentation",
      href: "https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/physics/v2/usingHavok.md"
    },
    { label: "GitHub", href: "https://github.com/BabylonJS/havok" }
  ],
  "ui:html": [{ label: "Documentation", href: "https://developer.mozilla.org/en-US/docs/Web/HTML" }],
  "ui:pixi": [{ label: "GitHub", href: "https://github.com/pixijs/ui" }],
  "ui:babylon": [
    { label: "Documentation", href: "https://doc.babylonjs.com/features/featuresDeepDive/gui/gui" },
    { label: "GitHub", href: "https://github.com/BabylonJS/Babylon.js" }
  ],
  "telemetry:sentry": pair("https://sentry.io/", "https://github.com/getsentry/sentry-javascript"),
  "mode:multiplayer": pair("https://colyseus.io/", "https://github.com/colyseus/colyseus")
}
