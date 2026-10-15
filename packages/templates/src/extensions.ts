import { telemetryFiles } from "@spawn/telemetry/scaffold"
import {
  physicsOptions,
  uiOptions,
  telemetryOptions,
  type TemplateId,
  type PhysicsId,
  type UiId,
  type TelemetryId
} from "./catalog"

export interface ExtensionOptions {
  physics?: PhysicsId
  ui?: UiId
  telemetry?: TelemetryId
}
function resolveExtensions(renderer: TemplateId, options: ExtensionOptions) {
  const physics = options.physics ?? "none"
  const ui = options.ui ?? "html"
  const telemetry = options.telemetry ?? "none"
  const physicsEntry = physicsOptions.find((entry) => entry.id === physics)
  const uiEntry = uiOptions.find((entry) => entry.id === ui)
  if (!physicsEntry || !(physicsEntry.renderers as readonly string[]).includes(renderer))
    throw new Error(`Physics ${physics} is not compatible with ${renderer}`)
  if (!uiEntry || !(uiEntry.renderers as readonly string[]).includes(renderer))
    throw new Error(`UI ${ui} is not compatible with ${renderer}`)
  if (!telemetryOptions.some((entry) => entry.id === telemetry)) throw new Error(`Unknown telemetry: ${telemetry}`)
  return { physics, ui, telemetry }
}

const state = `let paused = false\nconst toggle = () => { paused = !paused; return paused }\n`
const lifecycle = `return { isPaused: () => paused, dispose: () => { cleanup(); window.removeEventListener("keydown", onKey) } }`
const keyboard = `const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") toggle() }\nwindow.addEventListener("keydown", onKey)\n`
function uiSource(ui: UiId) {
  if (ui === "none") return `export function createUI() { return { isPaused: () => false, dispose: () => {} } }\n`
  if (ui === "html")
    return `export function createUI() {
  ${state}
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = "Pause"
  button.setAttribute("aria-label", "Pause game")
  const update = () => { button.textContent = paused ? "Resume" : "Pause"; button.setAttribute("aria-pressed", String(paused)) }
  button.onclick = () => { toggle(); update() }
  const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { toggle(); update() } }
  window.addEventListener("keydown", onKey)
  document.querySelector("header")?.append(button)
  const cleanup = () => button.remove()
  ${lifecycle}
}\n`
  if (ui === "pixi")
    return `import { FancyButton } from "@pixi/ui"
import { Application, Graphics, Text } from "pixi.js"
export function createUI(app: Application) {
  ${state}
  const text = new Text({ text: "Pause / Resume", style: { fontSize: 15, fill: 0xffffff } })
  const button = new FancyButton({ defaultView: new Graphics().roundRect(0, 0, 150, 38, 8).fill(0x7351c6), text })
  button.position.set(16, 16)
  button.onPress.connect(toggle)
  app.stage.addChild(button)
  ${keyboard}
  const cleanup = () => { button.onPress.disconnectAll(); button.destroy({ children: true }) }
  ${lifecycle}
}\n`
  return `import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui"
import type { Scene } from "@babylonjs/core/scene"
export function createUI(scene: Scene) {
  ${state}
  const texture = AdvancedDynamicTexture.CreateFullscreenUI("hud", true, scene)
  const button = Button.CreateSimpleButton("pause", "Pause / Resume")
  button.width = "160px"; button.height = "40px"; button.color = "white"; button.background = "#7351c6"
  button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; button.top = "16px"
  button.onPointerClickObservable.add(toggle)
  texture.addControl(button)
  ${keyboard}
  const cleanup = () => texture.dispose()
  ${lifecycle}
}\n`
}

function rapierSource(dimension: "2d" | "3d") {
  const two = dimension === "2d"
  return `import RAPIER from "@dimforge/rapier${dimension}-compat"
export async function createPhysicsDemo() {
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
      while (accumulated >= 1 / 60) { world.step(); accumulated -= 1 / 60 }
      return ball.translation()
    },
    dispose: () => world.free()
  }
}\n`
}

export function applyExtensions(
  renderer: TemplateId,
  options: ExtensionOptions,
  files: Record<string, string>,
  dependencies: Record<string, string>
) {
  const selected = resolveExtensions(renderer, options)
  let source = files["src/main.ts"]!
  files["src/ui.ts"] = uiSource(selected.ui)
  source = `import { createUI } from "./ui"\n` + source
  if (selected.ui === "pixi") dependencies["@pixi/ui"] = "2.4.1"
  if (selected.ui === "babylon") dependencies["@babylonjs/gui"] = "9.30.0"
  const uiArgument = selected.ui === "pixi" ? "app" : selected.ui === "babylon" ? "scene" : ""
  const uiSetup = `const ui = createUI(${uiArgument})\nwindow.addEventListener("pagehide", () => ui.dispose(), { once: true })\n`
  if (renderer === "phaser") {
    source = source.replace("private score = 0", "private score = 0\n  private ui = createUI()")
    source = source.replace("if (!this.controls) return", "if (!this.controls || this.ui.isPaused()) return")
    source = source.replace(
      "this.controls = createInput(this.game.canvas)",
      'this.controls = createInput(this.game.canvas)\n    this.events.once("shutdown", () => this.ui.dispose())'
    )
  } else if (renderer === "pixi") {
    source = source.replace("let score = 0", uiSetup + "let score = 0")
    source = source.replace("app.ticker.add((ticker) => {", "app.ticker.add((ticker) => {\n  if (ui.isPaused()) return")
  } else if (renderer === "babylon") {
    source = source.replace("let score = 0", uiSetup + "let score = 0")
    source = source.replace(
      "scene.onBeforeRenderObservable.add(() => {",
      "scene.onBeforeRenderObservable.add(() => {\n  scene.physicsEnabled = !ui.isPaused()\n  if (ui.isPaused()) return"
    )
  } else {
    source = source.replace("let score = 0", uiSetup + "let score = 0")
    source = source.replace(
      "const position = simulation.step(controls.read(), (now - previous) / 1000)",
      "const delta = (now - previous) / 1000\n  if (ui.isPaused()) { previous = now; return }\n  const position = simulation.step(controls.read(), delta)"
    )
  }
  if (selected.physics === "rapier2d" || selected.physics === "rapier3d") {
    const two = selected.physics === "rapier2d"
    dependencies[`@dimforge/${selected.physics}-compat`] = "0.21.0"
    files["src/physics.ts"] = rapierSource(two ? "2d" : "3d")
    source = `import { createPhysicsDemo } from "./physics"\n` + source
    const setup = `const physicsDemo = await createPhysicsDemo()\nwindow.addEventListener("pagehide", () => physicsDemo.dispose(), { once: true })\n`
    if (two) {
      source = source.replace(
        "let score = 0",
        setup +
          `const physicsBall = new Graphics().circle(0, 0, 15).fill(0xa78bfa)\nconst physicsFloor = new Graphics().rect(50, 490, 200, 20).fill(0x475569)\napp.stage.addChild(physicsBall, physicsFloor)\nlet score = 0`
      )
      source = source.replace(
        "if (ui.isPaused()) return",
        "if (ui.isPaused()) return\n  const bodyPosition = physicsDemo.step(ticker.deltaMS / 1000)\n  physicsBall.position.set(bodyPosition.x, bodyPosition.y)"
      )
    } else {
      source = source.replace(
        "let score = 0",
        setup +
          `const physicsBall = new Mesh(new SphereGeometry(0.35), new MeshStandardMaterial({ color: 0xa78bfa }))\nscene.add(physicsBall)\nlet score = 0`
      )
      source = source.replace(
        "previous = now\n  player",
        "previous = now\n  const bodyPosition = physicsDemo.step(delta)\n  physicsBall.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z)\n  player"
      )
    }
  }
  if (selected.physics === "arcade" || selected.physics === "matter") {
    const arcade = selected.physics === "arcade"
    source = source.replace(
      "input: { keyboard: false },",
      `input: { keyboard: false }, physics: { default: "${selected.physics}", ${selected.physics}: { gravity: { x: 0, y: 500 } } },`
    )
    const demo = arcade
      ? `const ball = this.add.circle(150, 60, 15, 0xa78bfa)\n    const floor = this.add.rectangle(150, 500, 200, 20, 0x475569)\n    this.physics.add.existing(ball)\n    this.physics.add.existing(floor, true)\n    ;(ball.body as Phaser.Physics.Arcade.Body).setBounce(0.8)\n    this.physics.add.collider(ball, floor)`
      : `const ball = this.add.circle(150, 60, 15, 0xa78bfa)\n    const floor = this.add.rectangle(150, 500, 200, 20, 0x475569)\n    this.matter.add.gameObject(ball, { shape: { type: "circle", radius: 15 }, restitution: 0.8 })\n    this.matter.add.gameObject(floor, { isStatic: true })`
    source = source.replace(
      "this.controls = createInput(this.game.canvas)",
      demo + "\n    this.controls = createInput(this.game.canvas)"
    )
    source = source.replace(
      "if (!this.controls || this.ui.isPaused()) return",
      `${arcade ? "this.physics.world.isPaused = this.ui.isPaused()" : "this.matter.world.enabled = !this.ui.isPaused()"}\n    if (!this.controls || this.ui.isPaused()) return`
    )
  }
  if (selected.physics === "havok") {
    dependencies["@babylonjs/havok"] = "1.3.14"
    source =
      `import HavokPhysics from "@babylonjs/havok"\nimport havokUrl from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url"\nimport { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin"\nimport { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate"\nimport { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin"\nimport "@babylonjs/core/Physics/v2/physicsEngineComponent"\nimport "@babylonjs/core/Physics/physicsEngineComponent"\n` +
      source
    source = source.replace(
      "let score = 0",
      `const havok = await HavokPhysics({ locateFile: () => havokUrl })\nscene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok))\nscene.getPhysicsEngine()?.setTimeStep(1 / 60)\nconst floorBody = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.8 }, scene)\nconst physicsBall = CreateSphere("physics-ball", { diameter: 0.7 }, scene)\nphysicsBall.position.set(-3, 5, 0)\nconst ballBody = new PhysicsAggregate(physicsBall, PhysicsShapeType.SPHERE, { mass: 1, restitution: 0.8 }, scene)\nwindow.addEventListener("pagehide", () => { ballBody.dispose(); floorBody.dispose(); scene.dispose(); engine.dispose() }, { once: true })\nlet score = 0`
    )
  }
  if (selected.telemetry !== "none") {
    files["src/telemetry.ts"] =
      selected.telemetry === "platform"
        ? `import { createTelemetry, type Telemetry } from "@spawn/telemetry"
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
if (import.meta.hot) import.meta.hot.dispose(() => { void shutdownTelemetry() })
`
        : `import * as Sentry from "@sentry/browser"\nexport function initializeTelemetry() {\n  const dsn = import.meta.env.VITE_SENTRY_DSN\n  if (dsn) Sentry.init({ dsn, environment: import.meta.env.MODE, dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false, frameContextLines: 0 } })\n}\nexport function track(event: string, properties: Record<string, string | number | boolean> = {}) { if (import.meta.env.VITE_SENTRY_DSN) Sentry.addBreadcrumb({ category: "game", message: event, data: properties }) }\nexport function captureError(error: unknown) { if (import.meta.env.VITE_SENTRY_DSN) Sentry.captureException(error) }\n`
    if (selected.telemetry === "sentry") {
      dependencies["@sentry/browser"] = "11.7.0"
      files[".env.example"] = "# Public Sentry DSN. No server secret belongs in a VITE_ variable.\nVITE_SENTRY_DSN=\n"
    }
    if (selected.telemetry === "platform") {
      Object.assign(files, telemetryFiles)
      dependencies["@spawn/telemetry"] = "file:vendor/spawn-telemetry"
      files[".env.example"] =
        "# Configure in the project dashboard Logs > Game telemetry. Public write key only.\nVITE_SPAWN_TELEMETRY_ENABLED=false\nVITE_SPAWN_TELEMETRY_ENDPOINT=\nVITE_SPAWN_TELEMETRY_KEY=\nVITE_SPAWN_ENVIRONMENT=production\nVITE_SPAWN_RELEASE=development\n"
    }
    source =
      `import { initializeTelemetry, track } from "./telemetry"\ninitializeTelemetry()\ntrack("game.started", { renderer: "${renderer}" })\n` +
      source
  }
  if (selected.ui === "none") {
    source = source
      .replace(" || this.ui.isPaused()", "")
      .replace("  if (ui.isPaused()) return\n", "")
      .replace("  scene.physicsEnabled = !ui.isPaused()\n", "")
      .replace("  if (ui.isPaused()) { previous = now; return }\n", "")
  }
  // Stop rendering before a disposed physics world can be stepped again.
  if (renderer === "pixi")
    source += '\nwindow.addEventListener("pagehide", () => app.destroy(true, { children: true }), { once: true })\n'
  if (renderer === "three")
    source +=
      '\nwindow.addEventListener("pagehide", () => { renderer.setAnimationLoop(null); renderer.dispose() }, { once: true })\n'
  if (renderer === "babylon" && selected.physics !== "havok")
    source += '\nwindow.addEventListener("pagehide", () => { scene.dispose(); engine.dispose() }, { once: true })\n'
  if (renderer === "phaser") {
    source = source.replace("new Phaser.Game(", "const game = new Phaser.Game(")
    source += '\nwindow.addEventListener("pagehide", () => game.destroy(true), { once: true })\n'
  }
  files["src/main.ts"] = source
  return selected
}
