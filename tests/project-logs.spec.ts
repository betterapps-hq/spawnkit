import { expect, test } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

test("large logs stay compact and windowed, with full details and keyboard navigation", async ({ page, context }) => {
  await page.goto(
    `${testOrigins().stories}/iframe.html?id=project-dashboard-management--logs-large-volume&viewMode=story`
  )
  const viewport = page.getByLabel("Log entries", { exact: true })
  const rows = page.locator("[data-log-index]")
  await expect(page.getByText("10,000 entries", { exact: true })).toBeVisible()
  await expect(page.locator('[data-log-index="9999"]')).toBeVisible()
  expect(await rows.count()).toBeLessThan(60)
  expect((await rows.first().boundingBox())!.height).toBe(32)
  await page.locator('[data-log-index="9999"]').click()
  const dialog = page.getByRole("dialog", { name: "Log entry", exact: true })
  await expect(dialog).toContainText("at ForestRoom.onMessage (src/rooms/forest.ts:128:5)")
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await dialog.getByRole("button", { name: "Copy log message" }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "TimeoutError: persistence request exceeded deadline"
  )
  await dialog.getByRole("button", { name: "Close", exact: true }).click()
  await viewport.evaluate((element) => {
    element.scrollTop = 0
  })
  await expect(page.locator('[data-log-index="0"]')).toBeVisible()
  await expect(page.getByRole("button", { name: "Jump to latest" })).toBeVisible()
  await page.locator('[data-log-index="0"]').focus()
  await page.keyboard.press("ArrowDown")
  await expect(page.locator('[data-log-index="1"]')).toBeFocused()
  await page.keyboard.press("End")
  await expect(page.locator('[data-log-index="9999"]')).toBeFocused()
  await page.getByLabel("Search logs").fill("Runtime event 1:")
  await expect(page.getByText("1 entry", { exact: true })).toBeVisible()
  await expect(rows).toHaveCount(1)
  await page.getByLabel("Search logs").fill("no matching event")
  await expect(page.getByText("No matching log entries", { exact: true })).toBeVisible()
  await page.getByLabel("Search logs").clear()
  await expect(page.locator('[data-log-index="9999"]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("incoming logs follow the tail without moving someone reading older entries, and pause freezes results", async ({
  page
}) => {
  await page.goto(
    `${testOrigins().stories}/iframe.html?id=project-dashboard-management--logs-live-traffic&viewMode=story`
  )
  const viewport = page.getByLabel("Log entries", { exact: true })
  const count = page.getByText(/^\d[\d,]* entries$/)
  await expect(page.getByText("Following latest", { exact: true })).toBeVisible()
  const initialCount = await count.textContent()
  await expect(count).not.toHaveText(initialCount!)
  expect(
    await viewport.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)
  ).toBeLessThan(27)
  await viewport.evaluate((element) => {
    element.scrollTop = 0
  })
  await expect(page.getByText("Viewing earlier entries", { exact: true })).toBeVisible()
  const readingCount = await count.textContent()
  await expect(count).not.toHaveText(readingCount!)
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(0)
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  const pausedCount = await count.textContent()
  // Two simulated transport ticks must leave the paused snapshot unchanged.
  await expect(async () => {
    await page.waitForTimeout(2100)
    expect(await count.textContent()).toBe(pausedCount)
  }).toPass({ timeout: 3000 })
  await page.getByRole("button", { name: "Resume", exact: true }).click()
  await expect(count).not.toHaveText(pausedCount!)
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(0)
  await page.getByRole("button", { name: "Jump to latest" }).click()
  await expect(page.getByText("Following latest", { exact: true })).toBeVisible()
})
