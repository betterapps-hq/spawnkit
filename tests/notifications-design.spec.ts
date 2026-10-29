import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

async function story(page: Page, name = "inbox") {
  await page.goto(`${testOrigins().stories}/iframe.html?id=administration-notifications--${name}&viewMode=story`)
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("spawn:theme", "dark")
    localStorage.setItem("spawn:sidebar", "expanded")
  })
})

test("inbox reads, archives and restores notifications without changing the report", async ({ page }, info) => {
  const writes: string[] = []
  page.on("request", (request) => {
    const url = new URL(request.url())
    const platformBeacon = url.origin === new URL(testOrigins().stories).origin && url.pathname === "/cdn-cgi/rum"
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !platformBeacon) writes.push(request.url())
  })
  await story(page)
  await expect(page.getByRole("button", { name: "Notifications, 3 unread", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Escalated for your review: Starfall Squadron, unread", exact: true }).click()
  const detail = page.getByRole("region", { name: "Notification details" })
  await expect(detail.getByRole("heading", { name: "Escalated for your review" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Notifications, 2 unread", exact: true })).toBeVisible()
  await expect(detail.getByRole("link", { name: "Open report" })).toHaveAttribute(
    "href",
    "?id=administration-reports--escalated&viewMode=story"
  )
  await page.screenshot({ path: `work/notifications-inbox-${info.project.name}.png`, fullPage: true })
  await detail.getByRole("button", { name: "Mark as unread", exact: true }).click()
  await expect(page.getByRole("button", { name: "Notifications, 3 unread", exact: true })).toBeVisible()
  await detail.getByRole("button", { name: "Archive notification", exact: true }).click()
  await page.getByRole("button", { name: "Archived", exact: true }).click()
  await page.getByRole("button", { name: "Escalated for your review: Starfall Squadron", exact: true }).click()
  await detail.getByRole("button", { name: "Move to inbox", exact: true }).click()
  await page.getByRole("button", { name: "All", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Escalated for your review: Starfall Squadron", exact: true })
  ).toBeVisible()
  expect(writes).toEqual([])
})

test("search, unread filters and mark all read keep counts consistent", async ({ page }) => {
  await story(page)
  await page.getByRole("textbox", { name: "Search notifications" }).fill("Prism")
  await expect(page.locator(".notification-row")).toHaveCount(2)
  await page.getByRole("button", { name: "Clear search" }).click()
  await page.getByRole("button", { name: "Unread", exact: true }).click()
  await expect(page.locator(".notification-row")).toHaveCount(3)
  await page.getByRole("button", { name: "Mark all read" }).click()
  await expect(page.locator(".notification-list")).toContainText("You're all caught up")
  await expect(page.getByRole("button", { name: "Notifications, 0 unread", exact: true })).toBeVisible()
})

test("preferences preserve edits after failure and can be retried or discarded", async ({ page }, info) => {
  await story(page, "save-failed")
  const save = page.getByRole("button", { name: "Save preferences" })
  const toggle = page.getByRole("switch", { name: "Assigned to you in-app" })
  await expect(save).toBeDisabled()
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-checked", "false")
  await page.getByRole("combobox", { name: "Assigned to you email" }).click()
  await page.getByRole("option", { name: "Daily summary", exact: true }).click()
  await save.click()
  await expect(page.getByRole("alert")).toContainText("Couldn't save preferences")
  await expect(toggle).toHaveAttribute("aria-checked", "false")
  await save.click()
  await expect(page.getByText("Preferences saved", { exact: true })).toBeVisible()
  await expect(save).toBeDisabled()
  await toggle.click()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(toggle).toHaveAttribute("aria-checked", "false")
  await page.screenshot({ path: `work/notifications-preferences-${info.project.name}.png`, fullPage: true })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("header preview supports keyboard dismissal and opens the selected notification", async ({ page }) => {
  await story(page)
  const bell = page.getByRole("button", { name: "Notifications, 3 unread", exact: true })
  await bell.click()
  const popover = page.locator(".notification-popover")
  await expect(popover.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(bell).toBeFocused()
  await bell.click()
  await popover.getByRole("button", { name: /A report is assigned to you/ }).click()
  await expect(popover).toHaveCount(0)
  await expect(page.getByRole("region", { name: "Notification details" })).toContainText("Alex Morgan assigned you")
})

test("notification states and themes remain readable without prototype notices", async ({ page }, info) => {
  for (const state of ["inbox", "empty", "loading", "failed", "report-unavailable", "moderator"]) {
    await story(page, state)
    await expect(page.locator(".safety-root")).not.toContainText(/prototype|sample data|[·•]/i)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (state === "failed") {
      await page.getByRole("button", { name: "Try again" }).click()
      await expect(page.locator(".notification-row")).toHaveCount(5)
    }
    if (state === "moderator") {
      await expect(page.locator(".notification-list")).not.toContainText("Escalated for your review")
      await page.getByRole("tab", { name: "Preferences" }).click()
      await expect(page.getByRole("switch", { name: "Escalations in-app" })).toHaveCount(0)
    }
  }
  await story(page, "escalation")
  await page.getByRole("button", { name: "Toggle theme" }).click()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.screenshot({ path: `work/notifications-light-${info.project.name}.png`, fullPage: true })
})

test("compact notifications belong to workspace navigation and hide report references", async ({ page }, info) => {
  await story(page)
  await expect(page.locator('[aria-label="Workspace"] a').filter({ hasText: "Notifications" })).toHaveCount(1)
  await expect(page.locator('[aria-label="Administration"] a').filter({ hasText: "Notifications" })).toHaveCount(0)
  await expect(page.locator(".notification-list")).not.toContainText(/RPT-/)
  await expect(page.locator(".notification-detail")).toHaveCount(0)
  const row = await page.locator(".notification-row").first().boundingBox()
  expect(row!.height).toBeLessThan(95)
  await page.screenshot({ path: `work/notifications-compact-${info.project.name}.png`, fullPage: true })
  await story(page, "creator")
  await expect(page.locator('[aria-label="Administration"]')).toHaveCount(0)
  await expect(page.locator(".notification-list")).not.toContainText(/report|escalat|approv/i)
  await expect(
    page.getByRole("button", { name: "Your game is live: Orchard Snake, unread", exact: true })
  ).toBeVisible()
  await page.getByRole("tab", { name: "Preferences" }).click()
  await expect(page.getByRole("switch", { name: "Deployments in-app" })).toBeVisible()
  await expect(page.getByRole("switch", { name: "Assigned to you in-app" })).toHaveCount(0)
})
