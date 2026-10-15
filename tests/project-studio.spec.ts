import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

async function story(page: Page, id: string) {
  await page.goto(`${testOrigins().stories}/iframe.html?id=project-dashboard-${id}&viewMode=story`)
  await expect(page.locator("main")).toBeVisible()
}
async function navigate(page: Page, name: string) {
  const mobileMenu = page.getByRole("button", { name: "Expand navigation" })
  if (page.viewportSize()!.width < 1024) await mobileMenu.click()
  await page.getByRole("navigation", { name: "Project navigation" }).getByRole("button", { name, exact: true }).click()
}

test("project dashboard navigates between real page components and creates a project request", async ({
  page
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await story(page, "projects--all-projects")
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible()
  await page.getByRole("textbox", { name: "Search projects", exact: true }).fill("Iron Frontier")
  await expect(page.getByRole("heading", { name: "Clockwork Courier", exact: true })).toHaveCount(0)
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Iron Frontier", exact: true }) })
    .click()
  await expect(page.getByRole("heading", { name: "Iron Frontier", exact: true })).toBeVisible()
  await expect(page.getByText("3 regions", { exact: true })).toBeVisible()
  await page.screenshot({
    path: `work/studio-overview-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await navigate(page, "Dashboard")
  await page.getByRole("button", { name: "Create project", exact: true }).first().click()
  await expect(page.getByRole("heading", { name: "Create a project", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Enter a project name")
  await page.getByLabel("Project name", { exact: true }).fill("Emberline")
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Create project", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Emberline is ready", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Open project", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Emberline", exact: true })).toBeVisible()
  await expect(page.getByText("Ready for your first deployment", { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test("promotion and rollback review the artifact and prevent unavailable operations", async ({ page }, testInfo) => {
  await story(page, "overview--multiplayer")
  await page.getByRole("button", { name: "Promote", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toContainText("v24")
  await expect(dialog).toContainText("v23 → v24")
  await page.screenshot({ path: `work/studio-promotion-${testInfo.project.name}.png`, animations: "disabled" })
  await dialog.getByRole("button", { name: "Promote version" }).click()
  await expect(dialog.getByRole("heading", { name: "Request submitted" })).toBeVisible()
  await dialog.getByRole("button", { name: "Back to project" }).click()
  await page.getByRole("button", { name: "Rollback", exact: true }).click()
  await expect(dialog.getByRole("radio", { name: "Version v23", exact: true })).toBeChecked()
  await expect(dialog.getByRole("radio", { name: "Version v20", exact: true })).toBeDisabled()
  await expect(dialog.getByRole("radio", { name: "Version v19", exact: true })).toBeDisabled()
  await dialog.getByRole("button", { name: "Roll back to version", exact: true }).click()
  await expect(dialog.getByRole("heading", { name: "Request submitted" })).toBeVisible()
  await story(page, "deployments--promotion-blocked")
  await expect(page.getByRole("dialog").getByRole("button", { name: "Promote version" })).toBeDisabled()
  await story(page, "deployments--request-failed")
  await page.getByRole("dialog").getByRole("button", { name: "Promote version" }).click()
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Simulated request failure")
})

test("deployments filter history and expose failed build diagnostics", async ({ page }) => {
  await story(page, "deployments--history")
  await page.getByRole("combobox", { name: "Version status" }).click()
  await page.getByRole("option", { name: "Failed", exact: true }).click()
  await expect(page.getByText("2 versions", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Update physics integration/ }).click()
  await page.getByRole("tab", { name: "Build logs", exact: true }).click()
  await expect(page.locator("main")).toContainText("Build exited with code 1.")
  await page.getByRole("button", { name: "All versions" }).click()
  await page.getByLabel("Search versions").fill("not-found")
  await expect(page.getByRole("heading", { name: "No matching versions" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("logs filter and pause; player details distinguish active and banned accounts", async ({ page }, testInfo) => {
  await story(page, "management--logs")
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await expect(page.getByText("Stream paused", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Resume", exact: true }).click()
  await page.getByRole("combobox", { name: "Log level" }).click()
  await page.getByRole("option", { name: "Errors", exact: true }).click()
  await expect(page.getByText("1 entry", { exact: true })).toBeVisible()
  await page.screenshot({ path: `work/studio-logs-${testInfo.project.name}.png`, animations: "disabled" })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await navigate(page, "Users")
  await page.getByLabel("Search players").fill("River")
  await expect(page.getByRole("row")).toHaveCount(2)
  await page.getByRole("button", { name: "View River" }).click()
  await expect(page.getByRole("dialog", { name: "Player details" })).toContainText("Restoring access")
  await page.getByRole("button", { name: "Restore access", exact: true }).click()
  await expect(page.getByRole("dialog", { name: "Player details" })).toContainText("Moderation request submitted.")
})

test("backend edits are independent by environment and viewers cannot change them", async ({ page }, testInfo) => {
  await story(page, "management--backend-multiple-regions")
  const compute = page.getByRole("combobox", { name: "New Jersey compute" })
  await compute.click()
  await page.getByRole("option", { name: "2 vCPU / 4 GB", exact: true }).click()
  await page.getByRole("tab", { name: "Sandbox", exact: true }).click()
  await expect(compute).toHaveText("1 vCPU / 2 GB")
  await page.getByRole("button", { name: "Add region", exact: true }).click()
  await page.getByRole("button", { name: "Add to configuration", exact: true }).click()
  await expect(page.getByRole("combobox", { name: "Amsterdam compute" })).toBeVisible()
  await page.getByRole("tab", { name: "Production", exact: true }).click()
  await expect(compute).toHaveText("2 vCPU / 4 GB")
  await expect(page.getByRole("combobox", { name: "Amsterdam compute" })).toHaveCount(0)
  await page.getByRole("button", { name: "Save configuration", exact: true }).click()
  await expect(page.getByText(/Configuration saved/)).toBeVisible()
  await page.screenshot({
    path: `work/studio-backend-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await story(page, "management--backend-read-only")
  await expect(page.getByRole("button", { name: "Save configuration", exact: true })).toBeDisabled()
  await expect(page.getByRole("combobox", { name: "New Jersey compute" })).toBeDisabled()
  await page.getByRole("tab", { name: "Sandbox", exact: true }).click()
  await expect(page.getByRole("combobox", { name: "New Jersey compute" })).toHaveText("1 vCPU / 2 GB")
})

test("settings validate names, retain failed edits, and protect read-only access", async ({ page }) => {
  await story(page, "management--settings")
  await page.getByLabel("Project name", { exact: true }).fill(" ")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("between 1 and 64")
  await page.getByLabel("Project name", { exact: true }).fill("Thornwatch II")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByText("Settings saved.", { exact: true })).toBeVisible()
  await story(page, "management--settings-save-failed")
  await page.getByLabel("Project name", { exact: true }).fill("Retain this edit")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Your edits are still here")
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Retain this edit")
  await story(page, "management--settings-read-only")
  await expect(page.getByLabel("Project name", { exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled()
})

test("a PR version moves to Sandbox then production without changing its artifact", async ({ page }, testInfo) => {
  await story(page, "pr-previews--open-pull-requests")
  const ready = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Rework the frost mage abilities", exact: true }) })
  await ready.getByRole("button", { name: "To Sandbox", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Deploy version to Sandbox", exact: true })
  await expect(dialog).toContainText("v24 → v26")
  await dialog.getByRole("button", { name: "Deploy to Sandbox", exact: true }).click()
  await dialog.getByRole("button", { name: "Back to project" }).click()
  await ready.getByRole("button", { name: "Inspect v26", exact: true }).click()
  await expect(page.getByRole("heading", { name: "v26", exact: true })).toBeVisible()
  const digest = await page.locator("code").filter({ hasText: "sha256:" }).innerText()
  await page.getByRole("button", { name: "Promote version", exact: true }).click()
  const promotion = page.getByRole("dialog", { name: "Promote to production" })
  await expect(promotion).toContainText("v23 → v26")
  await expect(promotion.getByRole("radio", { name: "Let rooms finish", exact: true })).toBeChecked()
  await promotion.getByRole("button", { name: "Promote version", exact: true }).click()
  await promotion.getByRole("button", { name: "Back to project" }).click()
  await expect(page.getByRole("button", { name: "Current production", exact: true })).toBeDisabled()
  await expect(page.locator("code").filter({ hasText: "sha256:" })).toHaveText(digest)
  await page.screenshot({
    path: `work/version-details-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
  await page.getByRole("button", { name: "Compare", exact: true }).click()
  await page.getByRole("combobox", { name: "Compare from version" }).click()
  await page.getByRole("option", { name: "v23 / a8f21b0", exact: true }).click()
  await expect(page.getByRole("row").filter({ hasText: "Commit" })).toContainText("a8f21b0")
  await page.getByRole("button", { name: "All versions" }).click()
  await page.getByRole("tab", { name: "Activity", exact: true }).click()
  await expect(page.getByText("draining", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("84 players", { exact: true })).toBeVisible()
})

test("rollback can select a retained version that has never been in production", async ({ page }) => {
  await story(page, "deployments--history")
  await page.getByRole("button", { name: "Rollback", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "Roll back production", exact: true })
  await dialog.getByLabel("Find a version", { exact: true }).fill("18")
  await dialog.getByRole("radio", { name: "Version v18", exact: true }).check()
  await expect(dialog).toContainText("v23 → v18")
  await dialog.getByRole("button", { name: "Roll back to version", exact: true }).click()
  await dialog.getByRole("button", { name: "Back to project" }).click()
  await page.getByRole("button", { name: "v18", exact: true }).first().click()
  await expect(page.getByRole("button", { name: "Current production", exact: true })).toBeDisabled()
  await expect(page.getByText("rollback to production", { exact: false })).toBeVisible()
})

test("PR cleanup is separate from version retention, and outdated previews cannot be staged", async ({
  page
}, testInfo) => {
  await story(page, "pr-previews--open-pull-requests")
  await page.getByRole("button", { name: "Preview 41 actions", exact: true }).click()
  await page.getByRole("menuitem", { name: "Close preview environment", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Delete preview", exact: true })
  await expect(dialog).toContainText("The GitHub pull request stays open")
  await dialog.getByRole("button", { name: "Delete preview", exact: true }).click()
  await dialog.getByRole("button", { name: "Back to project" }).click()
  await expect(page.getByRole("article").filter({ hasText: "Rework the frost mage abilities" })).toContainText(
    "closing"
  )
  await page.getByRole("tab", { name: /Versions/ }).click()
  await expect(page.getByRole("button", { name: "v26", exact: true })).toBeVisible()
  await story(page, "pr-previews--new-commit-pending")
  await expect(page.getByRole("button", { name: "To Sandbox", exact: true })).toBeDisabled()
  await page.screenshot({
    path: `work/pr-previews-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
