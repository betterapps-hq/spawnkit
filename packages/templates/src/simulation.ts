const declarations = `export interface Input { x: number; y: number }
export interface SimulationOptions { x: number; y: number; speed: number; minX: number; maxX: number; minY: number; maxY: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
`

export const plainSimulation =
  declarations +
  `
export function createSimulation(options: SimulationOptions) {
  let x = options.x
  let y = options.y
  return {
    step(input: Input, deltaSeconds: number) {
      const length = Math.max(1, Math.hypot(input.x, input.y))
      const distance = options.speed * Math.max(0, Math.min(deltaSeconds, 0.05))
      x = clamp(x + input.x / length * distance, options.minX, options.maxX)
      y = clamp(y + input.y / length * distance, options.minY, options.maxY)
      return { x, y }
    }
  }
}
`

export const ecsSimulation =
  `import { addComponent, addEntity, createWorld, query } from "bitecs"
` +
  declarations +
  `
export function createSimulation(options: SimulationOptions) {
  // Each simulation owns its stores; independent worlds do not share player data.\n  // The player is initialized here; the query only visits entities with both stores.
  const Position = { x: [] as number[], y: [] as number[] }
  const Velocity = { x: [] as number[], y: [] as number[] }
  const world = createWorld()
  const player = addEntity(world)
  addComponent(world, player, Position)
  addComponent(world, player, Velocity)
  Position.x[player] = options.x
  Position.y[player] = options.y
  return {
    step(input: Input, deltaSeconds: number) {
      const length = Math.max(1, Math.hypot(input.x, input.y))
      Velocity.x[player] = input.x / length * options.speed
      Velocity.y[player] = input.y / length * options.speed
      const dt = Math.max(0, Math.min(deltaSeconds, 0.05))
      for (const entity of query(world, [Position, Velocity])) {
        Position.x[entity] = clamp(Position.x[entity]! + Velocity.x[entity]! * dt, options.minX, options.maxX)
        Position.y[entity] = clamp(Position.y[entity]! + Velocity.y[entity]! * dt, options.minY, options.maxY)
      }
      return { x: Position.x[player]!, y: Position.y[player]! }
    }
  }
}
`

export const inputSource = `export function createInput(target: HTMLElement) {
  const keys = new Set<string>()
  const directions = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])
  target.addEventListener("keydown", (event) => {
    if (directions.has(event.key)) { event.preventDefault(); keys.add(event.key) }
  })
  target.addEventListener("keyup", (event) => keys.delete(event.key))
  target.addEventListener("blur", () => keys.clear())
  window.addEventListener("blur", () => keys.clear())
  target.addEventListener("pointerdown", () => target.focus())
  return { read: () => ({ x: Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft")), y: Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp")) }) }
}
`

export const simulationTest = `import { expect, it } from "vitest"
import { createSimulation } from "./simulation"
const options = { x: 0, y: 0, speed: 100, minX: -10, maxX: 10, minY: -10, maxY: 10 }
it("moves using elapsed time and stays inside the world", () => {
  const simulation = createSimulation(options)
  expect(simulation.step({ x: 1, y: 0 }, 0.02)).toEqual({ x: 2, y: 0 })
  for (let step = 0; step < 20; step++) simulation.step({ x: 1, y: 0 }, 0.02)
  expect(simulation.step({ x: 0, y: 0 }, 0)).toEqual({ x: 10, y: 0 })
})
it("keeps worlds independent", () => {
  const first = createSimulation(options)
  const second = createSimulation(options)
  first.step({ x: 1, y: 0 }, 0.02)
  expect(second.step({ x: 0, y: 0 }, 0)).toEqual({ x: 0, y: 0 })
})
it("normalizes diagonal movement", () => {
  const position = createSimulation(options).step({ x: 1, y: 1 }, 0.02)
  expect(Math.hypot(position.x, position.y)).toBeCloseTo(2)
})
`

export const kootaSimulation =
  `import { createWorld, trait } from "koota"
` +
  declarations +
  `
const Position = trait({ x: 0, y: 0 })
const Velocity = trait({ x: 0, y: 0 })
export function createSimulation(options: SimulationOptions) {
  const world = createWorld()
  const player = world.spawn(Position({ x: options.x, y: options.y }), Velocity)
  return {
    step(input: Input, deltaSeconds: number) {
      const length = Math.max(1, Math.hypot(input.x, input.y))
      player.set(Velocity, { x: input.x / length * options.speed, y: input.y / length * options.speed })
      const dt = Math.max(0, Math.min(deltaSeconds, 0.05))
      let result = { x: options.x, y: options.y }
      world.query(Position, Velocity).updateEach(([position, velocity]) => {
        position.x = clamp(position.x + velocity.x * dt, options.minX, options.maxX)
        position.y = clamp(position.y + velocity.y * dt, options.minY, options.maxY)
        result = { x: position.x, y: position.y }
      })
      return result
    }
  }
}
`
