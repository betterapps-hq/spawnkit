import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  PCFShadowMap,
  SRGBColorSpace,
  PMREMGenerator,
  Mesh,
  Material
} from "three"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

export function createScene(host: HTMLElement) {
  const scene = new Scene()
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.domElement.setAttribute("aria-hidden", "true")
  host.appendChild(renderer.domElement)
  const camera = new PerspectiveCamera(38, 1, 0.1, 100)
  const room = new RoomEnvironment()
  const generator = new PMREMGenerator(renderer)
  const environment = generator.fromScene(room, 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.65
  room.dispose()
  generator.dispose()
  scene.add(new AmbientLight(0xcbb7ed, 0.35))
  const light = new DirectionalLight(0xfff2e5, 2)
  light.position.set(-3, 9, 5)
  light.castShadow = true
  light.shadow.mapSize.set(1024, 1024)
  Object.assign(light.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 })
  light.shadow.normalBias = 0.03
  scene.add(light)
  let disposed = false
  const render = () => {
    if (!disposed) renderer.render(scene, camera)
  }
  const resize = () => {
    const { width, height } = host.getBoundingClientRect()
    if (!width || !height) return
    camera.aspect = width / height
    camera.zoom = Math.min(1, camera.aspect / (Number(camera.userData.fitAspect) || 1))
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    render()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  return {
    scene,
    renderer,
    camera,
    render,
    resize,
    dispose() {
      disposed = true
      observer.disconnect()
      const materials = new Set<Material>()
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose()
          for (const material of Array.isArray(object.material) ? object.material : [object.material])
            materials.add(material)
        }
      })
      materials.forEach((material) => {
        if ("map" in material) (material.map as { dispose?: () => void } | null)?.dispose?.()
        material.dispose()
      })
      environment.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }
}
