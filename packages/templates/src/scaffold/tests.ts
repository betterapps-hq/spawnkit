/** Vitest's renderer tests. Each UI, physics and telemetry add-on writes its own tests when Vitest is selected. */
export function browserTests(renderer: string, pausable: boolean): Record<string, string> {
  const flat = renderer === "pixi" || renderer === "phaser"
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
const movement = vi.hoisted(() => ({ x: ${flat ? 400 : 0}, y: ${flat ? 280 : 0}, steps: 0 }))
vi.mock("./simulation", () => ({ createSimulation: () => ({ step: () => { movement.steps++; return { x: movement.x, y: movement.y } } }) }))
it("starts the renderer, collects gold, ${pausable ? "pauses " : ""}and handles resize and shutdown", async () => {
  document.body.innerHTML = '<header><span id="score">Collected: 0</span></header><div id="game" style="width:800px;height:560px"></div>'
  await import("./main")
  await expect.poll(() => document.querySelector("canvas[aria-label]"), { timeout: 20000 }).not.toBeNull()
  const canvas = document.querySelector<HTMLCanvasElement>("canvas[aria-label]")!
  canvas.focus()
  await expect.poll(() => movement.steps).toBeGreaterThan(0)
  vi.spyOn(Math, "random").mockReturnValue(0.5)
  movement.x = ${flat ? 580 : 3}
  canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
  await expect.poll(() => document.querySelector("#score")?.textContent, { timeout: 20000 }).toMatch(/^Collected: [1-9]/)
  canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }))
  ${
    pausable
      ? `window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
  const score = document.querySelector("#score")!.textContent
  const pausedSteps = movement.steps
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(document.querySelector("#score")!.textContent).toBe(score)
  expect(movement.steps).toBe(pausedSteps)
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))`
      : ""
  }
  // Collect with the score label gone; renderer behavior must remain valid.
  document.querySelector("#score")!.remove()
  movement.x = ${flat ? 400 : 0}
  movement.y = ${flat ? 297.5 : 0}
  const before = movement.steps
  await expect.poll(() => movement.steps).toBeGreaterThan(before + 2)
  expect(canvas.isConnected).toBe(true)
  vi.restoreAllMocks()
  window.dispatchEvent(new Event("resize"))
  window.dispatchEvent(new Event("pagehide"))
}, 30000)
`
  }
  if (renderer === "three") {
    files["src/main-error.test.ts"] = `import { expect, it } from "vitest"
it("reports a missing game container", async () => {
  document.body.innerHTML = ""
  await expect(import("./main")).rejects.toThrow("Game container is missing")
})
`
  }
  return files
}
