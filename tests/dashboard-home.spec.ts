import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

async function openStory(page: Page, name: string) {
  await page.goto(`${testOrigins().stories}/iframe.html?id=project-dashboard-projects--${name}&viewMode=story`)
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible()
}
const projectCards = (page: Page) =>
  page
    .getByRole("region", { name: "Your projects", exact: true })
    .getByRole("button")
    .filter({ has: page.locator("h3") })

test("home filters combine with search and work in grid and list layouts", async ({ page }, testInfo) => {
  await openStory(page, "all-projects")
  await expect(projectCards(page)).toHaveCount(5)
  const statuses = page.getByRole("group", { name: "Filter projects by status" })
  await statuses.getByRole("button", { name: "In production 4", exact: true }).click()
  await expect(projectCards(page)).toHaveCount(4)
  await statuses.getByRole("button", { name: "Not deployed 1", exact: true }).click()
  await expect(projectCards(page)).toHaveCount(1)
  await expect(page.getByRole("heading", { name: "Relic Run", exact: true })).toBeVisible()
  await page.getByRole("textbox", { name: "Search projects", exact: true }).fill("Clockwork")
  await expect(page.getByRole("heading", { name: "No matching projects" })).toBeVisible()
  await page.getByRole("button", { name: "Reset filters" }).click()
  await expect(projectCards(page)).toHaveCount(5)
  await page.screenshot({ path: `work/home-grid-${testInfo.project.name}.png`, fullPage: true, animations: "disabled" })
  await page.getByRole("button", { name: "List view", exact: true }).click()
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(projectCards(page)).toHaveCount(5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `work/home-list-${testInfo.project.name}.png`, fullPage: true, animations: "disabled" })
  await page.getByRole("textbox", { name: "Search projects", exact: true }).fill("studio/iron-frontier")
  await expect(projectCards(page)).toHaveCount(1)
  await projectCards(page).click()
  await expect(page.getByRole("heading", { name: "Iron Frontier", exact: true })).toBeVisible()
})

test("home attention filter surfaces the affected project", async ({ page }) => {
  await openStory(page, "needs-attention")
  await page
    .getByRole("group", { name: "Filter projects by status" })
    .getByRole("button", { name: "Needs attention 1", exact: true })
    .click()
  await expect(projectCards(page)).toHaveCount(1)
  await expect(page.getByRole("heading", { name: "Iron Frontier", exact: true })).toBeVisible()
})

test("single project has an actionable scaffold command and adapts to dark mode", async ({ page }, testInfo) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          document.documentElement.dataset.copiedCommand = value
        }
      }
    })
  )
  await openStory(page, "single-project")
  const next = page.getByRole("complementary", { name: "Project next step" })
  await expect(next).toContainText(
    "npx @spawnkit/cli init mosslight --add pixi,no-physics,html-ui,no-telemetry,vitest,no-ecs"
  )
  await next.getByRole("button", { name: "Copy project command", exact: true }).click()
  await expect(next.getByRole("button", { name: "Command copied", exact: true })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute(
    "data-copied-command",
    "npx @spawnkit/cli init mosslight --add pixi,no-physics,html-ui,no-telemetry,vitest,no-ecs"
  )
  await page.screenshot({
    path: `work/home-single-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveClass(/dark/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: `work/home-single-dark-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
  await next.getByRole("button", { name: "Review configuration" }).click()
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Mosslight")
})

test("home starter shortcuts preselect their engine and generic creation resets the choice", async ({
  page
}, testInfo) => {
  await openStory(page, "empty")
  await expect(page.getByRole("heading", { name: "Your first game starts here" })).toBeVisible()
  await page.screenshot({
    path: `work/home-empty-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
  for (const engine of ["PixiJS", "Phaser", "Babylon.js", "Three.js"]) {
    await page.getByRole("button", { name: `Create with ${engine}`, exact: true }).click()
    await expect(page.getByRole("button", { name: `Select ${engine}`, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
  }
  await page.getByRole("button", { name: "Create project", exact: true }).first().click()
  await expect(page.getByRole("button", { name: "Select PixiJS", exact: true })).toHaveAttribute("aria-pressed", "true")
})
