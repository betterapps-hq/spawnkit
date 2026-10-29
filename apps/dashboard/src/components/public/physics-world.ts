import RAPIER from "@dimforge/rapier3d-compat"
import { CylinderGeometry, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { createScene } from "./scene-runtime"

let initialized: Promise<void> | undefined
export async function createPhysicsWorld(host: HTMLElement, onSettled: () => void) {
  initialized ??= RAPIER.init()
  await initialized
  const stage = createScene(host)
  const { scene, camera, render } = stage
  camera.userData.fitAspect = 1.5
  camera.position.set(6, 5.8, 7)
  camera.lookAt(0, 0.6, 0)
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })

  function fixedBox(
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    color: string,
    tilt = 0
  ) {
    const mesh = new Mesh(
      new RoundedBoxGeometry(width, height, depth, 3, Math.min(0.07, height / 3)),
      new MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.22 })
    )
    mesh.position.set(x, y, z)
    mesh.rotation.z = tilt
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), tilt)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setTranslation(x, y, z)
        .setRotation(rotation)
        .setFriction(0.6)
    )
    return mesh
  }
  fixedBox(6.4, 0.28, 3.8, 0, -0.14, 0, "#383244")
  // Visible guard rails and colliders have the same geometry.
  for (const z of [-1.85, 1.85]) fixedBox(6.4, 0.3, 0.1, 0, 0.15, z, "#8e7aaa")
  for (const x of [-3.15, 3.15]) fixedBox(0.1, 0.3, 3.6, x, 0.15, 0, "#8e7aaa")
  // A supported incline guides the marbles down onto the lower collision deck.
  fixedBox(4.2, 0.16, 1.35, -0.65, 1, 0, "#b7a0db", -0.2)
  for (const z of [-0.7, 0.7]) fixedBox(4.2, 0.2, 0.08, -0.65, 1.13, z, "#745f98", -0.2)
  fixedBox(0.25, 1.28, 1.2, -2.25, 0.64, 0, "#6c5b86")
  fixedBox(0.25, 0.75, 1.2, 0.5, 0.375, 0, "#6c5b86")
  for (const [x, z] of [
    [1.9, -0.8],
    [2.5, 0.8],
    [0.3, -1.3]
  ]) {
    const peg = new Mesh(
      new CylinderGeometry(0.16, 0.19, 0.65, 28),
      new MeshStandardMaterial({ color: "#77c3b3", metalness: 0.3, roughness: 0.3 })
    )
    peg.position.set(x!, 0.325, z!)
    peg.castShadow = true
    scene.add(peg)
    world.createCollider(RAPIER.ColliderDesc.cylinder(0.325, 0.19).setTranslation(x!, 0.325, z!).setRestitution(0.5))
  }
  const target = new Mesh(
    new TorusGeometry(0.48, 0.025, 12, 48),
    new MeshStandardMaterial({ color: "#d7b877", emissive: "#d7b877", emissiveIntensity: 0.25 })
  )
  target.rotation.x = Math.PI / 2
  target.position.set(2.35, 0.025, 0)
  scene.add(target)
  const objects = [
    { x: -2.3, y: 2.8, z: -0.32, color: "#a98be9" },
    { x: -1.85, y: 3.3, z: 0.28, color: "#77d1bb" },
    { x: -1.35, y: 3.8, z: -0.08, color: "#edbe76" }
  ].map((item) => {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(item.x, item.y, item.z)
        .setCanSleep(true)
        .setLinearDamping(0.3)
        .setAngularDamping(0.6)
        .setCcdEnabled(true)
    )
    world.createCollider(RAPIER.ColliderDesc.ball(0.23).setRestitution(0.35).setFriction(0.65), body)
    const mesh = new Mesh(
      new SphereGeometry(0.23, 40, 28),
      new MeshStandardMaterial({ color: item.color, roughness: 0.2, metalness: 0.35 })
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    return { ...item, body, mesh }
  })
  let frame = 0
  let released = 0
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
    // A slow device steps at most 0.1 s per frame and would replay the course in slow motion, so finish it at once
    // after 10 real seconds.
    if (now - released > 10_000) settle()
    else if (elapsed < 12 && !objects.every(({ body }) => body.isSleeping())) frame = requestAnimationFrame(step)
    else {
      frame = 0
      onSettled()
    }
  }
  function settle() {
    cancelAnimationFrame(frame)
    frame = 0
    for (let index = 0; index < 720; index++) world.step()
    sync()
    onSettled()
  }
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onMotion = () => {
    if (motion.matches && frame) settle()
  }
  motion.addEventListener("change", onMotion)
  function drop() {
    cancelAnimationFrame(frame)
    objects.forEach(({ body, x, y, z }) => {
      body.setTranslation({ x, y, z }, true)
      body.setLinvel({ x: 0.3, y: 0, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: -0.2 }, true)
    })
    elapsed = 0
    accumulator = 0
    released = last = performance.now()
    if (motion.matches) settle()
    else frame = requestAnimationFrame(step)
  }
  for (let index = 0; index < 720; index++) world.step()
  sync()
  stage.resize()
  return {
    drop,
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      motion.removeEventListener("change", onMotion)
      world.free()
      stage.dispose()
    }
  }
}
