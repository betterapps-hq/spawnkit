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
  const preview = page.locator(".p-file-preview")
  await preview.locator("summary").click()
  await expect(preview.locator("li").filter({ hasText: "playwright.config.ts" })).toHaveCount(1)
  await page.getByRole("checkbox", { name: "Playwright", exact: true }).uncheck()
  await expect(preview.getByRole("status")).toContainText("files in your starter kit")
  await expect(preview.locator("li").filter({ hasText: "playwright.config.ts" })).toHaveCount(0)
  await page.getByRole("checkbox", { name: "Playwright", exact: true }).check()
  await expect(preview.locator("li").filter({ hasText: "playwright.config.ts" })).toHaveCount(1)
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
  expect(await preview.locator("li").allTextContents()).toEqual(
    Object.keys(files).map((file) => file.slice("moon-jump/".length))
  )
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

test("builder loads archive tools on demand and recovers from a failed load", async ({ page }) => {
  let archiveRequests = 0
  await page.route("**/*project-archive*", async (route) => {
    archiveRequests++
    if (archiveRequests === 1) await route.abort("failed")
    else await route.continue()
  })
  await page.goto("/templates")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  expect(archiveRequests).toBe(0)
  await page.getByRole("button", { name: "Download starter kit", exact: true }).click()
  await expect(page.locator(".p-download-notice")).toContainText("Reload the page and try again")
  await expect(page.getByRole("button", { name: "Download starter kit", exact: true })).toBeEnabled()
  expect(archiveRequests).toBe(1)
  await page.reload()
  const waiting = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download starter kit", exact: true }).click()
  expect((await waiting).suggestedFilename()).toBe("my-first-game.zip")
  expect(archiveRequests).toBeGreaterThan(1)
})

test("cloud workflow and machine pricing are interactive", async ({ page }, info) => {
  await page.goto("/cloud")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  const workflow = page.locator(".mk-release-walkthrough")
  await page.getByRole("tab", { name: "Test", exact: true }).click()
  await expect(workflow.getByRole("tabpanel")).toContainText("Checkpoint restores player position")
  await page.getByRole("tab", { name: "Test", exact: true }).press("ArrowRight")
  await expect(page.getByRole("tab", { name: "Deploy", exact: true })).toHaveAttribute("aria-selected", "true")
  await workflow.getByRole("button", { name: "Promote", exact: true }).click()
  await expect(workflow.getByRole("tabpanel")).toContainText("The same tested build goes live, without rebuilding.")
  await page.getByRole("tab", { name: "Monitor", exact: true }).click()
  await expect(workflow.getByRole("tabpanel")).toContainText("preferred AI agent")
  await expect(workflow.getByRole("tabpanel")).toContainText("Player position: missing")
  await expect(page.locator("#services")).toContainText("Coming soon")
  await expect(page.locator("#services")).toContainText("Cloud saves")
  await expect(page.locator("#services")).toContainText("Leaderboards")
  await expect(
    page.locator(".p-price-card").filter({ has: page.getByRole("heading", { name: "Multiplayer", exact: true }) })
  ).toContainText("Sandbox included")
  for (const cta of await page.getByRole("link", { name: "Open dashboard", exact: true }).all()) {
    await expect(cta.locator("svg")).toHaveCount(0)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `work/public-cloud-${info.project.name}.png`, fullPage: true })
  await page.goto("/cloud#pricing")
  await expect(page).toHaveURL(/\/cloud#pricing/)
  await expect(page.getByRole("heading", { name: "Cloud pricing", exact: true })).toBeVisible()
  await expect(page.locator(".p-estimate-total")).toHaveText("$30.44")
  await page.getByRole("spinbutton", { name: "Sandbox hours / month" }).fill("100")
  await expect(page.locator(".p-estimate-total")).toHaveText("$32.54")
  const region = page.getByRole("article", { name: "New Jersey", exact: true })
  await region.getByRole("combobox", { name: "Machine size", exact: true }).click()
  await page.getByRole("option", { name: "2 vCPU / 4 GB RAM", exact: true }).click()
  await expect(page.locator(".p-estimate-total")).toHaveText("$53.47")
  await page.getByRole("spinbutton", { name: "Sandbox hours / month" }).fill("745")
  await expect(page.getByRole("alert")).toHaveText("Enter hours from 0 to 744 for each environment in New Jersey.")
  await expect(page.locator(".p-estimate-total")).toHaveCount(0)
  await page.getByRole("spinbutton", { name: "Sandbox hours / month" }).fill("0")
  await page.getByText("Does Sandbox cost extra with multiplayer?", { exact: true }).click()
  await expect(page.getByText("No. Sandbox is included in the $10 multiplayer bundle.", { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `work/public-pricing-${info.project.name}.png`, fullPage: true })
})

test("creator page and responsive navigation connect the public experience", async ({ page }, info) => {
  // It drives every scene on the page and takes full-page screenshots, which is slow with software WebGL, as in CI.
  test.setTimeout(90_000)
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
  await expect(page.getByRole("link", { name: "Start with a kit", exact: true }).first()).toHaveAttribute(
    "href",
    "/templates?engine=three"
  )
  await expect(page.locator(".mk-terminal-summary")).toContainText("Three.js")
  await expect(page.locator(".c-command-line")).toContainText("pnpm dev:setup")
  await page.getByRole("tab", { name: "Browser tests", exact: true }).click()
  await expect(page.getByRole("tabpanel").filter({ hasText: "Player interactions" })).toContainText(
    "Verify the player collects an item"
  )
  await page.getByRole("button", { name: "Release marbles", exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByRole("button", { name: "Release marbles", exact: true })).toBeEnabled({ timeout: 30000 })
  await page.getByRole("button", { name: "Release marbles", exact: true }).click()
  await expect(page.locator(".physics-demo")).toHaveAttribute("data-state", "falling")
  await expect(page.locator(".physics-demo")).toHaveAttribute("data-state", "settled", { timeout: 18000 })
  await page.locator(".c-physics-stage").screenshot({ path: `work/public-physics-${info.project.name}.png` })
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
  const drop = page.getByRole("button", { name: "Release marbles", exact: true })
  await drop.scrollIntoViewIfNeeded()
  await expect(drop).toBeEnabled({ timeout: 30000 })
  await drop.click()
  await expect(page.locator(".physics-demo")).toHaveAttribute("data-state", "settled")
})

test("dashboard remains protected and unsupported routes show recovery", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/sign-in/)
  await page.goto("/?view=templates")
  await expect(page).toHaveURL(/\/\?view=templates/)
  await page.goto("/games/unknown-game")
  await expect(page.getByRole("heading", { name: "Game not found" })).toBeVisible()
})

test("theme, shared branding, footer destinations and reduced motion work", async ({ page }, info) => {
  await page.goto("/")
  await selectTheme(page, "Dark")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect(page.locator(".p-header").getByLabel("SpawnKit home")).toHaveText("SpawnKit")
  await expect(page.locator(".p-header .lucide-zap")).toHaveCount(1)
  await page.screenshot({ path: `work/public-home-dark-${info.project.name}.png`, fullPage: true })
  await selectTheme(page, "Light")
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.goto("/create")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await expect(page.locator(".c-laptop, .c-phone")).toHaveCount(2)
  await page.locator(".p-platform-showcase").screenshot({ path: `work/public-devices-${info.project.name}.png` })
  await page.emulateMedia({ reducedMotion: "reduce" })
  expect(await page.locator(".mk-game-cover").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    "0s"
  )
  expect(
    await page
      .locator(".c-laptop")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration)
  ).toBe("0s")
  await page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "About SpawnKit", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "About SpawnKit", exact: true })).toBeVisible()
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "Build your first game", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "Build your first game", exact: true })).toBeVisible()
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
  await expect(page.getByRole("navigation", { name: "Social links", exact: true })).toHaveCount(0)
  await page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "Contact", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "Contact", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "hello@spawnkit.cloud", exact: true })).toHaveAttribute(
    "href",
    "mailto:hello@spawnkit.cloud"
  )
  await page
    .getByRole("navigation", { name: "Legal", exact: true })
    .getByRole("link", { name: "Privacy policy", exact: true })
    .click()
  // The page loads on demand, and a cold dev server compiles it on this first visit.
  await expect(page.getByRole("heading", { name: "Privacy policy", exact: true })).toBeVisible({ timeout: 15_000 })
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
