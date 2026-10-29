import { expect, test } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"
const player = `${testOrigins().stories}/iframe.html?id=public-site-publishing--player&viewMode=story`
const catalog = `${testOrigins().stories}/iframe.html?id=public-site-publishing--published&viewMode=story`

test("views survive refreshes and plays are distinct from viewing or restarting", async ({ page }, info) => {
  const accepted = new Set<string>()
  const events: { kind: string; visitorId: string }[] = []
  let views = 0,
    plays = 0
  await page.route("**/api/platform/v1/games/project-1/activity", async (route) => {
    const event = route.request().postDataJSON() as { kind: string; visitorId: string }
    events.push(event)
    const key = `${event.visitorId}:${event.kind}`
    const counted = !accepted.has(key)
    if (counted) {
      accepted.add(key)
      if (event.kind === "view") views++
      else plays++
    }
    await route.fulfill({ json: { counted, views, plays } })
  })
  await page.route("https://d-b2a727d1.spawn-snake.spawnkit.cloud/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<button onclick="parent.postMessage({type:'spawnkit:play'},'*')">Start game</button>`
    })
  )
  await page.goto(catalog)
  await expect(page.locator(".p-games-grid .p-game-signals")).toHaveCount(1)
  expect(events).toHaveLength(0)
  await expect(page.locator(".p-games-grid .p-game-signals b").first()).toHaveText("0")
  await page.goto(player)
  await expect(page.getByLabel("Views: 1", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Plays: 0", { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Views: 1", { exact: true })).toBeVisible()
  expect(events.map((event) => event.kind)).toEqual(["view", "view"])
  expect(new Set(events.map((event) => event.visitorId)).size).toBe(1)
  await page.frameLocator(".hosted-stage iframe").getByRole("button", { name: "Start game", exact: true }).click()
  await expect(page.getByLabel("Plays: 1", { exact: true })).toBeVisible()
  await expect(page.locator(".hosted-stage iframe")).toBeVisible()
  await expect(page.getByRole("button", { name: "Close game", exact: true })).toHaveCount(0)
  await page.frameLocator(".hosted-stage iframe").getByRole("button", { name: "Start game", exact: true }).click()
  await expect.poll(() => events.filter((event) => event.kind === "play").length).toBe(1)
  await expect(page.getByLabel("Plays: 1", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Play game", exact: true })).toHaveCount(0)
  if (info.project.name === "desktop") {
    await page.getByRole("button", { name: "Fullscreen", exact: true }).click()
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.className)).toBe("hosted-stage")
    expect(await page.evaluate(() => document.fullscreenElement?.querySelector(".hosted-toolbar"))).toBeNull()
    await page.screenshot({ path: "work/game-only-fullscreen.png" })
    await page.evaluate(() => document.exitFullscreen())
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `work/activity-player-${info.project.name}.png` })
})

test("activity failures and unavailable browser storage never block the game or invent counts", async ({ page }) => {
  let requests = 0
  await page.route("**/api/platform/v1/games/project-1/activity", (route) => {
    requests++
    return route.fulfill({ status: 503, json: { error: { code: "unavailable" } } })
  })
  await page.route("https://d-b2a727d1.spawn-snake.spawnkit.cloud/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<button onclick="parent.postMessage({type:'spawnkit:play'},'*')">Start game</button>`
    })
  )
  await page.goto(player)
  await expect.poll(() => requests).toBe(1)
  await page.frameLocator(".hosted-stage iframe").getByRole("button", { name: "Start game", exact: true }).click()
  await expect(page.locator(".hosted-stage iframe")).toBeVisible()
  await expect.poll(() => requests).toBe(2)
  await expect(page.getByLabel("Views: 0", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Plays: 0", { exact: true })).toBeVisible()
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("storage unavailable")
    }
  })
  await page.reload()
  await page.frameLocator(".hosted-stage iframe").getByRole("button", { name: "Start game", exact: true }).click()
  await expect(page.locator(".hosted-stage iframe")).toBeVisible()
  expect(requests).toBe(2)
})
