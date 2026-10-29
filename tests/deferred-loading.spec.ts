import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

const stories = testOrigins().stories
const previewClip = readFileSync(new URL("./fixtures/orchard-preview.mp4", import.meta.url))

async function holdPageLoad(page: Page) {
  let release!: () => void
  const pending = new Promise<void>((resolve) => (release = resolve))
  await page.route("**/deferred-page-load.png", async (route) => {
    await pending
    await route.fulfill({ path: "apps/dashboard/public/examples/snake.webp", contentType: "image/webp" })
  })
  await page.route("**/iframe.html?**", async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        "</body>",
        '<img alt="" width="1" height="1" style="position:absolute;left:-10000px" src="/deferred-page-load.png"></body>'
      )
    })
  })
  return release
}

test("hover previews stay lazy but explicit intent does not wait for unrelated page resources", async ({
  page
}, info) => {
  test.skip(info.project.name !== "desktop", "Hover previews are desktop only")
  const release = await holdPageLoad(page)
  let videoRequests = 0
  await page.route("**/media/gameplay.mp4", (route) => {
    videoRequests++
    return route.fulfill({ body: previewClip, contentType: "video/mp4" })
  })
  await page.route("**/media/cover.png", (route) =>
    route.fulfill({ path: "apps/dashboard/public/examples/snake.webp", contentType: "image/webp" })
  )
  try {
    await page.goto(`${stories}/iframe.html?id=public-site-publishing--published&viewMode=story`, {
      waitUntil: "domcontentloaded"
    })
    const art = page.locator(".published-art")
    await expect(art.locator("img")).toBeVisible()
    await page.waitForTimeout(450)
    expect(await page.evaluate(() => document.readyState)).toBe("interactive")
    expect(videoRequests).toBe(0)
    await expect(art.locator("video")).toHaveCount(0)
    await art.hover()
    await expect(art.locator("video")).toHaveClass("preview-ready")
    expect(await page.evaluate(() => document.readyState)).toBe("interactive")
    await expect.poll(() => videoRequests).toBeGreaterThan(0)
    release()
    await page.waitForLoadState("load")
    await expect(art.locator("video")).toBeVisible()
    await expect.poll(() => videoRequests).toBeGreaterThan(0)
    await page.mouse.move(1, 1)
    await expect(art.locator("video")).not.toHaveClass("preview-ready")
    expect(await art.locator("video").evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true)
  } finally {
    release()
  }
})

test("3D artwork waits for both page load and visibility", async ({ page }) => {
  const release = await holdPageLoad(page)
  let worldRequests = 0
  page.on("request", (request) => {
    if (/\/cloud-world\.ts/.test(request.url())) worldRequests++
  })
  try {
    await page.goto(`${stories}/iframe.html?id=public-site-marketing--environment-study&viewMode=story`, {
      waitUntil: "domcontentloaded"
    })
    const scene = page.locator(".env-scene")
    await scene.scrollIntoViewIfNeeded()
    await expect(scene.getByText("Loading environments…")).toBeVisible()
    await page.waitForTimeout(450)
    expect(worldRequests).toBe(0)
    expect(await page.evaluate(() => document.readyState)).toBe("interactive")
    await page.evaluate(() => {
      const spacer = document.createElement("div")
      spacer.style.height = "3000px"
      document.body.prepend(spacer)
      window.scrollTo(0, 0)
    })
    release()
    await page.waitForLoadState("load")
    await page.waitForTimeout(450)
    expect(worldRequests).toBe(0)
    await scene.scrollIntoViewIfNeeded()
    await expect.poll(() => worldRequests).toBeGreaterThan(0)
  } finally {
    release()
  }
})
