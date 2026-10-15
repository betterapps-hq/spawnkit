import type { TemplateId, UiId, TelemetryId } from "./catalog"

export function browserTests(renderer: TemplateId, ui: UiId, telemetry: TelemetryId) {
  const files: Record<string, string> = {
    "src/input.test.ts": `import { expect, it } from "vitest"
import { createInput } from "./input"
it("tracks arrows, opposing directions, release, focus and blur", () => {
  const target = document.createElement("canvas")
  target.tabIndex = 0
  document.body.append(target)
  const input = createInput(target)
  const key = (type: string, key: string) => { const event = new KeyboardEvent(type, { key, cancelable: true }); target.dispatchEvent(event); return event }
  expect(key("keydown", "a").defaultPrevented).toBe(false)
  expect(key("keydown", "ArrowRight").defaultPrevented).toBe(true)
  key("keydown", "ArrowDown")
  expect(input.read()).toEqual({ x: 1, y: 1 })
  key("keydown", "ArrowLeft"); key("keydown", "ArrowUp")
  expect(input.read()).toEqual({ x: 0, y: 0 })
  key("keyup", "ArrowRight"); key("keyup", "ArrowDown")
  expect(input.read()).toEqual({ x: -1, y: -1 })
  target.dispatchEvent(new Event("blur"))
  expect(input.read()).toEqual({ x: 0, y: 0 })
  key("keydown", "ArrowRight"); window.dispatchEvent(new Event("blur"))
  expect(input.read()).toEqual({ x: 0, y: 0 })
  target.dispatchEvent(new Event("pointerdown"))
  expect(document.activeElement).toBe(target)
  target.remove()
})
`,
    "src/main.test.ts": `import { expect, it, vi } from "vitest"
const movement = vi.hoisted(() => ({ x: ${renderer === "pixi" || renderer === "phaser" ? 400 : 0}, y: ${renderer === "pixi" || renderer === "phaser" ? 280 : 0}, steps: 0 }))
vi.mock("./simulation", () => ({ createSimulation: () => ({ step: () => { movement.steps++; return { x: movement.x, y: movement.y } } }) }))
it("starts the renderer, collects gold, pauses and handles resize and shutdown", async () => {
  document.body.innerHTML = '<header><span id="score">Collected: 0</span></header><div id="game" style="width:800px;height:560px"></div>'
  await import("./main")
  await expect.poll(() => document.querySelector("canvas[aria-label]"), { timeout: 20000 }).not.toBeNull()
  const canvas = document.querySelector<HTMLCanvasElement>("canvas[aria-label]")!
  canvas.focus()
  await expect.poll(() => movement.steps).toBeGreaterThan(0)
  vi.spyOn(Math, "random").mockReturnValue(0.5)
  movement.x = ${renderer === "pixi" || renderer === "phaser" ? 580 : 3}
  canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
  await expect.poll(() => document.querySelector("#score")?.textContent, { timeout: 20000 }).toMatch(/^Collected: [1-9]/)
  canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }))
  ${
    ui !== "none"
      ? `window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
  const score = document.querySelector("#score")!.textContent
  const pausedSteps = movement.steps
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(document.querySelector("#score")!.textContent).toBe(score)
  expect(movement.steps).toBe(pausedSteps)
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))`
      : ""
  }
  // Collect with the optional HUD absent; renderer behavior must remain valid.
  document.querySelector("#score")!.remove()
  movement.x = ${renderer === "pixi" || renderer === "phaser" ? 400 : 0}
  movement.y = ${renderer === "pixi" || renderer === "phaser" ? 297.5 : 0}
  const before = movement.steps
  await expect.poll(() => movement.steps).toBeGreaterThan(before + 2)
  expect(canvas.isConnected).toBe(true)
  vi.restoreAllMocks()
  window.dispatchEvent(new Event("resize"))
  window.dispatchEvent(new Event("pagehide"))
}, 30000)
`
  }
  if (renderer === "three")
    files["src/main-error.test.ts"] = `import { expect, it } from "vitest"
it("reports a missing game container", async () => {
  document.body.innerHTML = ""
  await expect(import("./main")).rejects.toThrow("Game container is missing")
})
`
  const setup =
    ui === "pixi"
      ? "const app = new Application(); await app.init({ width: 300, height: 100 }); const ui = createUI(app)"
      : ui === "babylon"
        ? "const engine = new NullEngine(); const scene = new Scene(engine); const ui = createUI(scene)"
        : "const ui = createUI()"
  files["src/ui.test.ts"] = `import { expect, it } from "vitest"
import { createUI } from "./ui"
${ui === "pixi" ? 'import { Application } from "pixi.js"' : ui === "babylon" ? 'import { NullEngine } from "@babylonjs/core/Engines/nullEngine"\nimport { Scene } from "@babylonjs/core/scene"' : ""}
it("controls pause state and removes its interface on disposal", async () => {
  document.body.innerHTML = "<header></header>"
  ${setup}
  expect(ui.isPaused()).toBe(false)
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }))
  expect(ui.isPaused()).toBe(false)
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
  expect(ui.isPaused()).toBe(${ui !== "none"})
  ${ui === "html" ? 'document.querySelector("button")!.click()\n  expect(ui.isPaused()).toBe(false)\n  expect(document.querySelector("button")!.getAttribute("aria-pressed")).toBe("false")' : ""}
  ui.dispose()
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
  expect(ui.isPaused()).toBe(${ui !== "none" && ui !== "html"})
  ${ui === "pixi" ? "app.destroy(true, { children: true })" : ui === "babylon" ? "scene.dispose(); engine.dispose()" : 'expect(document.querySelector("button")).toBeNull()'}
})
`
  if (telemetry !== "none")
    files["src/telemetry.test.ts"] =
      telemetry === "platform"
        ? `import { it, expect, vi } from "vitest"
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
        : `import { it, expect, vi } from "vitest"
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
  return files
}
