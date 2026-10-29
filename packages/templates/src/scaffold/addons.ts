import { defineAddon, type AddonManifest, type Contribution } from "@buildkitgg/scaffolder"
import { telemetryFiles } from "@spawn/telemetry/scaffold"
import { browserToolsSource } from "../browser-tools"
import { playwrightConfiguration } from "../local-development"
import { ecsSimulation, kootaSimulation, plainSimulation, simulationTest } from "../simulation"
import { browserTests } from "./tests"

type Versions = { version(name: string): string }

const file = (path: string, content: string, ownership: "owned" | "seed" | "sample" = "seed"): Contribution => ({
  kind: "file",
  path,
  content,
  ownership
})
const dependency = (ctx: Versions, name: string, dev = false): Contribution => ({
  kind: "dependency",
  name,
  version: ctx.version(name),
  ...(dev ? { dev: true } : {})
})
const system = (id: string, module: string, exported: string, band?: "pre" | "post"): Contribution => ({
  kind: "entry",
  point: "game.systems",
  id,
  value: { ref: { module, export: exported } },
  ...(band ? { order: { band } } : {})
})
/** Lets an add-on name the renderers it works with. */
const onlyOn =
  (...renderers: string[]) =>
  (ctx: { target: { mode: string } }) =>
    renderers.includes(ctx.target.mode) || `It works with ${renderers.join(" and ")} only.`
const vitest = "@spawnkit/vitest"

const paused = `let paused = false
  const toggle = () => {
    paused = !paused
    return paused
  }`
const lifecycle = `return {
    isPaused: () => paused,
    dispose: () => {
      cleanup()
      window.removeEventListener("keydown", onKey)
    }
  }`
const escape = `const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") toggle()
  }
  window.addEventListener("keydown", onKey)`
const uiNotes = `# UI

Press Escape to pause and resume. Canvas-based controls supplement keyboard input. The UI is a system in
spawnkit/game.ts, so while it's paused the game loop and every physics system wait.
`

function uiTest(setup: string, imports: string, cleanup: string, html: boolean) {
  return `import { expect, it } from "vitest"
import { createUI } from "./ui"
${imports}
it("controls pause state and removes its interface on disposal", async () => {
  document.body.innerHTML = "<header></header>"
  ${setup}
  expect(ui.isPaused()).toBe(false)
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }))
  expect(ui.isPaused()).toBe(false)
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
  expect(ui.isPaused()).toBe(true)
  ${html ? 'document.querySelector("button")!.click()\n  expect(ui.isPaused()).toBe(false)\n  expect(document.querySelector("button")!.getAttribute("aria-pressed")).toBe("false")' : ""}
  ui.dispose()
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
  expect(ui.isPaused()).toBe(${!html})
  ${cleanup}
})
`
}

function ui(spec: {
  id: string
  title: string
  description: string
  renderers?: string[]
  source: string
  packages?: string[]
  test: [setup: string, imports: string, cleanup: string]
}): AddonManifest {
  return defineAddon({
    id: `@spawnkit/${spec.id}`,
    version: "1.0.0",
    title: spec.title,
    description: spec.description,
    slot: "ui",
    provides: { pause: { key: "Escape" } },
    ...(spec.renderers ? { supports: onlyOn(...spec.renderers) } : {}),
    contribute: (ctx) => [
      ...(spec.packages ?? []).map((pkg) => dependency(ctx, pkg)),
      file("src/ui.ts", spec.source),
      system("ui", "./src/ui", "createUI"),
      file("docs/ui.md", uiNotes, "sample"),
      ...(ctx.selected(vitest) ? [file("src/ui.test.ts", uiTest(...spec.test, spec.id === "html-ui"), "sample")] : [])
    ]
  })
}

const htmlUi = ui({
  id: "html-ui",
  title: "HTML / CSS",
  description: "A pause button in the page header, styled with CSS.",
  source: `export function createUI() {
  ${paused}
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = "Pause"
  button.setAttribute("aria-label", "Pause game")
  const update = () => {
    button.textContent = paused ? "Resume" : "Pause"
    button.setAttribute("aria-pressed", String(paused))
  }
  button.onclick = () => {
    toggle()
    update()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      toggle()
      update()
    }
  }
  window.addEventListener("keydown", onKey)
  document.querySelector("header")?.append(button)
  const cleanup = () => button.remove()
  ${lifecycle}
}
`,
  test: ["const ui = createUI()", "", 'expect(document.querySelector("button")).toBeNull()']
})

const pixiUi = ui({
  id: "pixi-ui",
  title: "Pixi UI",
  description: "A pause button drawn on the Pixi stage.",
  renderers: ["pixi"],
  packages: ["@pixi/ui"],
  source: `import { FancyButton } from "@pixi/ui"
import { Graphics, Text, type Application } from "pixi.js"
export function createUI({ app }: { app: Application }) {
  ${paused}
  const text = new Text({ text: "Pause / Resume", style: { fontSize: 15, fill: 0xffffff } })
  const button = new FancyButton({ defaultView: new Graphics().roundRect(0, 0, 150, 38, 8).fill(0x7351c6), text })
  button.position.set(16, 16)
  button.onPress.connect(toggle)
  app.stage.addChild(button)
  ${escape}
  const cleanup = () => {
    button.onPress.disconnectAll()
    button.destroy({ children: true })
  }
  ${lifecycle}
}
`,
  test: [
    "const app = new Application(); await app.init({ width: 300, height: 100 }); const ui = createUI({ app })",
    'import { Application } from "pixi.js"',
    "app.destroy(true, { children: true })"
  ]
})

const babylonGui = ui({
  id: "babylon-gui",
  title: "Babylon GUI",
  description: "A pause button in a full-screen Babylon GUI layer.",
  renderers: ["babylon"],
  packages: ["@babylonjs/gui"],
  source: `import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui"
import type { Scene } from "@babylonjs/core/scene"
export function createUI({ scene }: { scene: Scene }) {
  ${paused}
  const texture = AdvancedDynamicTexture.CreateFullscreenUI("hud", true, scene)
  const button = Button.CreateSimpleButton("pause", "Pause / Resume")
  button.width = "160px"
  button.height = "40px"
  button.color = "white"
  button.background = "#7351c6"
  button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  button.top = "16px"
  button.onPointerClickObservable.add(toggle)
  texture.addControl(button)
  ${escape}
  const cleanup = () => texture.dispose()
  ${lifecycle}
}
`,
  test: [
    "const engine = new NullEngine(); const scene = new Scene(engine); const ui = createUI({ scene })",
    'import { NullEngine } from "@babylonjs/core/Engines/nullEngine"\nimport { Scene } from "@babylonjs/core/scene"',
    "scene.dispose(); engine.dispose()"
  ]
})

const physicsNotes = (engine: string) => `# Physics

${engine} runs as a system in spawnkit/game.ts, with a falling-ball collision example synchronized to the renderer.
Arrow-key player movement stays in the editable simulation in src/simulation.ts; it isn't a physics character
controller. While the game is paused, the physics world doesn't step.
`

function rapierSource(dimension: "2d" | "3d") {
  const two = dimension === "2d"
  const demo = `export async function createPhysicsDemo() {
  await RAPIER.init()
  const world = new RAPIER.World(${two ? "{ x: 0, y: 500 }" : "{ x: 0, y: -9.81, z: 0 }"})
  world.timestep = 1 / 60
  const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(${two ? "150, 500" : "-3, -0.1, 0"}))
  world.createCollider(RAPIER.ColliderDesc.cuboid(${two ? "100, 10" : "2, 0.1, 2"}).setRestitution(0.8), floor)
  const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(${two ? "150, 60" : "-3, 5, 0"}))
  world.createCollider(RAPIER.ColliderDesc.ball(${two ? "15" : "0.35"}).setRestitution(0.8), ball)
  let accumulated = 0
  return {
    step(dt: number) {
      accumulated += Math.max(0, Math.min(dt, 0.1))
      while (accumulated >= 1 / 60) {
        world.step()
        accumulated -= 1 / 60
      }
      return ball.translation()
    },
    dispose: () => world.free()
  }
}
`
  return two
    ? `import RAPIER from "@dimforge/rapier2d-compat"
import { Graphics, type Application } from "pixi.js"
import type { GameSystem } from "../spawnkit/runtime"
${demo}
export async function createPhysicsSystem({ app }: { app: Application }): Promise<GameSystem> {
  const demo = await createPhysicsDemo()
  const ball = new Graphics().circle(0, 0, 15).fill(0xa78bfa)
  const floor = new Graphics().rect(50, 490, 200, 20).fill(0x475569)
  app.stage.addChild(ball, floor)
  return {
    update({ delta }) {
      const position = demo.step(delta)
      ball.position.set(position.x, position.y)
    },
    dispose: () => demo.dispose()
  }
}
`
    : `import RAPIER from "@dimforge/rapier3d-compat"
import { Mesh, MeshStandardMaterial, SphereGeometry, type Scene } from "three"
import type { GameSystem } from "../spawnkit/runtime"
${demo}
export async function createPhysicsSystem({ scene }: { scene: Scene }): Promise<GameSystem> {
  const demo = await createPhysicsDemo()
  const ball = new Mesh(new SphereGeometry(0.35), new MeshStandardMaterial({ color: 0xa78bfa }))
  scene.add(ball)
  return {
    update({ delta }) {
      const position = demo.step(delta)
      ball.position.set(position.x, position.y, position.z)
    },
    dispose: () => demo.dispose()
  }
}
`
}

function rapierTest(dimension: "2d" | "3d") {
  const two = dimension === "2d"
  return `import { expect, it } from "vitest"
import { createPhysicsDemo } from "./physics"
it("simulates gravity and keeps the ball above its collider", async () => {
  const world = await createPhysicsDemo()
  try {
    const initial = world.step(0).y
    for (let step = 0; step < 30; step++) world.step(1 / 60)
    expect(world.step(0).y).${two ? "toBeGreaterThan" : "toBeLessThan"}(initial)
    for (let step = 0; step < 600; step++) world.step(1 / 60)
    expect(world.step(0).y).toBeCloseTo(${two ? "475" : "0.35"}, 0)
  } finally {
    world.dispose()
  }
})
`
}

function rapier(dimension: "2d" | "3d") {
  const renderer = dimension === "2d" ? "pixi" : "three"
  const pkg = `@dimforge/rapier${dimension}-compat`
  return defineAddon({
    id: `@spawnkit/rapier${dimension}`,
    version: "1.0.0",
    title: `Rapier ${dimension.toUpperCase()}`,
    description: `Rapier's ${dimension.toUpperCase()} physics engine, stepped at a fixed 60 Hz.`,
    slot: "physics",
    supports: onlyOn(renderer),
    contribute: (ctx) => [
      dependency(ctx, pkg),
      file("src/physics.ts", rapierSource(dimension)),
      system("physics", "./src/physics", "createPhysicsSystem"),
      file("docs/physics.md", physicsNotes(`Rapier ${dimension.toUpperCase()}`), "sample"),
      ...(ctx.selected(vitest) ? [file("src/physics.test.ts", rapierTest(dimension), "sample")] : [])
    ]
  })
}

function phaserPhysics(engine: "arcade" | "matter") {
  const arcade = engine === "arcade"
  return defineAddon({
    id: `@spawnkit/${engine}`,
    version: "1.0.0",
    title: arcade ? "Arcade Physics" : "Matter.js",
    description: arcade ? "Phaser's fast, box-based physics." : "Phaser's Matter.js integration for rigid bodies.",
    slot: "physics",
    supports: onlyOn("phaser"),
    contribute: () => [
      {
        kind: "entry",
        point: "game.config",
        id: "physics",
        value: { value: { default: engine, [engine]: { gravity: { x: 0, y: 500 } } } }
      },
      file(
        "src/physics.ts",
        `import type Phaser from "phaser"
import type { GameSystem } from "../spawnkit/runtime"
export function createPhysicsSystem({ scene }: { scene: Phaser.Scene }): GameSystem {
  const ball = scene.add.circle(150, 60, 15, 0xa78bfa)
  const floor = scene.add.rectangle(150, 500, 200, 20, 0x475569)
${
  arcade
    ? `  scene.physics.add.existing(ball)
  scene.physics.add.existing(floor, true)
  ;(ball.body as Phaser.Physics.Arcade.Body).setBounce(0.8)
  scene.physics.add.collider(ball, floor)
  return {
    update({ paused }) {
      scene.physics.world.isPaused = paused
    }
  }`
    : `  scene.matter.add.gameObject(ball, { shape: { type: "circle", radius: 15 }, restitution: 0.8 })
  scene.matter.add.gameObject(floor, { isStatic: true })
  return {
    update({ paused }) {
      scene.matter.world.enabled = !paused
    }
  }`
}
}
`
      ),
      system("physics", "./src/physics", "createPhysicsSystem"),
      file("docs/physics.md", physicsNotes(arcade ? "Phaser's Arcade Physics" : "Matter.js"), "sample")
    ]
  })
}

const havok = defineAddon({
  id: "@spawnkit/havok",
  version: "1.0.0",
  title: "Havok",
  description: "Babylon's Havok physics plugin.",
  slot: "physics",
  supports: onlyOn("babylon"),
  contribute: (ctx) => [
    dependency(ctx, "@babylonjs/havok"),
    file(
      "src/physics.ts",
      `import HavokPhysics from "@babylonjs/havok"
import havokUrl from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin"
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin"
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate"
import "@babylonjs/core/Physics/v2/physicsEngineComponent"
import "@babylonjs/core/Physics/physicsEngineComponent"
import type { Scene } from "@babylonjs/core/scene"
import type { GameSystem } from "../spawnkit/runtime"
export async function createPhysicsSystem({ scene, ground }: { scene: Scene; ground: Mesh }): Promise<GameSystem> {
  const havok = await HavokPhysics({ locateFile: () => havokUrl })
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok))
  scene.getPhysicsEngine()?.setTimeStep(1 / 60)
  const floorBody = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.8 }, scene)
  const ball = CreateSphere("physics-ball", { diameter: 0.7 }, scene)
  ball.position.set(-3, 5, 0)
  const ballBody = new PhysicsAggregate(ball, PhysicsShapeType.SPHERE, { mass: 1, restitution: 0.8 }, scene)
  return {
    update({ paused }) {
      scene.physicsEnabled = !paused
    },
    dispose() {
      ballBody.dispose()
      floorBody.dispose()
    }
  }
}
`
    ),
    system("physics", "./src/physics", "createPhysicsSystem"),
    file("docs/physics.md", physicsNotes("Havok"), "sample")
  ]
})

function simulation(id: string, title: string, description: string, source: string, pkg?: string) {
  return defineAddon({
    id: `@spawnkit/${id}`,
    version: "1.0.0",
    title,
    description,
    slot: "simulation",
    contribute: (ctx) => [...(pkg ? [dependency(ctx, pkg)] : []), file("src/simulation.ts", source)]
  })
}

const telemetryNotes = (body: string) => `# Telemetry

${body}

Telemetry starts in spawnkit/game.ts before the renderer, so errors during startup are captured too. Neither option adds
billing or provisions resources.
`

const platformTelemetry = defineAddon({
  id: "@spawnkit/platform-telemetry",
  version: "1.0.0",
  title: "SpawnKit telemetry",
  description: "Events, errors and logs in your project dashboard. Requires setup and consent.",
  slot: "telemetry",
  contribute: (ctx) => [
    { kind: "dependency", name: "@spawn/telemetry", version: "file:vendor/spawn-telemetry" },
    ...Object.entries(telemetryFiles).map(([path, content]) => file(path, content, "owned")),
    file(
      "src/telemetry.ts",
      `import { createTelemetry, type Telemetry } from "@spawn/telemetry"
let telemetry: Telemetry | undefined
export function initializeTelemetry() {
  if (telemetry || import.meta.env.VITE_SPAWN_TELEMETRY_ENABLED !== "true") return
  const endpoint = import.meta.env.VITE_SPAWN_TELEMETRY_ENDPOINT
  const key = import.meta.env.VITE_SPAWN_TELEMETRY_KEY
  if (!endpoint || !key) return
  try {
    telemetry = createTelemetry({ endpoint, key, serviceName: "game", release: import.meta.env.VITE_SPAWN_RELEASE || "development", environment: import.meta.env.VITE_SPAWN_ENVIRONMENT || "production", consent: "denied" })
    telemetry.installBrowserHandlers()
  } catch { /* Invalid telemetry configuration must never prevent game startup. */ }
}
// Call from your consent/policy flow. Enabling the package does not grant player consent.
export function setTelemetryConsent(granted: boolean) { telemetry?.setConsent(granted ? "granted" : "denied") }
export function track(event: string, properties: Record<string, string | number | boolean> = {}) { telemetry?.track(event, properties) }
export function captureError(error: unknown) { telemetry?.captureException(error) }
export async function flushTelemetry() { return telemetry?.flush() }
export async function shutdownTelemetry() { await telemetry?.shutdown(); telemetry = undefined }
export function startTelemetry({ kind }: { kind: string }) { initializeTelemetry(); track("game.started", { renderer: kind }) }
if (import.meta.hot) import.meta.hot.dispose(() => { void shutdownTelemetry() })
`
    ),
    {
      kind: "entry",
      point: "game.setup",
      id: "telemetry",
      value: { ref: { module: "./src/telemetry", export: "startTelemetry" } }
    },
    ...[
      ["VITE_SPAWN_TELEMETRY_ENABLED", "Set to true once the dashboard is configured.", "false"],
      ["VITE_SPAWN_TELEMETRY_ENDPOINT", "From the project dashboard: Logs > Game telemetry.", ""],
      ["VITE_SPAWN_TELEMETRY_KEY", "The public write key from the dashboard. Never a secret.", ""],
      ["VITE_SPAWN_ENVIRONMENT", "The environment events are reported under.", "production"],
      ["VITE_SPAWN_RELEASE", "The release events are reported under.", "development"]
    ].map(([name, description, example]): Contribution => ({
      kind: "env",
      name: name!,
      scope: "client",
      secret: false,
      required: false,
      description: description!,
      example: example!
    })),
    file(
      "docs/telemetry.md",
      telemetryNotes(
        "Platform telemetry includes the standalone @spawn/telemetry package. Open project Logs > Game telemetry in the dashboard, configure allowed game origins, and copy the public configuration into .env. Set VITE_SPAWN_TELEMETRY_ENABLED=true, then call setTelemetryConsent(true) from your collection-policy flow; capture is denied until that call. Use flushTelemetry/shutdownTelemetry for lifecycle control. Events and errors are retained for seven days with per-environment limits."
      ),
      "sample"
    ),
    ...(ctx.selected(vitest) ? [file("src/telemetry.test.ts", platformTelemetryTest, "sample")] : [])
  ]
})

const sentry = defineAddon({
  id: "@spawnkit/sentry",
  version: "1.0.0",
  title: "Sentry",
  description: "Error reporting with your own DSN.",
  slot: "telemetry",
  contribute: (ctx) => [
    dependency(ctx, "@sentry/browser"),
    file(
      "src/telemetry.ts",
      `import * as Sentry from "@sentry/browser"
export function initializeTelemetry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (dsn) Sentry.init({ dsn, environment: import.meta.env.MODE, dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false, frameContextLines: 0 } })
}
export function track(event: string, properties: Record<string, string | number | boolean> = {}) { if (import.meta.env.VITE_SENTRY_DSN) Sentry.addBreadcrumb({ category: "game", message: event, data: properties }) }
export function captureError(error: unknown) { if (import.meta.env.VITE_SENTRY_DSN) Sentry.captureException(error) }
export function startTelemetry({ kind }: { kind: string }) { initializeTelemetry(); track("game.started", { renderer: kind }) }
`
    ),
    {
      kind: "entry",
      point: "game.setup",
      id: "telemetry",
      value: { ref: { module: "./src/telemetry", export: "startTelemetry" } }
    },
    {
      kind: "env",
      name: "VITE_SENTRY_DSN",
      scope: "client",
      secret: false,
      required: false,
      description: "Your public Sentry DSN. No server secret belongs in a VITE_ variable.",
      example: ""
    },
    file(
      "docs/telemetry.md",
      telemetryNotes(
        "Sentry initializes only when VITE_SENTRY_DSN is supplied; it uses breadcrumbs and error capture, with default PII collection disabled."
      ),
      "sample"
    ),
    ...(ctx.selected(vitest) ? [file("src/telemetry.test.ts", sentryTest, "sample")] : [])
  ]
})

const setupNotes = `# Test environment setup

Run pnpm run setup to prepare local HTTPS and Chromium together. Trusting the local certificate may require a one-time
OS prompt; this does not register a public domain or create a cloud project. Run pnpm test:setup to prepare only
Chromium. No browser download or certificate changes run during pnpm install.

On a supported Linux CI runner, run pnpm install --frozen-lockfile, then pnpm test:setup --with-deps, then the test
scripts selected for this project. System-library installation may require elevated permissions. CI skips automatic
browser installation and uses a loopback server for E2E. For an already provisioned offline environment, set
SPAWN_SKIP_BROWSER_INSTALL=1. A failed browser download stops before tests run; check network/proxy access and retry
pnpm test:setup.
`

/** Chromium for both test runners. Vitest and Playwright pull it in; it isn't offered on its own. */
const browserTools = defineAddon({
  id: "@spawnkit/browser-tools",
  version: "1.0.0",
  title: "Browser test tools",
  description: "Installs and runs Chromium for the test runners.",
  contribute: (ctx) => [
    dependency(ctx, "playwright", true),
    { kind: "script", name: "test:setup", command: "node scripts/browser-tools.mjs install" },
    { kind: "script", name: "setup", command: "dev-domains setup && node scripts/browser-tools.mjs install" },
    file("scripts/browser-tools.mjs", browserToolsSource, "owned"),
    file("docs/test-setup.md", setupNotes, "sample")
  ]
})

const vitestAddon = defineAddon({
  id: vitest,
  version: "1.0.0",
  title: "Vitest",
  description: "Unit tests for your game logic.",
  requires: ["@spawnkit/browser-tools"],
  contribute: (ctx) => [
    dependency(ctx, "vitest", true),
    dependency(ctx, "@vitest/coverage-v8", true),
    dependency(ctx, "@vitest/browser-playwright", true),
    { kind: "script", name: "test", command: "node scripts/browser-tools.mjs test" },
    file(
      "vitest.config.ts",
      'import { defineConfig } from "vitest/config"\nimport { playwright } from "@vitest/browser-playwright"\nexport default defineConfig({test:{fileParallelism:false,browser:{enabled:true,headless:true,provider:playwright({launchOptions:{args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]}}),instances:[{browser:"chromium"}]},include:["src/**/*.test.ts"],coverage:{provider:"v8",include:["src/**/*.ts"],exclude:["src/**/*.test.ts","src/**/*.stories.ts","src/**/*.d.ts"],reporter:["text","html","lcov","json-summary"],thresholds:{statements:90,branches:90,functions:90,lines:90}}}})\n'
    ),
    file(
      "src/score.test.ts",
      'import { expect, it } from "vitest"\nimport { advanceScore } from "./score"\n\nit("adds one point for a collectible", () => {\n  expect(advanceScore(4)).toBe(5)\n})\n',
      "sample"
    ),
    file("src/simulation.test.ts", simulationTest, "sample"),
    ...Object.entries(browserTests(ctx.target.mode, ctx.provided("pause") !== undefined)).map(([path, content]) =>
      file(path, content, "sample")
    ),
    file(
      "docs/testing.md",
      "# Unit tests\n\npnpm test prepares the matching Chromium browser automatically, reusing cached downloads. It enforces 90% statements, branches, functions, and lines across all src TypeScript, including renderer startup and optional modules. Tests, stories, and type declarations are excluded. Thresholds apply across the source set, not per file. Unit and renderer integration tests run in headless Chromium with software WebGL; Sentry is mocked. Reports are written to coverage/.\n",
      "sample"
    )
  ]
})

const playwrightAddon = defineAddon({
  id: "@spawnkit/playwright",
  version: "1.0.0",
  title: "Playwright",
  description: "Test your game in a real browser.",
  requires: ["@spawnkit/browser-tools"],
  contribute: (ctx) => [
    dependency(ctx, "@playwright/test", true),
    { kind: "script", name: "e2e", command: "node scripts/browser-tools.mjs e2e" },
    { kind: "script", name: "e2e:ui", command: "node scripts/browser-tools.mjs e2e --ui" },
    file("playwright.config.ts", playwrightConfiguration),
    { kind: "json", path: "tsconfig.json", pointer: "/include", op: "append", value: "e2e" },
    { kind: "json", path: "tsconfig.json", pointer: "/include", op: "append", value: "playwright.config.ts" },
    { kind: "json", path: "tsconfig.json", pointer: "/compilerOptions/types", op: "append", value: "node" },
    { kind: "lines", path: ".gitignore", lines: ["playwright-report/", "test-results/"] },
    file(
      "e2e/game.spec.ts",
      `import { expect, test } from "@playwright/test"
test("loads the game and accepts keyboard input", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  const canvas = page.locator("canvas").first()
  await expect(canvas).toBeVisible()
  await canvas.focus()
  await page.keyboard.down("ArrowRight")
  try {
    await expect(page.locator("#score")).toHaveText(/^Collected: [1-9][0-9]*$/, { timeout: 15000 })
  } finally {
    await page.keyboard.up("ArrowRight")
  }
  expect(errors).toEqual([])
})
`,
      "sample"
    ),
    file(
      "docs/browser-tests.md",
      `# Browser tests

After pnpm install, run pnpm e2e. It prepares the matching Chromium browser automatically before running tests. Use pnpm
e2e:ui for interactive debugging, or pnpm e2e --grep keyboard to filter tests. Edit e2e/game.spec.ts to cover your game.
The test starts its own loopback server on port 4173, checks browser errors, and exercises keyboard collection.
Chromium uses software rendering for portable headless checks. Set SPAWN_E2E_HTTPS=1 for named HTTPS testing after
local domain setup; CI always uses loopback. Vitest and Playwright can be selected independently or together.
`,
      "sample"
    )
  ]
})

const storybookAddon = defineAddon({
  id: "@spawnkit/storybook",
  version: "1.0.0",
  title: "Storybook",
  description: "Develop game interface components in isolation.",
  contribute: (ctx) => [
    dependency(ctx, "storybook", true),
    dependency(ctx, "@storybook/html-vite", true),
    { kind: "script", name: "storybook", command: "dev-domains run stories" },
    { kind: "yaml", path: "pnpm-workspace.yaml", pointer: "/allowBuilds/esbuild", op: "set", value: true },
    { kind: "lines", path: ".gitignore", lines: ["storybook-static/"] },
    file(
      ".storybook/main.ts",
      'import type { StorybookConfig } from "@storybook/html-vite"\nconst origin = process.env.PORTLESS_URL ? new URL(process.env.PORTLESS_URL) : undefined\nconst config: StorybookConfig = {\n framework: { name: "@storybook/html-vite", options: {} },\n stories: ["../src/**/*.stories.ts"], core: { disableTelemetry: true, allowedHosts: origin ? [origin.hostname] : [] },\n async viteFinal(config) {\n  const { mergeConfig } = await import("vite")\n  return mergeConfig(config, {server:{allowedHosts:origin ? [origin.hostname] : [], hmr: origin ? {host:origin.hostname,protocol:origin.protocol === "https:" ? "wss" : "ws",clientPort:Number(origin.port || (origin.protocol === "https:" ? 443 : 80))} : undefined}})\n }\n}\nexport default config\n'
    ),
    file(
      ".storybook/preview.ts",
      'import type { Preview } from "@storybook/html-vite"\nimport "../src/style.css"\nconst preview: Preview = { parameters: { layout: "centered" } }\nexport default preview\n'
    ),
    file(
      "src/hud.ts",
      'export function createScoreDisplay(score: number) {\n const element = document.createElement("output")\n element.setAttribute("aria-label", "Score")\n element.style.cssText = "padding: 12px 20px; border: 1px solid #657987; border-radius: 8px; font: 600 18px system-ui"\n element.textContent = "Score: " + score\n return element\n}\n'
    ),
    file(
      "src/hud.stories.ts",
      'import type { Meta, StoryObj } from "@storybook/html-vite"\nimport { createScoreDisplay } from "./hud"\nconst meta = {title:"Game/Score",args:{score:0},render:({score})=>createScoreDisplay(score)} satisfies Meta<{score:number}>\nexport default meta\ntype Story = StoryObj<{score:number}>\nexport const Empty: Story = {}\nexport const Playing: Story = {args:{score:120}}\n',
      "sample"
    ),
    file(
      "docs/storybook.md",
      "# Storybook\n\nRun pnpm storybook to develop HTML game interface components. Run pnpm exec storybook build to export storybook-static/. This is a separate development tool; it does not add React to the game or automatically render canvas UI modules.\n",
      "sample"
    ),
    ...(ctx.selected(vitest)
      ? [
          file(
            "src/hud.test.ts",
            `import { expect, it } from "vitest"
import { createScoreDisplay } from "./hud"
it("renders an accessible score for the Storybook preview", () => {
  const score = createScoreDisplay(120)
  document.body.append(score)
  try {
    expect(score.tagName).toBe("OUTPUT")
    expect(score.getAttribute("aria-label")).toBe("Score")
    expect(score.textContent).toBe("Score: 120")
  } finally {
    score.remove()
  }
})
`,
            "sample"
          )
        ]
      : [])
  ]
})

const platformTelemetryTest = `import { it, expect, vi } from "vitest"
import { createTelemetry } from "@spawn/telemetry"
import { initializeTelemetry, track, captureError, setTelemetryConsent, flushTelemetry, shutdownTelemetry } from "./telemetry"
vi.mock("@spawn/telemetry", () => ({ createTelemetry: vi.fn(() => ({ track: vi.fn(), captureException: vi.fn(), setConsent: vi.fn(), installBrowserHandlers: vi.fn(), flush: vi.fn(), shutdown: vi.fn() })) }))
it("requires configuration and delegates consent and lifecycle without sending data", async () => {
  vi.stubEnv("VITE_SPAWN_TELEMETRY_ENABLED", "false")
  initializeTelemetry(); track("disabled"); captureError("disabled"); setTelemetryConsent(false)
  await flushTelemetry(); await shutdownTelemetry()
  expect(createTelemetry).not.toHaveBeenCalled()
  vi.stubEnv("VITE_SPAWN_TELEMETRY_ENABLED", "true")
  vi.stubEnv("VITE_SPAWN_TELEMETRY_ENDPOINT", "")
  initializeTelemetry()
  vi.stubEnv("VITE_SPAWN_TELEMETRY_ENDPOINT", "http://localhost:8790/v1/logs")
  vi.stubEnv("VITE_SPAWN_TELEMETRY_KEY", "test-public-key")
  initializeTelemetry(); initializeTelemetry()
  const client = vi.mocked(createTelemetry).mock.results[0]!.value!
  expect(createTelemetry).toHaveBeenCalledWith(expect.objectContaining({ consent: "denied" }))
  setTelemetryConsent(true); setTelemetryConsent(false); track("test"); track("score", { score: 1 }); captureError("test")
  await flushTelemetry(); await shutdownTelemetry()
  expect(client.track).toHaveBeenCalledWith("score", { score: 1 })
  expect(client.shutdown).toHaveBeenCalled()
  vi.stubEnv("VITE_SPAWN_RELEASE", "v1"); vi.stubEnv("VITE_SPAWN_ENVIRONMENT", "sandbox")
  initializeTelemetry(); await shutdownTelemetry()
  vi.mocked(createTelemetry).mockImplementationOnce(() => { throw new Error("Invalid config") })
  expect(initializeTelemetry()).toBeUndefined()
  vi.unstubAllEnvs()
})
`

const sentryTest = `import { it, expect, vi } from "vitest"
import * as Sentry from "@sentry/browser"
import { initializeTelemetry, track, captureError } from "./telemetry"
vi.mock("@sentry/browser", () => ({ init: vi.fn(), addBreadcrumb: vi.fn(), captureException: vi.fn() }))
it("requires a DSN and forwards events without collecting personal data", () => {
  vi.stubEnv("VITE_SENTRY_DSN", "")
  initializeTelemetry(); track("disabled"); captureError("disabled")
  expect(Sentry.init).not.toHaveBeenCalled()
  expect(Sentry.addBreadcrumb).not.toHaveBeenCalled()
  expect(Sentry.captureException).not.toHaveBeenCalled()
  vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.com/1")
  initializeTelemetry(); track("collected", { score: 1 }); track("started")
  const error = new Error("test"); captureError(error)
  expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dataCollection: expect.objectContaining({ userInfo: false, cookies: false }) }))
  expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({ category: "game", message: "collected", data: { score: 1 } })
  expect(Sentry.captureException).toHaveBeenCalledWith(error)
  vi.unstubAllEnvs()
})
`

export const addons = [
  htmlUi,
  pixiUi,
  babylonGui,
  rapier("2d"),
  phaserPhysics("arcade"),
  phaserPhysics("matter"),
  havok,
  rapier("3d"),
  simulation("plain", "Plain TypeScript", "Movement in plain TypeScript, with no entity system.", plainSimulation),
  simulation("bitecs", "bitECS", "Run movement through an entity/component simulation.", ecsSimulation, "bitecs"),
  simulation("koota", "Koota", "Run movement through a trait-based entity simulation.", kootaSimulation, "koota"),
  platformTelemetry,
  sentry,
  browserTools,
  vitestAddon,
  playwrightAddon,
  storybookAddon
]
