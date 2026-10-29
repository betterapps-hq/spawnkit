import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

async function story(page: Page, name = "games") {
  await page.goto(`${testOrigins().stories}/iframe.html?id=administration-manage--${name}&viewMode=story`)
  await expect(page.locator(".manage-heading h1")).toHaveText("Manage")
}

test("searches games and creators, filters reported games, and supports keyboard tabs", async ({ page }) => {
  await story(page)
  await page.getByRole("textbox", { name: "Search games" }).fill("Pixel Theory")
  await expect(page.getByRole("button", { name: "Open Prism Break review", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Open Orchard Snake review", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Clear search" }).click()
  await page.getByRole("combobox", { name: "Filter status" }).click()
  await page.getByRole("option", { name: "Needs review" }).click()
  await expect(page.locator("tbody tr:visible")).toHaveCount(3)
  const games = page.getByRole("tab", { name: /^Games/ })
  await games.focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("tab", { name: /^Comments/ })).toBeFocused()
  await expect(page.getByRole("textbox", { name: "Search comments" })).toBeVisible()
})

test("requires a reason and notes for a comment decision, supports restoration, and records history", async ({
  page
}) => {
  await story(page, "comments")
  const comment = page
    .locator("article.manage-comment")
    .filter({ has: page.getByRole("button", { name: "Hide comment", exact: true }) })
    .first()
  await comment.getByRole("button", { name: "Hide comment", exact: true }).click()
  const decision = page.getByRole("dialog", { name: "Hide comment" })
  const save = decision.getByRole("button", { name: "Hide comment", exact: true })
  await expect(save).toBeDisabled()
  await decision.getByRole("combobox", { name: "Reason" }).click()
  await page.getByRole("option", { name: "Spam or advertising" }).click()
  await expect(save).toBeDisabled()
  await decision
    .getByRole("textbox", { name: /Decision notes/ })
    .fill("Repeated promotional links; checked the surrounding conversation.")
  await save.click()
  await expect(decision).toHaveCount(0)
  await page.getByRole("tab", { name: "Activity" }).click()
  await expect(
    page.getByText("Spam or advertising: Repeated promotional links; checked the surrounding conversation.")
  ).toBeVisible()
  await page.getByRole("tab", { name: /^Comments/ }).click()
  await page
    .locator("article.manage-comment[data-hidden=true]")
    .first()
    .getByRole("button", { name: "Restore", exact: true })
    .click()
  const restore = page.getByRole("dialog", { name: "Restore comment" })
  await restore.getByRole("combobox", { name: "Reason" }).click()
  await page.getByRole("option", { name: "Issue resolved" }).click()
  await restore.getByRole("textbox", { name: /Decision notes/ }).fill("Resolved during review.")
  await restore.getByRole("button", { name: "Restore comment", exact: true }).click()
  await expect(restore).toHaveCount(0)
})

test("keeps restricted actions role-specific and recovers from loading errors", async ({ page }) => {
  await story(page, "moderator")
  const review = page.getByRole("dialog", { name: "Orchard Snake" })
  await expect(review.getByRole("link", { name: "Open game" })).toHaveAttribute(
    "href",
    "https://spawn-snake.spawnkit.games"
  )
  await review.getByRole("button", { name: "Game moderation actions" }).click()
  await expect(page.getByRole("menuitem", { name: /Restrict access/ })).toBeDisabled()
  await page.keyboard.press("Escape")
  await story(page, "read-only")
  await page.getByRole("button", { name: "Open Orchard Snake review", exact: true }).click()
  await expect(page.getByRole("button", { name: "Release", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Game moderation actions" })).toBeDisabled()
  await story(page, "failed")
  await page.getByRole("button", { name: "Try again" }).click()
  await expect(page.locator("tbody tr:visible")).toHaveCount(6)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
