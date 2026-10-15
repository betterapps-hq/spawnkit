const imports = `import "./style.css"
import { advanceScore } from "./score"
import { createSimulation } from "./simulation"
import { createInput } from "./input"
`
const setup2d = `const simulation = createSimulation({ x: 400, y: 280, speed: 250, minX: 14, maxX: 786, minY: 14, maxY: 546 })\n`
const setup3d = `const simulation = createSimulation({ x: 0, y: 0, speed: 5, minX: -7.5, maxX: 7.5, minY: -5.5, maxY: 5.5 })\n`

export const phaserSource = `import Phaser from "phaser"
${imports}
class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private collectible!: Phaser.GameObjects.Arc
  private controls!: ReturnType<typeof createInput>
  private simulation = createSimulation({ x: 400, y: 280, speed: 250, minX: 14, maxX: 786, minY: 14, maxY: 546 })
  private score = 0
  create() {
    this.add.grid(400, 280, 800, 560, 40, 40, 0x101e29, 1, 0x213844, 0.7)
    this.player = this.add.rectangle(400, 280, 28, 28, 0xb5f46a)
    this.collectible = this.add.circle(580, 280, 11, 0xffc77a)
    this.game.canvas.tabIndex = 0
    this.game.canvas.setAttribute("aria-label", "Game. Use arrow keys to collect gold.")
    this.controls = createInput(this.game.canvas)
  }
  update(_time: number, delta: number) {
    if (!this.controls) return
    const position = this.simulation.step(this.controls.read(), delta / 1000)
    this.player.setPosition(position.x, position.y)
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.collectible.x, this.collectible.y) < 28) {
      this.score = advanceScore(this.score)
      const label = document.querySelector("#score")
      if (label) label.textContent = "Collected: " + this.score
      this.collectible.setPosition(Phaser.Math.Between(35, 765), Phaser.Math.Between(70, 525))
    }
  }
}
new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: 800, height: 560, backgroundColor: "#101e29", input: { keyboard: false }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: GameScene })
`

export const pixiSource = `import { Application, Graphics } from "pixi.js"
${imports}
${setup2d}
const app = new Application()
await app.init({ width: 800, height: 560, background: "#101e29", preference: "webgl", antialias: true })
app.canvas.tabIndex = 0
app.canvas.setAttribute("aria-label", "Game. Use arrow keys to collect gold.")
document.querySelector("#game")?.append(app.canvas)
const controls = createInput(app.canvas)
const player = new Graphics().roundRect(-14, -14, 28, 28, 5).fill(0xb5f46a)
player.position.set(400, 280)
const collectible = new Graphics().circle(0, 0, 11).fill(0xffc77a)
collectible.position.set(580, 280)
app.stage.addChild(player, collectible)
let score = 0
app.ticker.add((ticker) => {
  const position = simulation.step(controls.read(), ticker.deltaMS / 1000)
  player.position.set(position.x, position.y)
  if (Math.hypot(player.x - collectible.x, player.y - collectible.y) < 28) {
    score = advanceScore(score)
    const label = document.querySelector("#score")
    if (label) label.textContent = "Collected: " + score
    collectible.position.set(35 + Math.random() * 730, 70 + Math.random() * 455)
  }
})
`

export const babylonSource = `import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera"
import { Engine } from "@babylonjs/core/Engines/engine"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { Scene } from "@babylonjs/core/scene"
${imports}
${setup3d}
const canvas = document.createElement("canvas")
canvas.setAttribute("aria-label", "3D game. Use arrow keys to collect gold.")
canvas.tabIndex = 0
document.querySelector("#game")?.append(canvas)
const controls = createInput(canvas)
const engine = new Engine(canvas, true)
const scene = new Scene(engine)
scene.clearColor = new Color4(0.04, 0.08, 0.12, 1)
new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 18, Vector3.Zero(), scene)
new HemisphericLight("light", new Vector3(0, 1, 0), scene)
const ground = CreateGround("ground", { width: 16, height: 12 }, scene)
const groundMaterial = new StandardMaterial("ground-material", scene)
groundMaterial.diffuseColor = new Color3(0.1, 0.2, 0.25)
ground.material = groundMaterial
const player = CreateBox("player", { size: 0.7 }, scene)
player.position.y = 0.35
const playerMaterial = new StandardMaterial("player-material", scene)
playerMaterial.diffuseColor = new Color3(0.7, 0.96, 0.42)
player.material = playerMaterial
const collectible = CreateSphere("collectible", { diameter: 0.55 }, scene)
collectible.position.set(3, 0.5, 0)
const gold = new StandardMaterial("gold", scene)
gold.diffuseColor = new Color3(1, 0.7, 0.3)
collectible.material = gold
let score = 0
scene.onBeforeRenderObservable.add(() => {
  const position = simulation.step(controls.read(), engine.getDeltaTime() / 1000)
  player.position.x = position.x
  player.position.z = -position.y
  if (Vector3.Distance(player.position, collectible.position) < 0.8) {
    score = advanceScore(score)
    const label = document.querySelector("#score")
    if (label) label.textContent = "Collected: " + score
    collectible.position.set(Math.random() * 14 - 7, 0.5, Math.random() * 10 - 5)
  }
})
engine.runRenderLoop(() => scene.render())
window.addEventListener("resize", () => engine.resize())
`

export const threeSource = `import { AmbientLight, BoxGeometry, Color, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, SphereGeometry, WebGLRenderer } from "three"
${imports}
${setup3d}
const host = document.querySelector<HTMLElement>("#game")
if (!host) throw new Error("Game container is missing")
const scene = new Scene()
scene.background = new Color("#101e29")
const camera = new PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 100)
camera.position.set(0, 12, 14)
camera.lookAt(0, 0, 0)
const renderer = new WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(host.clientWidth, host.clientHeight)
renderer.domElement.tabIndex = 0
renderer.domElement.setAttribute("aria-label", "3D game. Use arrow keys to collect gold.")
host.append(renderer.domElement)
const controls = createInput(renderer.domElement)
scene.add(new AmbientLight(0xffffff, 1.5))
const light = new DirectionalLight(0xffffff, 2)
light.position.set(4, 8, 4)
scene.add(light)
const ground = new Mesh(new PlaneGeometry(16, 12), new MeshStandardMaterial({ color: 0x1a3340 }))
ground.rotation.x = -Math.PI / 2
scene.add(ground)
const player = new Mesh(new BoxGeometry(0.7, 0.7, 0.7), new MeshStandardMaterial({ color: 0xb5f46a }))
player.position.y = 0.35
scene.add(player)
const collectible = new Mesh(new SphereGeometry(0.28), new MeshStandardMaterial({ color: 0xffc77a }))
collectible.position.set(3, 0.5, 0)
scene.add(collectible)
let score = 0
let previous = performance.now()
renderer.setAnimationLoop((now) => {
  const position = simulation.step(controls.read(), (now - previous) / 1000)
  previous = now
  player.position.x = position.x
  player.position.z = position.y
  if (player.position.distanceTo(collectible.position) < 0.8) {
    score = advanceScore(score)
    const label = document.querySelector("#score")
    if (label) label.textContent = "Collected: " + score
    collectible.position.set(Math.random() * 14 - 7, 0.5, Math.random() * 10 - 5)
  }
  renderer.render(scene, camera)
})
window.addEventListener("resize", () => {
  camera.aspect = host.clientWidth / host.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(host.clientWidth, host.clientHeight)
})
`
