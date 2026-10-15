import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { expect, test, type Page } from "@playwright/test"

const { unzipSync, strFromU8 } = createRequire(new URL("../apps/dashboard/package.json", import.meta.url))(
  "fflate"
) as {
  unzipSync: (data: Uint8Array) => Record<string, Uint8Array>
  strFromU8: (data: Uint8Array) => string
}

async function selectMenu(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: new RegExp(label) }).click()
  await page.getByRole("option", { name: option, exact: true }).click()
}
async function selectTheme(page: Page, theme: string) {
  await page.getByRole("button", { name: "Change theme", exact: true }).click()
  await page.getByRole("menuitemradio", { name: theme, exact: true }).click()
}

test("discovery is public and search, filters, sorting and deep links work", async ({ page }, info) => {
  await page.goto("/")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await expect(page.getByRole("heading", { name: "Free browser games" })).toBeVisible()
  await expect(page.locator(".p-games-grid .p-game-card")).toHaveCount(14)
  await expect(page.getByRole("link", { name: "Play Orchard Trail", exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(page.locator(".p-podium-game")).toHaveCount(3)
  if (info.project.name === "desktop") {
    const bounds = await page.locator(".p-podium-game").evaluateAll((cards) =>
      cards.map((card) => {
        const { x, y, width, height, bottom } = card.getBoundingClientRect()
        return { x, y, width, height, bottom }
      })
    )
    expect(bounds[0]!.x).toBeLessThan(bounds[1]!.x)
    expect(bounds[1]!.x).toBe(bounds[2]!.x)
    expect(Math.abs(bounds[0]!.bottom - bounds[2]!.bottom)).toBeLessThan(2)
    expect(bounds[0]!.height).toBeGreaterThan(bounds[1]!.height * 2)
  }
  await expect(page.locator("main")).not.toContainText(/Sample rankings|Playable demo|Cover artwork is illustrative/)
  await page.screenshot({ path: `work/public-home-${info.project.name}.png`, fullPage: true })
  await page.screenshot({ path: `work/public-home-viewport-${info.project.name}.png` })
  await page.getByLabel("Search games").fill("alpine")
  await expect(page.locator(".p-games-grid .p-game-card")).toHaveCount(1)
  await expect(page.getByRole("status")).toContainText("1 game found")
  await page.reload()
  await expect(page.getByLabel("Search games")).toHaveValue("alpine")
  await page.getByRole("button", { name: "Clear filters" }).click()
  await page.getByRole("button", { name: "Filter games", exact: true }).click()
  await page.getByRole("checkbox", { name: "Ready to play", exact: true }).check()
  await page.screenshot({ path: `work/public-filters-${info.project.name}.png` })
  await page.getByRole("button", { name: "Filter games", exact: true }).click()
  await expect(page.locator(".p-games-grid .p-game-card")).toHaveCount(3)
  await selectMenu(page, "Sort games", "Name: A–Z")
  await expect(page.locator(".p-games-grid h3")).toHaveText(["Orchard Trail", "Prism Break", "Starfall Squadron"])
  await page.getByRole("button", { name: "Filter games", exact: true }).click()
  await selectMenu(page, "Game dimension", "3D")
  await page.getByRole("button", { name: "Filter games", exact: true }).click()
  await expect(page.getByRole("heading", { name: "No games found" })).toBeVisible()
  await page.getByRole("button", { name: "Reset filters" }).click()
  await expect(page.locator(".p-games-grid .p-game-card")).toHaveCount(14)
  await page.getByRole("button", { name: "Racing", exact: true }).click()
  await expect(page.locator(".p-games-grid h3")).toHaveText(["Alpine Rally"])
  await page.getByRole("button", { name: "All games", exact: true }).click()
  await page.getByLabel("Search games").pressSequentially("pixi", { delay: 30 })
  await expect(page.getByLabel("Search games")).toHaveValue("pixi")
  await expect(page.locator(".p-games-grid .p-game-card")).toHaveCount(3)
  await page.getByLabel("Find a game", { exact: true }).fill("prism")
  await page.getByRole("button", { name: "Search the catalogue", exact: true }).click()
  await expect(page.locator(".p-games-grid h3")).toHaveText(["Prism Break"])
})

test("game collections, illustrated categories and random play connect discovery", async ({ page }, info) => {
  await page.goto("/?q=snake&rating=4.8")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  const collections = page.getByRole("navigation", { name: "Discover collections" })
  await collections.getByRole("button", { name: "Top rated", exact: true }).click()
  await expect(page.locator(".p-games-grid .p-game-card")).toHaveCount(14)
  await expect(page.locator(".p-games-grid h3").first()).toHaveText("Starfall Squadron")
  await expect(page.locator(".p-games-grid h3").nth(1)).toHaveText("Tiny Treasures")
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("sort") === "rating" && !url.searchParams.has("q") && !url.searchParams.has("rating")
  )
  await expect(collections.getByRole("button", { name: "Top rated", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await page.getByRole("button", { name: "Explore Racing games", exact: true }).click()
  await expect(page.locator(".p-games-grid h3")).toHaveText(["Alpine Rally"])
  await expect(page).toHaveURL((url) => url.searchParams.get("genre") === "Racing")
  await collections.getByRole("button", { name: "Popular", exact: true }).click()
  await expect(page.locator(".p-games-grid .p-game-card")).toHaveCount(14)
  await expect(page.locator(".p-games-grid h3").nth(1)).toHaveText("Orchard Trail")
  await collections.getByRole("button", { name: "New arrivals", exact: true }).click()
  await expect(page.getByRole("combobox", { name: /Sort games/ })).toContainText("Recently added")
  await collections.getByRole("button", { name: "Discover", exact: true }).click()
  await selectTheme(page, "Dark")
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
  await page.screenshot({ path: `work/public-discovery-dark-${info.project.name}.png`, fullPage: true })
  if (info.project.name === "desktop") {
    await page.setViewportSize({ width: 680, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const winner = await page.locator(".podium-0").boundingBox()
    const runner = await page.locator(".podium-1").boundingBox()
    expect(winner!.height).toBeGreaterThan(runner!.height * 2)
    await page.screenshot({ path: "work/public-discovery-tablet.png", fullPage: true })
  }
  await page.getByRole("button", { name: "Play a random game", exact: true }).click()
  await expect(page).toHaveURL(/\/games\/(snake|breakout|space-shooter)$/)
  await expect(page.getByRole("button", { name: "Play now", exact: true })).toBeVisible()
})

test("community filters combine, persist and clear independently", async ({ page }, info) => {
  await page.goto("/#games")
  await page.getByRole("button", { name: "Filter games", exact: true }).click()
  await page.getByRole("radio", { name: "4.8+ stars", exact: true }).check()
  await selectMenu(page, "Minimum reviews", "100+ reviews")
  await expect(page.locator(".p-games-grid h3")).toHaveText(["Starfall Squadron", "Orchard Trail"])
  await page.getByRole("button", { name: "Filter games", exact: true }).click()
  await expect(page).toHaveURL((url) => Number(JSON.parse(url.searchParams.get("rating") ?? "0")) === 4.8)
  await page.reload()
  await expect(page.locator(".p-games-grid h3")).toHaveText(["Starfall Squadron", "Orchard Trail"])
  await page.getByRole("button", { name: "Remove 100+ reviews filter", exact: true }).click()
  await selectMenu(page, "Sort games", "Highest rated")
  await expect(page.locator(".p-games-grid h3")).toHaveText([
    "Starfall Squadron",
    "Tiny Treasures",
    "Orchard Trail",
    "Alpine Rally",
    "Thornwatch"
  ])
  await page.getByRole("button", { name: "Remove 4.8+ stars filter", exact: true }).click()
  await selectMenu(page, "Sort games", "Most reviewed")
  await expect(page.locator(".p-games-grid h3").nth(2)).toHaveText("Prism Break")
  await selectTheme(page, "Dark")
  await page.getByRole("button", { name: "Filter games", exact: true }).click()
  await expect(page.locator(".p-filter-popover")).toHaveCSS("opacity", "1")
  await page.screenshot({ path: `work/public-filters-dark-${info.project.name}.png` })
  await page.getByRole("radio", { name: "4.5+ stars", exact: true }).check()
  await page.getByRole("radio", { name: "4.5+ stars", exact: true }).press("Escape")
  await expect(page.getByRole("button", { name: "Filter games", exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("starter kit download contains the selected compatible standalone project", async ({ page }, info) => {
  await page.goto("/templates?engine=phaser")
  await expect(page.getByRole("radio", { name: "Phaser", exact: true })).toBeChecked()
  await selectMenu(page, "Physics", "Matter.js")
  await page.getByLabel("Project name", { exact: true }).fill("moon-jump")
  await page.getByText("Architecture & telemetry", { exact: true }).click()
  await selectMenu(page, "Entity system", "Koota")
  await selectMenu(page, "Telemetry", "SpawnKit telemetry")
  await page.getByRole("checkbox", { name: "Playwright", exact: true }).check()
  await page.getByRole("checkbox", { name: "Storybook", exact: true }).check()
  await expect(page.getByRole("button", { name: "Download starter kit" })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `work/public-builder-${info.project.name}.png`, fullPage: true })
  const waiting = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download starter kit" }).click()
  const download = await waiting
  expect(download.suggestedFilename()).toBe("moon-jump.zip")
  const path = info.outputPath("moon-jump.zip")
  await download.saveAs(path)
  const files = unzipSync(await readFile(path))
  expect(Object.keys(files).every((file) => file.startsWith("moon-jump/") && !file.includes(".."))).toBe(true)
  const pkg = JSON.parse(strFromU8(files["moon-jump/package.json"]!))
  expect(pkg.name).toBe("moon-jump")
  expect(pkg.dependencies.phaser).toBeTruthy()
  expect(pkg.dependencies.koota).toBeTruthy()
  expect(pkg.dependencies.react).toBeUndefined()
  expect(pkg.devDependencies["@playwright/test"]).toBeTruthy()
  expect(pkg.devDependencies["@storybook/html-vite"]).toBeTruthy()
  expect(files["moon-jump/README.md"]).toBeTruthy()
  expect(files["moon-jump/pnpm-workspace.yaml"]).toBeTruthy()
  await page
    .locator(".p-engine-grid label")
    .filter({ has: page.getByRole("radio", { name: "Three.js", exact: true }) })
    .click()
  await expect(page.getByRole("combobox", { name: /Physics/ })).toContainText("No physics")
  await page.getByRole("combobox", { name: /Physics/ }).click()
  await expect(page.getByRole("option")).toHaveText(["No physics", "Rapier 3D"])
  await page.getByRole("option", { name: "No physics", exact: true }).click()
  await page.getByLabel("Project name", { exact: true }).fill("../existing-folder")
  await expect(page.getByRole("button", { name: "Download starter kit" })).toBeDisabled()
})

for (const slug of ["snake", "breakout", "space-shooter"]) {
  test(`${slug} demo runs with pause, resume and restart`, async ({ page }, info) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`/games/${slug}`)
    await page.getByRole("button", { name: "Play now", exact: true }).click()
    await expect(page.locator("canvas")).toBeVisible()
    await page.getByRole("button", { name: "Pause game", exact: true }).click()
    await expect(page.getByText("Your game is paused.")).toBeVisible()
    await page.getByRole("button", { name: "Resume game", exact: true }).last().click()
    await expect(page.getByText("Your game is paused.")).toHaveCount(0)
    await page.getByRole("button", { name: "Move left", exact: true }).click()
    await page.getByRole("button", { name: "Restart game", exact: true }).click()
    await expect(page.getByText("Score: 0", { exact: true })).toBeVisible()
    await page.screenshot({ path: `work/public-${slug}-${info.project.name}.png`, fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}

test("unreleased games lead to the correct starter engine", async ({ page }) => {
  await page.goto("/games/racing")
  await expect(page.getByRole("heading", { name: "Alpine Rally", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Play now" })).toHaveCount(0)
  await page.getByRole("link", { name: "Get the starter kit", exact: false }).click()
  await expect(page).toHaveURL(/\/templates\?engine=three/)
  await expect(page.getByRole("radio", { name: "Three.js", exact: true })).toBeChecked()
})

test("cloud release walkthrough and pricing calculator are interactive", async ({ page }, info) => {
  await page.goto("/cloud")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await page.getByRole("tab", { name: /Check/ }).click()
  await expect(page.getByRole("tabpanel")).toContainText("Still opens v1.1")
  await page.getByRole("tab", { name: /Check/ }).press("ArrowRight")
  await expect(page.getByRole("tab", { name: /Release/ })).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("tabpanel")).toContainText("v1.2 same artifact")
  await page.getByRole("tab", { name: /Improve/ }).click()
  await expect(page.getByRole("tabpanel")).toContainText("rollback does not undo database changes or player data")
  await expect(page.locator(".p-price-card").filter({ hasText: "Game services" })).toContainText("Coming soon")
  await expect(page.locator(".p-price-card").filter({ hasText: "Multiplayer" })).toContainText("Coming soon")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `work/public-cloud-${info.project.name}.png`, fullPage: true })
  await page.goto("/pricing")
  await expect(page).toHaveURL(/\/cloud#pricing/)
  await expect(page.getByRole("heading", { name: "Cloud pricing", exact: true })).toBeVisible()
  await selectMenu(page, "Game type", "Multiplayer")
  await page.getByRole("checkbox", { name: "Add a Sandbox", exact: true }).check()
  await expect(page.locator(".p-estimate-total")).toContainText("$10")
  await expect(page.locator(".p-cost-result")).toContainText("including idle hours")
  await page.getByRole("checkbox", { name: "Add a Sandbox", exact: true }).uncheck()
  await selectMenu(page, "Game type", "Frontend-only game")
  await expect(page.locator(".p-estimate-total")).toContainText("$0")
  await page.getByText("What does the monthly estimate include?", { exact: true }).click()
  await expect(page.getByText("The estimate includes your game fee", { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `work/public-pricing-${info.project.name}.png`, fullPage: true })
})

test("creator page and responsive navigation connect the public experience", async ({ page }, info) => {
  await page.goto("/create")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await expect(page.getByRole("heading", { name: /Start with a playable game/, level: 1 })).toBeVisible()
  await expect(page.getByText("Desktop games", { exact: true })).toBeVisible()
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `work/public-create-${info.project.name}.png`, fullPage: true })
  await page.screenshot({ path: `work/public-create-viewport-${info.project.name}.png` })
  for (const [name, title] of [
    ["Phaser", "Clockwork Courier"],
    ["Three.js", "Alpine Rally"]
  ]) {
    await page.getByRole("tab", { name: new RegExp(name!) }).click()
    const artwork = page.getByRole("img", { name: `${title} concept artwork` })
    await expect(artwork).toBeVisible()
    await expect.poll(() => artwork.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  }
  await expect(page.getByRole("link", { name: "Build your starter kit", exact: true }).first()).toHaveAttribute(
    "href",
    "/templates?engine=three"
  )
  await expect(page.locator(".mk-terminal-summary")).toContainText("Three.js")
  await expect(page.locator(".c-command-line")).toContainText("pnpm dev:setup")
  await page.getByRole("tab", { name: "Browser tests", exact: true }).click()
  await expect(page.getByRole("tabpanel").filter({ hasText: "Player interactions" })).toContainText(
    "Verify the player collects an item"
  )
  await page.getByRole("button", { name: "Drop objects", exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByRole("button", { name: "Drop objects", exact: true })).toBeEnabled({ timeout: 30000 })
  await page.getByRole("button", { name: "Drop objects", exact: true }).click()
  await expect(page.locator(".physics-demo")).toHaveAttribute("data-state", "falling")
  await expect(page.locator(".physics-demo")).toHaveAttribute("data-state", "settled", { timeout: 18000 })
  await page.locator(".c-physics-card").screenshot({ path: `work/public-physics-${info.project.name}.png` })
  await selectTheme(page, "Dark")
  await page.screenshot({ path: `work/public-create-dark-${info.project.name}.png`, fullPage: true })
  await selectTheme(page, "Light")
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Open menu", exact: true }).click()
    await page
      .getByRole("navigation", { name: "Mobile navigation", exact: true })
      .getByRole("link", { name: "Cloud", exact: true })
      .click()
  } else
    await page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link", { name: "Cloud", exact: true })
      .click()
  await expect(page).toHaveURL(/\/cloud$/)
  await expect(page.getByRole("heading", { name: "Cloud pricing", exact: true })).toBeVisible()
})

test("creator artwork stays still and physics respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/create")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  const scene = page.locator(".mk-game-cover")
  await scene.scrollIntoViewIfNeeded()
  const bounds = (await scene.boundingBox())!
  const before = await scene.boundingBox()
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.45)
  expect(await scene.boundingBox()).toEqual(before)
  expect(await scene.locator("img").evaluate((element) => getComputedStyle(element).animationName)).toBe("none")
  const drop = page.getByRole("button", { name: "Drop objects", exact: true })
  await drop.scrollIntoViewIfNeeded()
  await expect(drop).toBeEnabled({ timeout: 30000 })
  await drop.click()
  await expect(page.locator(".physics-demo")).toHaveAttribute("data-state", "settled")
})

test("dashboard remains protected and legacy dashboard links redirect", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/sign-in/)
  await page.goto("/?view=templates")
  await expect(page).toHaveURL(/\/sign-in/)
  await page.goto("/games/unknown-game")
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
})

test("game feedback is editable, persistent and scoped to the game", async ({ page }, info) => {
  await page.goto("/games/snake")
  await page
    .locator(".p-rating-stars label")
    .filter({ has: page.getByRole("radio", { name: "4 stars", exact: true }) })
    .click()
  await page.getByRole("radio", { name: "4 stars", exact: true }).press("ArrowLeft")
  await expect(page.getByRole("radio", { name: "3 stars", exact: true })).toBeChecked()
  await page.getByRole("radio", { name: "3 stars", exact: true }).press("ArrowRight")
  await page.getByRole("button", { name: "Save rating", exact: true }).click()
  await expect(page.locator(".p-community").getByRole("status")).toContainText("Rating saved")
  await page.getByLabel("Leave feedback").fill("The touch controls are easy to use.")
  await page.getByRole("button", { name: "Save comment", exact: false }).click()
  await expect(page.locator(".p-comment-draft")).toContainText("The touch controls are easy to use.")
  await page.reload()
  await expect(page.getByRole("radio", { name: "4 stars", exact: true })).toBeChecked()
  await expect(page.locator(".p-comment-draft")).toContainText("The touch controls are easy to use.")
  await expect(page.getByText("124 reviews").first()).toBeVisible()
  await page.getByRole("button", { name: "Edit comment", exact: true }).click()
  await page.getByLabel("Leave feedback").fill("Add a clearer game-over screen.")
  await page.getByRole("button", { name: "Save comment", exact: false }).click()
  await expect(page.locator(".p-comment-draft")).toContainText("Add a clearer game-over screen.")
  await page.locator(".p-community").screenshot({ path: `work/public-community-${info.project.name}.png` })
  await page.goto("/games/breakout")
  await expect(page.getByLabel("Leave feedback")).toHaveValue("")
  await expect(page.getByRole("radio", { name: "4 stars", exact: true })).not.toBeChecked()
  await page.goto("/games/snake")
  await page.getByRole("button", { name: "Delete comment", exact: true }).click()
  await page.getByRole("button", { name: "Remove rating", exact: true }).click()
  await page.reload()
  await expect(page.getByLabel("Leave feedback")).toHaveValue("")
  await expect(page.getByRole("radio", { name: "4 stars", exact: true })).not.toBeChecked()
})

test("unreadable feedback is preserved and storage failures never report success", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("spawn:game-feedback:v1:snake", "unreadable"))
  await page.goto("/games/snake")
  await expect(page.getByRole("alert")).toContainText("left unchanged")
  await expect(page.getByLabel("Leave feedback")).toBeDisabled()
  expect(await page.evaluate(() => localStorage.getItem("spawn:game-feedback:v1:snake"))).toBe("unreadable")
  await page.goto("/games/breakout")
  await expect(page.getByLabel("Leave feedback")).toBeEnabled()
  await page.getByLabel("Leave feedback").fill("Keep this draft if storage fails.")
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Quota exceeded")
    }
  })
  await page.getByRole("button", { name: "Save comment", exact: false }).click()
  await expect(page.getByRole("alert")).toContainText("could not be saved")
  await expect(page.getByLabel("Leave feedback")).toHaveValue("Keep this draft if storage fails.")
  await expect(page.locator(".p-comment-draft")).toHaveCount(0)
})

test("theme, shared branding, footer destinations and reduced motion work", async ({ page }, info) => {
  await page.goto("/")
  await selectTheme(page, "Dark")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect(page.locator(".p-header").getByLabel("SpawnKit home")).toHaveText("SpawnKit.")
  await expect(page.locator(".p-header .lucide-zap")).toHaveCount(1)
  await page.screenshot({ path: `work/public-home-dark-${info.project.name}.png`, fullPage: true })
  await selectTheme(page, "Light")
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.goto("/create")
  await expect(page.locator(".p-device-card")).toHaveCount(3)
  await page.locator(".p-platform-showcase").screenshot({ path: `work/public-devices-${info.project.name}.png` })
  await page.emulateMedia({ reducedMotion: "reduce" })
  expect(await page.locator(".mk-game-cover").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    "0s"
  )
  expect(
    await page
      .locator(".p-device")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration)
  ).toBe("0s")
  await page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "About", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "About SpawnKit", exact: true })).toBeVisible()
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "Getting started", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "Run a starter kit" })).toBeVisible()
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "Community guidelines", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "Community guidelines", exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("company footer links contact details and the published privacy policy", async ({ page }, info) => {
  await page.goto("/")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await page.locator(".p-company-footer").screenshot({ path: `work/public-footer-${info.project.name}.png` })
  await page
    .getByRole("navigation", { name: "Social links", exact: true })
    .getByRole("link", { name: "GitHub", exact: true })
    .click()
  await expect(page).toHaveURL(/\/contact#github/)
  await expect(page.getByText("github.com/spawnkit", { exact: true })).toBeVisible()
  await page
    .getByRole("navigation", { name: "Legal", exact: true })
    .getByRole("link", { name: "Privacy policy", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "Privacy policy", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Retention and deletion", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "hello@spawnkit.cloud", exact: true }).first()).toHaveAttribute(
    "href",
    "mailto:hello@spawnkit.cloud"
  )
  await expect(page.getByText("Draft placeholder", { exact: true })).toHaveCount(0)
  await expect(page.locator("article")).not.toContainText("ajcraswell@gmail.com")
  await expect(page.locator("article")).not.toContainText("Review notes")
  await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `work/privacy-policy-${info.project.name}.png` })
  await page
    .getByRole("navigation", { name: "Legal", exact: true })
    .getByRole("link", { name: "Terms of service", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "Terms of service", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Your games and content", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Responsibility and legal rights", exact: true })).toBeVisible()
  await expect(page.getByText("Policy content coming soon", { exact: true })).toHaveCount(0)
  await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(0)
  await expect(page.locator("article").getByRole("link", { name: "privacy policy", exact: true })).toHaveAttribute(
    "href",
    "/privacy"
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
