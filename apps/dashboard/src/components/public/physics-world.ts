import RAPIER from "@dimforge/rapier3d-compat"
import { Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { createScene } from "./scene-runtime"

let initialized: Promise<void> | undefined
export async function createPhysicsWorld(host: HTMLElement, onSettled: () => void) {
  initialized ??= RAPIER.init()
  await initialized
  const stage = createScene(host)
  const { scene, camera, render } = stage
  camera.userData.fitAspect = 1.7
  camera.position.set(4.5, 4.4, 6.5)
  camera.lookAt(0, 1.1, 0)
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  const floor = new Mesh(
    new RoundedBoxGeometry(6, 0.3, 3.5, 3, 0.12),
    new MeshStandardMaterial({ color: "#b298d4", roughness: 0.3, metalness: 0.16 })
  )
  floor.position.y = -0.15
  floor.receiveShadow = true
  scene.add(floor)
  world.createCollider(RAPIER.ColliderDesc.cuboid(3, 0.15, 1.75).setTranslation(0, -0.15, 0).setFriction(0.65))
  // Invisible bounds keep repeated drops on the displayed table.
  for (const x of [-3.05, 3.05]) world.createCollider(RAPIER.ColliderDesc.cuboid(0.05, 4, 1.8).setTranslation(x, 2, 0))
  for (const z of [-1.8, 1.8]) world.createCollider(RAPIER.ColliderDesc.cuboid(3, 4, 0.05).setTranslation(0, 2, z))
  const objects = [
    { x: -0.85, y: 3.4, z: 0.25, shape: "ball", color: "#9465cc", radius: 0.47 },
    { x: 0.35, y: 4.4, z: -0.3, shape: "cube", color: "#e9b67f", radius: 0.42 },
    { x: 1.25, y: 5.2, z: 0.25, shape: "ball", color: "#d4b8f4", radius: 0.34 }
  ].map((item) => {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(item.x, item.y, item.z)
        .setCanSleep(true)
        .setLinearDamping(0.15)
        .setAngularDamping(0.4)
        .setCcdEnabled(true)
    )
    const collider =
      item.shape === "cube"
        ? RAPIER.ColliderDesc.cuboid(item.radius, item.radius, item.radius)
        : RAPIER.ColliderDesc.ball(item.radius)
    world.createCollider(collider.setRestitution(0.53).setFriction(0.65), body)
    const mesh = new Mesh(
      item.shape === "cube"
        ? new RoundedBoxGeometry(item.radius * 2, item.radius * 2, item.radius * 2, 3, 0.055)
        : new SphereGeometry(item.radius, 40, 28),
      new MeshStandardMaterial({ color: item.color, roughness: 0.32, metalness: 0.15 })
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    return { ...item, body, mesh }
  })
  let frame = 0
  let last = 0
  let accumulator = 0
  let elapsed = 0
  let disposed = false
  const sync = () => {
    objects.forEach(({ body, mesh }) => {
      mesh.position.copy(body.translation() as Vector3)
      mesh.quaternion.copy(body.rotation())
    })
    render()
  }
  function step(now: number) {
    if (disposed) return
    accumulator += Math.min((now - last) / 1000, 0.1)
    last = now
    while (accumulator >= 1 / 60) {
      world.timestep = 1 / 60
      world.step()
      accumulator -= 1 / 60
      elapsed += 1 / 60
    }
    sync()
    if (elapsed < 12 && !objects.every(({ body }) => body.isSleeping())) frame = requestAnimationFrame(step)
    else {
      frame = 0
      onSettled()
    }
  }
  function drop() {
    cancelAnimationFrame(frame)
    objects.forEach(({ body, x, y, z }, index) => {
      body.setTranslation({ x, y, z }, true)
      body.setLinvel({ x: index === 0 ? 0.35 : -0.2, y: 0, z: 0.1 }, true)
      body.setAngvel({ x: 0.4, y: 0.6, z: 0.25 }, true)
    })
    elapsed = 0
    accumulator = 0
    last = performance.now()
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (let index = 0; index < 720; index++) world.step()
      sync()
      onSettled()
    } else frame = requestAnimationFrame(step)
  }
  for (let index = 0; index < 720; index++) world.step()
  sync()
  stage.resize()
  return {
    drop,
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      world.free()
      stage.dispose()
    }
  }
}
