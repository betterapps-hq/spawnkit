import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"
const stories = testOrigins().stories
test("admin submissions use a simple grid with direct approve and reject actions", async ({ page }, info) => {
  let action = ""
  await page.route("**/api/platform/v1/admin/submissions**", async (route) => {
    if (route.request().method() === "POST") {
      action = route.request().postDataJSON().action
      expect(route.request().postDataJSON().note).toBe("")
      await route.fulfill({ json: { status: action === "approve" ? "approved" : "rejected" } })
    } else await route.fulfill({ json: { submissions: [] } })
  })
  for (const decision of ["Approve", "Reject"]) {
    await page.goto(`${stories}/iframe.html?id=public-site-publishing--review&viewMode=story`)
    const nav = page.getByRole("navigation", { name: "Project navigation" })
    await expect(nav.getByRole("button", { name: "Submissions", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
      { timeout: 20_000 }
    )
    await expect(nav.getByRole("button", { name: "Review submissions", exact: true })).toHaveCount(0)
    const grid = page.locator(".submission-grid")
    await expect(grid.locator("article")).toHaveCount(3)
    await expect(grid.locator("button")).toHaveCount(6)
    await expect(grid.locator("details")).toHaveCount(0)
    await expect(grid.getByText("Public game details")).toHaveCount(0)
    await expect(page.getByRole("textbox")).toHaveCount(0)
    await expect(page.getByRole("checkbox")).toHaveCount(0)
    expect(await grid.evaluate((e) => getComputedStyle(e).display)).toBe("grid")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `work/submission-grid-${info.project.name}.png`, fullPage: true })
    await page
      .getByRole("article", { name: "Snake", exact: true })
      .getByRole("button", { name: decision, exact: true })
      .click()
    await expect(page.getByText("No submissions to review.")).toBeVisible()
    expect(action).toBe(decision.toLowerCase())
  }
})

test("submissions are admin-only, including direct page access", async ({ page }) => {
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--non-admin&viewMode=story`)
  await expect(page.getByText("Administrator access is required to review submissions.")).toBeVisible()
  const nav = page.getByRole("navigation", { name: "Project navigation" })
  await expect(nav.getByRole("button", { name: "Submissions", exact: true })).toHaveCount(0)
  await expect(nav.getByRole("button", { name: "Review submissions", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0)
})

const previewClip = readFileSync(new URL("./fixtures/orchard-preview.mp4", import.meta.url))
test("monthly cards preview on hover without eager video downloads or blocking game links", async ({ page }, info) => {
  let requests = 0
  await page.route("**/media/gameplay.mp4", (route) => {
    requests++
    return route.fulfill({ body: previewClip, contentType: "video/mp4" })
  })
  await page.route("**/media/cover.png", (route) =>
    route.fulfill({ path: "apps/dashboard/public/examples/snake.webp", contentType: "image/webp" })
  )
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--published&viewMode=story`)
  const card = page.getByRole("link", { name: "Play Snake, rank 1", exact: true })
  const video = card.locator("video")
  await expect(card.locator("img")).toHaveAttribute("fetchpriority", "high")
  await expect(page.locator("video")).toHaveCount(0)
  expect(requests).toBe(0)
  if (info.project.name === "desktop") {
    // The title and medals remain above the video and share the card's hover area.
    await card.getByRole("heading", { name: "Snake", exact: true }).hover()
    await expect(video).toHaveClass("preview-ready")
    await expect(video).toHaveCSS("opacity", "1")
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0)
    expect(await video.evaluate((v) => (v as HTMLVideoElement).muted && (v as HTMLVideoElement).loop)).toBe(true)
    await expect(card.getByRole("heading")).toBeVisible()
    await expect(page.locator(".published-art video")).toHaveCount(0)
    await page.screenshot({ path: "work/bento-hover-preview.png", fullPage: true })
    const buffered = await video.elementHandle(),
      loadedRequests = requests
    await page.mouse.move(1, 1)
    await expect(video).not.toHaveClass("preview-ready")
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true)
    await card.hover()
    await expect(video).toHaveClass("preview-ready")
    expect(await video.evaluate((v, previous) => v === previous, buffered)).toBe(true)
    expect(requests).toBe(loadedRequests)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await expect(video).toHaveCount(0)
    await page.mouse.move(1, 1)
    await card.hover()
    await expect(video).toHaveCount(0)
  }
  await page.route("**/play/project-1", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Playable game</h1>" })
  )
  await card.click()
  await expect(page.getByRole("heading", { name: "Playable game" })).toBeVisible()
  if (info.project.name !== "desktop") expect(requests).toBe(0)
})

test("cover previews load on intent, play muted, and return to the cover", async ({ page }, info) => {
  let requests = 0
  await page.route("**/media/gameplay.mp4", (route) => {
    requests++
    return route.fulfill({ body: previewClip, contentType: "video/mp4" })
  })
  await page.route("**/media/cover.png", (route) =>
    route.fulfill({ path: "apps/dashboard/public/examples/snake.webp", contentType: "image/webp" })
  )
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--published&viewMode=story`)
  const art = page.locator(".published-art"),
    video = art.locator("video")
  await expect(art.locator("img")).toBeVisible()
  await expect(video).toHaveCount(0)
  expect(requests).toBe(0)
  await expect(page.getByRole("button", { name: /preview/i })).toHaveCount(0)
  await expect(art.getByRole("link", { name: "Play Snake", exact: true })).toHaveAttribute("href", "/play/project-1")
  if (info.project.name !== "desktop") {
    await expect(video).toHaveCount(0)
    return
  }
  await art.hover()
  await expect(video).toBeVisible()
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0)
  expect(await video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true)
  await page.screenshot({ path: `work/hover-preview-${info.project.name}.png` })
  const firstPlayer = await video.elementHandle()
  await page.mouse.move(1, 1)
  await expect(video).not.toHaveClass("preview-ready")
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true)
  const loadedRequests = requests
  await art.hover()
  await expect(video).toHaveClass("preview-ready")
  expect(await video.evaluate((v, previous) => v === previous, firstPlayer)).toBe(true)
  expect(requests).toBe(loadedRequests)
  await page.mouse.move(1, 1)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await art.hover()
  await page.waitForTimeout(400)
  await expect(video).toHaveCount(0)
})

test("hover buffers expire and offscreen players release their resources", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Hover previews are desktop only")
  await page.route("**/media/gameplay.mp4", (route) => route.fulfill({ body: previewClip, contentType: "video/mp4" }))
  await page.route("**/media/cover.png", (route) =>
    route.fulfill({ path: "apps/dashboard/public/examples/snake.webp", contentType: "image/webp" })
  )
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--published&viewMode=story`)
  const art = page.locator(".published-art")
  await art.hover()
  await expect(art.locator("video")).toHaveClass("preview-ready")
  await page.clock.install()
  await page.mouse.move(1, 1)
  await expect(art.locator("video")).not.toHaveClass("preview-ready")
  await page.clock.fastForward(31_000)
  await expect(art.locator("video")).toHaveCount(0)
  await art.hover()
  await expect(art.locator("video")).toHaveClass("preview-ready")
  await page.evaluate(() => {
    const spacer = document.createElement("div")
    spacer.style.height = "3000px"
    document.body.prepend(spacer)
    window.scrollTo(0, 0)
  })
  await expect(art.locator("video")).toHaveCount(0)
})

test("failed hover media leaves a usable cover and game link", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Hover previews are desktop only")
  await page.route("**/media/gameplay.mp4", (route) => route.fulfill({ status: 404, body: "Not found" }))
  await page.route("**/media/cover.png", (route) =>
    route.fulfill({ path: "apps/dashboard/public/examples/snake.webp", contentType: "image/webp" })
  )
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--published&viewMode=story`)
  const art = page.locator(".published-art")
  const response = page.waitForResponse("**/media/gameplay.mp4")
  await art.hover()
  await response
  await expect(art.locator("video")).toHaveCount(0)
  await expect(art.locator("img")).toBeVisible()
  await expect(art.getByRole("link")).toHaveAttribute("href", "/play/project-1")
})

test("monthly podium uses real monthly counts, working game links and a responsive layout", async ({ page }, info) => {
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--rankings&viewMode=story`)
  const section = page.getByRole("region", { name: "Top games this month" })
  await expect(section.locator("h3")).toHaveText(["Orchard Snake", "Prism Break", "Starfall Squadron"])
  await expect(section.getByText("12 views this month")).toBeVisible()
  await expect(section.getByRole("link").first()).toHaveAttribute("href", "/play/project-1")
  await expect(section.locator("img").first()).toHaveAttribute("fetchpriority", "high")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `work/monthly-rankings-${info.project.name}.png`, fullPage: true })
  await page.getByLabel("Search games", { exact: true }).fill("no match")
  await expect(section.locator("h3")).toHaveCount(3)
})

test("landing header keeps Dashboard visible at phone and tablet widths", async ({ page }, info) => {
  await page.goto(`${stories}/iframe.html?id=public-site-marketing--creators&viewMode=story`)
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    const link = page.locator(".p-header-actions").getByRole("link", { name: "Dashboard", exact: true })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", "/dashboard")
    const box = await link.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    expect(await page.locator(".p-header").evaluate((e) => e.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: `work/landing-dashboard-${info.project.name}.png` })
})

test("release overview has one visit action and concise commit and date metadata", async ({ page }, info) => {
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--release-summary&viewMode=story`)
  await expect(page.getByRole("link", { name: "Visit game", exact: true })).toHaveCount(1)
  await expect(page.getByRole("button", { name: "Rollback", exact: true })).toHaveCount(0)
  await expect(page.getByText("Global static hosting", { exact: true })).toHaveCount(0)
  const production = page.getByRole("region", { name: "Production deployment" })
  await expect(production.getByRole("button", { name: "View version 1" }).locator("svg")).toHaveCount(0)
  await expect(production.getByText("ce494d3", { exact: true })).toBeVisible()
  await expect(production.getByText("Oct 15, 2026, 11:07 PM UTC", { exact: true })).toBeVisible()
  await expect(page.getByText("ce494d3", { exact: true })).toHaveCount(2)
  await expect(page.locator(".lucide-clock")).toHaveCount(2)
  await page.screenshot({ path: `work/release-summary-${info.project.name}.png`, fullPage: true })
})
test("submissions inherit the dashboard light and dark themes", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("spawn:theme", "dark"))
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--review&viewMode=story`)
  const surface = page.locator(".dashboard-publishing")
  await expect(surface).toBeVisible()
  const dark = await surface.evaluate((e) => getComputedStyle(e).color)
  if (page.viewportSize()!.width < 1024)
    await page.getByRole("button", { name: "Expand navigation", exact: true }).click()
  await page.getByRole("button", { name: "Open user menu", exact: true }).click()
  await page.getByRole("menuitemradio", { name: "Light", exact: true }).click()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  expect(await surface.evaluate((e) => getComputedStyle(e).color)).not.toBe(dark)
  await page.keyboard.press("Escape")
  await page.screenshot({ path: `work/submissions-light-${info.project.name}.png`, fullPage: true })
})

test("submission card opens the pinned game without reviewing it", async ({ page, context }) => {
  await context.route("https://d-b2a727d1.spawn-snake.spawnkit.games/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Playable game</h1>" })
  )
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--review&viewMode=story`)
  const card = page.getByRole("article", { name: "Snake", exact: true })
  const popupPromise = page.waitForEvent("popup")
  await card.locator(".submission-cover").click()
  const popup = await popupPromise
  await expect(popup).toHaveURL("https://d-b2a727d1.spawn-snake.spawnkit.games/")
  await expect(popup.getByRole("heading", { name: "Playable game" })).toBeVisible()
  await popup.close()
  await expect(card.getByRole("button", { name: "Approve", exact: true })).toBeEnabled()
  await expect(card.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer")
})

test("approved games join the main catalog and share search and sorting", async ({ page }, info) => {
  await page.route("**/media/cover.png", (route) =>
    route.fulfill({ path: "apps/dashboard/public/examples/snake.webp", contentType: "image/webp" })
  )
  await page.goto(`${stories}/iframe.html?id=public-site-publishing--published&viewMode=story`)
  const grid = page.locator(".p-games-grid")
  await expect(grid.locator(".p-game-card")).toHaveCount(1)
  await expect(grid.locator("h3").first()).toHaveText("Snake")
  await expect(grid.getByRole("link", { name: "Play Snake", exact: true })).toHaveAttribute("href", "/play/project-1")
  await expect(page.getByRole("heading", { name: "Community releases" })).toHaveCount(0)
  const approved = grid.getByRole("article", { name: "Snake", exact: true })
  await expect(approved.getByLabel("Rating 0 out of 5 from 0 reviews", { exact: true })).toBeVisible()
  await expect(approved.getByLabel("Views: 0", { exact: true })).toBeVisible()
  await expect(approved.getByLabel("Comments: 0", { exact: true })).toBeVisible()
  await expect(grid.getByLabel("Rating 0 out of 5 from 0 reviews", { exact: true })).toHaveCount(1)
  await expect(grid.getByLabel("Views: 0", { exact: true })).toHaveCount(1)
  await expect(grid.getByLabel("Comments: 0", { exact: true })).toHaveCount(1)
  await page.getByRole("combobox", { name: "Sort games" }).click()
  await page.getByRole("option", { name: "Name: A–Z", exact: true }).click()
  await expect(grid.locator("h3").first()).toHaveText("Snake")
  await page.getByLabel("Search games", { exact: true }).fill("Collect fruit")
  await expect(grid.locator(".p-game-card")).toHaveCount(1)
  await expect(grid.locator("h3")).toHaveText("Snake")
  await page.getByLabel("Search games", { exact: true }).fill("")
  await expect(grid.locator(".p-game-card")).toHaveCount(1)
  await page.screenshot({ path: `work/unified-catalog-${info.project.name}.png`, fullPage: true })
})
