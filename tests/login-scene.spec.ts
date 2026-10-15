import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

const sceneStory = `${testOrigins().stories}/iframe.html?id=authentication-login-scene--animated&viewMode=story`

async function seekScene(page: Page, time: number) {
  await page.locator(".login-scene").evaluate((scene, currentTime) => {
    for (const animation of scene.getAnimations({ subtree: true })) {
      animation.pause()
      animation.currentTime = currentTime
    }
  }, time)
}

test("patrols collect and respawn gems on arrival", async ({ page }, testInfo) => {
  await page.goto(sceneStory)
  await expect(page.locator(".login-enemy")).toHaveCount(3)
  await expect(page.locator(".login-pickup")).toHaveCount(6)
  await expect(page.locator(".login-scene canvas, .login-scene img")).toHaveCount(0)

  for (const patrol of await page.locator("[data-patrol]").all()) {
    const { duration, offset } = await patrol.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        duration: Number.parseFloat(style.getPropertyValue("--patrol-duration")) * 1000,
        offset: Number.parseFloat(style.getPropertyValue("--patrol-delay")) * 1000
      }
    })
    for (const stop of [1, 3]) {
      const pickup = patrol.locator(`[data-stop="${stop}"]`)
      const arrival = duration * (stop === 1 ? 0.22 : 0.72) + offset + duration
      await seekScene(page, arrival - 100)
      await expect(pickup.locator(".login-pickup-item")).toHaveCSS("opacity", "1")
      await seekScene(page, arrival + 20)
      await expect(pickup.locator(".login-pickup-item")).toHaveCSS("opacity", "0")
      expect(
        await pickup.locator(".login-pickup-burst").evaluate((element) => Number(getComputedStyle(element).opacity))
      ).toBeGreaterThan(0.8)
      // At the collection instant, both objects occupy the same tile and elevation.
      expect(
        await patrol.locator(".login-enemy-route").evaluate((element) => getComputedStyle(element).transform)
      ).toBe(await pickup.evaluate((element) => getComputedStyle(element).transform))
      await seekScene(page, arrival + duration * 0.85)
      await expect(pickup.locator(".login-pickup-item")).toHaveCSS("opacity", "1")
    }
  }

  await seekScene(page, 1200)
  const sparkBefore = await page.locator(".login-spark-one").evaluate((element) => getComputedStyle(element).transform)
  const tileBefore = await page
    .locator(".login-tile-floating")
    .first()
    .evaluate((element) => getComputedStyle(element).transform)
  await seekScene(page, 2700)
  expect(await page.locator(".login-spark-one").evaluate((element) => getComputedStyle(element).transform)).not.toBe(
    sparkBefore
  )
  expect(
    await page
      .locator(".login-tile-floating")
      .first()
      .evaluate((element) => getComputedStyle(element).transform)
  ).not.toBe(tileBefore)
  await page.screenshot({ path: testInfo.outputPath("login-scene-collection.png") })
})

test("characters clear terrain and one another throughout their routes", async ({ page }) => {
  await page.goto(sceneStory)
  await expect(page.locator(".login-character")).toHaveCount(4)
  const collisions = await page.locator(".login-scene").evaluate((scene) => {
    const animations = scene.getAnimations({ subtree: true })
    for (const animation of animations) animation.pause()
    const routes = Array.from(scene.querySelectorAll<HTMLElement>(".login-hero-route, .login-enemy-route"))
    const tiles = Array.from(scene.querySelectorAll<HTMLElement>(".login-tile")).map((tile, index) => ({
      x: (index % 7) * 59,
      y: Math.floor(index / 7) * 59,
      top: Number.parseFloat(getComputedStyle(tile).getPropertyValue("--height"))
    }))
    const failures: string[] = []
    // Two laps of the slowest character, sampling takeoff, crossing, and landing.
    for (let time = 0; time <= 32_000; time += 100) {
      for (const animation of animations) animation.currentTime = time
      const bodies = routes.map((route) => {
        const character = route.querySelector<HTMLElement>(".login-character")!
        const position = new DOMMatrixReadOnly(getComputedStyle(route).transform)
        const bob = new DOMMatrixReadOnly(getComputedStyle(character).transform)
        const depth = Number.parseFloat(getComputedStyle(character, "::before").height)
        return { x: position.m41, y: position.m42, top: position.m43 + bob.m43, bottom: position.m43 + bob.m43 - depth }
      })
      for (const [index, body] of bodies.entries()) {
        for (const tile of tiles) {
          if (
            body.x + 32 > tile.x &&
            body.x < tile.x + 52 &&
            body.y + 32 > tile.y &&
            body.y < tile.y + 52 &&
            body.bottom < tile.top - 0.1
          )
            failures.push(`Character ${index} intersects terrain at ${time}ms`)
        }
        for (const other of bodies.slice(index + 1)) {
          if (
            Math.abs(body.x - other.x) < 32 &&
            Math.abs(body.y - other.y) < 32 &&
            body.bottom < other.top &&
            other.bottom < body.top
          )
            failures.push(`Characters intersect at ${time}ms`)
        }
      }
      if (failures.length) break
    }
    return failures
  })
  expect(collisions).toEqual([])
})

test("the pointer attracts attention and nudges floating scenery", async ({ page }, testInfo) => {
  await page.goto(sceneStory)
  const scene = page.locator(".login-scene")
  await expect(scene).toBeVisible()
  await seekScene(page, 1200)
  const face = page.locator(".login-hero .login-character-face")
  const faceBox = (await face.boundingBox())!
  await page.mouse.move(faceBox.x + faceBox.width / 2 + 65, faceBox.y + faceBox.height / 2)
  await expect
    .poll(() => face.evaluate((element) => Number.parseFloat(element.style.getPropertyValue("--look-x"))))
    .toBeGreaterThan(0.5)

  const spark = page.locator(".login-spark-one")
  const sparkBox = (await spark.boundingBox())!
  await page.mouse.move(sparkBox.x + sparkBox.width / 2 + 24, sparkBox.y + sparkBox.height / 2)
  await expect
    .poll(() => spark.evaluate((element) => Number.parseFloat(element.style.getPropertyValue("--nudge-x"))))
    .toBeLessThan(-5)

  const tileIndex = await page.locator(".login-tile-floating").evaluateAll((tiles) =>
    tiles.findIndex((tile) => {
      const box = tile.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      return x > 20 && x < innerWidth - 20 && y > 20 && y < innerHeight - 20
    })
  )
  expect(tileIndex).toBeGreaterThanOrEqual(0)
  const tile = page.locator(".login-tile-floating").nth(tileIndex)
  const tileBox = (await tile.boundingBox())!
  await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2)
  await expect
    .poll(() => tile.evaluate((element) => Number.parseFloat(element.style.getPropertyValue("--hover-lift"))))
    .toBeGreaterThan(8)
  await page.screenshot({ path: testInfo.outputPath("login-scene-pointer.png") })

  await page.mouse.move(-10, -10)
  await expect.poll(() => scene.evaluate((element) => element.style.getPropertyValue("--tilt-x"))).toBe("")
  await expect.poll(() => face.evaluate((element) => element.style.getPropertyValue("--look-x"))).toBe("")
  await expect.poll(() => tile.evaluate((element) => element.style.getPropertyValue("--hover-lift"))).toBe("")

  await scene.dispatchEvent("pointermove", { pointerType: "touch", clientX: 150, clientY: 150 })
  await expect.poll(() => scene.evaluate((element) => element.style.getPropertyValue("--tilt-x"))).toBe("")
  await page.mouse.move(150, 150)
  await expect.poll(() => scene.evaluate((element) => element.style.getPropertyValue("--tilt-x"))).not.toBe("")
  await page.emulateMedia({ reducedMotion: "reduce" })
  await expect.poll(() => scene.evaluate((element) => element.style.getPropertyValue("--tilt-x"))).toBe("")
  expect(await scene.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0)
})

test("reduced motion keeps a complete still scene and disables parallax", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(sceneStory)
  const scene = page.locator(".login-scene")
  await expect(scene).toBeVisible()
  expect(await scene.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0)
  for (const item of await page.locator(".login-pickup-item").all()) await expect(item).toHaveCSS("opacity", "1")
  const before = await page.locator(".login-world").evaluate((element) => getComputedStyle(element).transform)
  await scene.hover({ position: { x: 20, y: 20 } })
  expect(await page.locator(".login-world").evaluate((element) => getComputedStyle(element).transform)).toBe(before)
  await page.screenshot({ path: testInfo.outputPath("login-scene-reduced-motion.png") })
})

test("login illustration stays decorative and leaves mobile room for the form", async ({ page }) => {
  await page.goto("/sign-in")
  const scene = page.locator(".login-scene")
  await expect(scene).toHaveAttribute("aria-hidden", "true")
  await expect(scene.locator("button, a, input, [tabindex]")).toHaveCount(0)
  if (page.viewportSize()!.width < 1024) await expect(scene).toBeHidden()
  else await expect(scene).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("Storybook inspection views stay still with visible pickups", async ({ page }, testInfo) => {
  for (const variant of ["paused", "reduced-motion"]) {
    await page.goto(sceneStory.replace("--animated", `--${variant}`))
    const scene = page.locator(".login-scene")
    await expect(scene).toBeVisible()
    await expect
      .poll(() =>
        scene.evaluate(
          (element) =>
            element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length
        )
      )
      .toBe(0)
    expect(
      await scene
        .locator(".login-pickup-item")
        .evaluateAll((items) => items.filter((item) => Number(getComputedStyle(item).opacity) > 0.5).length)
    ).toBeGreaterThan(0)
    await page.screenshot({ path: testInfo.outputPath(`login-scene-${variant}.png`) })
  }
})
