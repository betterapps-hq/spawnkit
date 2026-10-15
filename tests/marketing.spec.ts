import { expect, test } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

test("creator page keeps its content and actions when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, options?: unknown) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null
      return Reflect.apply(original, this, [type, options])
    } as typeof original
  })
  await page.goto("/create")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await page.locator(".physics-demo").scrollIntoViewIfNeeded()
  await expect(page.locator(".physics-demo")).toHaveAttribute("data-state", "unavailable", { timeout: 30000 })
  await expect(page.locator(".mk-physics-fallback")).toBeVisible()
  await expect(page.getByText("Static physics preview", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Drop objects", exact: true })).toBeDisabled()
  await page.getByRole("link", { name: "Build your starter kit", exact: true }).first().click()
  await expect(page).toHaveURL(/\/templates\?engine=pixi/)
})

test("marketing pages and interactions are available in Storybook", async ({ page }) => {
  const stories = testOrigins().stories
  await page.goto(`${stories}/iframe.html?id=public-site-marketing--creators&viewMode=story`)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start with a playable game. Make it yours.")
  await page.getByRole("tab", { name: /Babylon/ }).click()
  await expect(page.getByRole("link", { name: "Build your starter kit", exact: true }).first()).toHaveAttribute(
    "href",
    "/templates?engine=babylon"
  )
  await page.goto(`${stories}/iframe.html?id=public-site-marketing--cloud&viewMode=story`)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bring your game to players.")
  await page.getByRole("tab", { name: /Release/ }).click()
  await expect(page.getByRole("tabpanel")).toContainText("same artifact")
  await expect(page.locator(".p-price-card").filter({ hasText: "Game services" })).toContainText("Coming soon")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("mobile header closes on Escape and restores menu focus", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Mobile navigation")
  await page.goto("/create")
  const menu = page.getByRole("button", { name: "Open menu", exact: true })
  await menu.click()
  const link = page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Cloud", exact: true })
  await link.focus()
  await link.press("Escape")
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0)
  await expect(menu).toBeFocused()
})
