import { expect, test } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"
test("player recovery design stays usable on desktop and mobile", async ({ page }, info) => {
  await page.goto(`${testOrigins().stories}/iframe.html?id=public-site-player-loading--failed&viewMode=story`)
  await expect(page.getByRole("heading", { name: "Couldn't load this game" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Close game" })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `work/player-loading-${info.project.name}.png`, fullPage: true })
  await page.getByRole("button", { name: "Try again" }).click()
  await expect(page.getByRole("heading", { name: "Trying again" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "You're back in the game" })).toBeVisible()
})
