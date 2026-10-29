import { expect, test } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"
const player = `${testOrigins().stories}/iframe.html?id=public-site-publishing--player&viewMode=story`
test("saves, edits and removes ratings/comments with live totals and preserved failed input", async ({
  page
}, info) => {
  let rating = 0
  let text = ""
  let fail = false
  const totals = () => ({ rating, reviews: rating ? 1 : 0, comments: text ? 1 : 0 })
  const comment = () => ({
    id: "comment-1",
    author: "Alex",
    body: text,
    rating,
    createdAt: "2026-10-16T12:00:00Z",
    updatedAt: "2026-10-16T12:00:00Z"
  })
  await page.route("**/api/platform/v1/games/project-1/**", async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname.endsWith("feedback/me"))
      return route.fulfill({ json: { rating, comment: text ? comment() : null, admin: false } })
    if (url.pathname.endsWith("feedback"))
      return route.fulfill({ json: { totals: totals(), comments: text ? [comment()] : [], nextCursor: null } })
    if (url.pathname.endsWith("activity")) return route.fulfill({ json: { views: 1, plays: 0 } })
    if (fail) return route.fulfill({ status: 503, json: { error: { message: "Temporarily unavailable. Try again." } } })
    if (url.pathname.endsWith("rating")) rating = method === "DELETE" ? 0 : route.request().postDataJSON().rating
    else text = method === "DELETE" ? "" : route.request().postDataJSON().body
    return route.fulfill({ json: { totals: totals() } })
  })
  await page.route("https://d-b2a727d1.spawn-snake.spawnkit.cloud/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<button>Start game</button>" })
  )
  await page.goto(player)
  await expect(page.getByText("No comments yet.", { exact: false })).toBeVisible()
  await page.getByRole("radio", { name: "4 stars", exact: true }).check({ force: true })
  await page.getByRole("button", { name: "Save rating", exact: true }).click()
  await expect(page.getByLabel("Rating 4 out of 5 from 1 reviews", { exact: true })).toBeVisible()
  await page.getByLabel("Leave feedback").fill("The controls feel great.")
  fail = true
  await page.getByRole("button", { name: "Save comment" }).click()
  await expect(page.getByRole("alert")).toContainText("Temporarily unavailable")
  await expect(page.getByLabel("Leave feedback")).toHaveValue("The controls feel great.")
  fail = false
  await page.getByRole("button", { name: "Save comment" }).click()
  await expect(page.locator(".p-review")).toContainText("The controls feel great.")
  await expect(page.getByLabel("Comments: 1", { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator(".p-review")).toContainText("The controls feel great.")
  await page.getByRole("button", { name: "Edit comment", exact: true }).click()
  await page.getByLabel("Edit your comment").fill("The controls and pacing feel great.")
  await page.getByRole("button", { name: "Save comment" }).click()
  await expect(page.locator(".p-review")).toContainText("The controls and pacing feel great.")
  await page.locator("#community").scrollIntoViewIfNeeded()
  await page.screenshot({ path: `work/community-${info.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole("button", { name: "Delete comment", exact: true }).click()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(page.locator(".p-review")).toHaveCount(1)
  await page.getByRole("button", { name: "Delete comment", exact: true }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.locator(".p-review")).toHaveCount(0)
  await page.getByRole("button", { name: "Remove rating", exact: true }).click()
  await expect(page.locator(".p-rating-total strong")).toHaveText("0")
})
test("signed-out readers see public feedback and a sign-in prompt, not posting controls", async ({ page }) => {
  await page.route("**/api/platform/v1/games/project-1/**", (route) =>
    route.fulfill(
      route.request().url().endsWith("/me")
        ? { status: 401, json: { error: { message: "Sign in" } } }
        : { json: { totals: { rating: 0, reviews: 0, comments: 0 }, comments: [], nextCursor: null } }
    )
  )
  await page.route("https://d-b2a727d1.spawn-snake.spawnkit.cloud/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "Game" })
  )
  await page.goto(player)
  await expect(page.getByRole("link", { name: "Sign in to rate" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign in to comment" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Save rating" })).toHaveCount(0)
  await expect(page.locator(".p-rating-total strong")).toHaveText("0")
})
test("discovery exposes real genre and dimension filters", async ({ page }) => {
  await page.goto(`${testOrigins().stories}/iframe.html?id=public-site-publishing--published&viewMode=story`)
  await expect(page.locator(".p-game-tags")).toContainText("Arcade")
  await expect(page.locator(".p-game-tags")).toContainText("2D")
  await page.getByRole("button", { name: "Filter games", exact: true }).click()
  await page.getByRole("combobox", { name: "Dimension", exact: true }).click()
  await page.getByRole("option", { name: "3D", exact: true }).click()
  await expect(page.locator(".p-game-card")).toHaveCount(0)
  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await expect(page.locator(".p-game-card")).toHaveCount(1)
})
