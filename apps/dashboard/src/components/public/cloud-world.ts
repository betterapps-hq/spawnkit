import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TextureLoader,
  TubeGeometry,
  Vector3,
  SRGBColorSpace
} from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { createScene } from "./scene-runtime"

export type CloudWorld = { select: (name: string) => void; dispose: () => void }
export function createCloudWorld(host: HTMLElement): CloudWorld {
  const stage = createScene(host)
  const { scene, camera, render } = stage
  camera.fov = 36
  camera.userData.fitAspect = 1.55
  camera.position.set(4.8, 6.7, 10)
  camera.lookAt(0, 0.65, 0)
  let disposed = false
  let frame = 0
  let active = "Production"
  let pointerX = 0
  let pointerY = 0
  let until = 0
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
  const box = (w: number, h: number, d: number, color: string, radius = 0.08) => {
    const material = new MeshStandardMaterial({ color, metalness: 0.18, roughness: 0.42 })
    const mesh = new Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }
  const floor = box(10.8, 0.18, 6.4, "#ece4f5", 0.15)
  floor.position.y = -0.15
  scene.add(floor)
  const nodes = [
    {
      name: "Preview",
      title: "PR #42 / Preview",
      subtitle: "Pull request preview",
      x: -3.25,
      z: 1.15,
      image: "platformer-3d"
    },
    { name: "Staging", title: "Staging", subtitle: "Test before release", x: 0, z: -1.8, image: "platformer-3d" },
    { name: "Production", title: "Production", subtitle: "Published game", x: 3.25, z: 1.15, image: "platformer-3d" }
  ].map((item) => {
    const group = new Group()
    group.position.set(item.x, 0, item.z)
    scene.add(group)
    const bottom = box(2.65, 0.35, 2, "#685084")
    bottom.position.y = 0.22
    group.add(bottom)
    const top = box(2.65, 0.28, 2, "#c1a3e8")
    top.position.y = 0.56
    group.add(top)
    for (let index = 0; index < 4; index++) {
      const vent = box(0.36, 0.045, 0.025, "#342444", 0.01)
      vent.position.set(-0.85 + index * 0.48, 0.26, 1.01)
      group.add(vent)
    }
    const stand = box(0.14, 0.7, 0.14, "#776089", 0.02)
    stand.position.set(0, 1.02, -0.3)
    group.add(stand)
    const monitor = new Group()
    monitor.position.set(0, 1.85, -0.3)
    monitor.rotation.y = 0.24
    monitor.rotation.x = -0.08
    group.add(monitor)
    const frameMesh = box(2.55, 1.72, 0.15, "#41314f", 0.07)
    monitor.add(frameMesh)
    const texture = new TextureLoader().load(`/examples/${item.image}.webp`, (loaded) => {
      if (disposed) loaded.dispose()
      else render()
    })
    texture.colorSpace = SRGBColorSpace
    const screen = new Mesh(new PlaneGeometry(2.35, 1.32), new MeshBasicMaterial({ map: texture, toneMapped: false }))
    screen.position.set(0, -0.08, 0.081)
    monitor.add(screen)
    const label = document.createElement("canvas")
    label.width = 768
    label.height = 96
    const ctx = label.getContext("2d")!
    ctx.fillStyle = "#41314f"
    ctx.fillRect(0, 0, 768, 96)
    ctx.fillStyle = "#e9ddfa"
    ctx.font = "600 42px sans-serif"
    ctx.fillText(item.title, 20, 65)
    const labelTexture = new CanvasTexture(label)
    labelTexture.colorSpace = SRGBColorSpace
    const labelMesh = new Mesh(
      new PlaneGeometry(2.35, 0.29),
      new MeshBasicMaterial({ map: labelTexture, toneMapped: false })
    )
    labelMesh.position.set(0, 0.65, 0.085)
    monitor.add(labelMesh)
    const light = new Mesh(
      new SphereGeometry(0.07, 16, 12),
      new MeshStandardMaterial({ color: "#e4d3ff", emissive: "#8955d5", emissiveIntensity: 1 })
    )
    light.position.set(1, 0.58, 1.01)
    group.add(light)
    return { ...item, group, top }
  })
  for (let index = 0; index < 2; index++) {
    const a = nodes[index]!
    const b = nodes[index + 1]!
    const path = new CatmullRomCurve3([
      new Vector3(a.x, 0.08, a.z),
      new Vector3((a.x + b.x) / 2, 0.08, a.z),
      new Vector3(b.x, 0.08, b.z)
    ])
    scene.add(
      new Mesh(
        new TubeGeometry(path, 36, 0.045, 8, false),
        new MeshStandardMaterial({ color: "#9670ce", emissive: "#8056bd", emissiveIntensity: 0.35 })
      )
    )
  }
  const theme = () => {
    floor.material.color.set(document.documentElement.classList.contains("dark") ? "#2e233c" : "#dbcaed")
    render()
  }
  const mutation = new MutationObserver(theme)
  mutation.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  theme()
  function tick(now: number) {
    frame = 0
    const immediate = reduced.matches
    camera.position.lerp(
      new Vector3(4.8 + pointerX * 3.4, 6.7 - pointerY * 2, 10 - pointerX * 1.2),
      immediate ? 1 : 0.13
    )
    camera.lookAt(0, 0.65, 0)
    nodes.forEach(({ group, name, top }) => {
      group.position.y += ((name === active ? 0.23 : 0) - group.position.y) * (immediate ? 1 : 0.14)
      top.material.color.lerp(new Color(name === active ? "#a57ada" : "#c7b1df"), immediate ? 1 : 0.14)
    })
    render()
    if (!disposed && !immediate && now < until) frame = requestAnimationFrame(tick)
  }
  function animate() {
    until = performance.now() + 900
    if (!frame && !disposed) frame = requestAnimationFrame(tick)
  }
  const move = (event: PointerEvent) => {
    if (reduced.matches || event.pointerType !== "mouse") return
    const rect = host.getBoundingClientRect()
    pointerX = (event.clientX - rect.left) / rect.width - 0.5
    pointerY = (event.clientY - rect.top) / rect.height - 0.5
    animate()
  }
  const leave = () => {
    pointerX = 0
    pointerY = 0
    animate()
  }
  host.addEventListener("pointermove", move)
  host.addEventListener("pointerleave", leave)
  stage.resize()
  animate()
  return {
    select(name) {
      active = name
      animate()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      mutation.disconnect()
      host.removeEventListener("pointermove", move)
      host.removeEventListener("pointerleave", leave)
      stage.dispose()
    }
  }
}
