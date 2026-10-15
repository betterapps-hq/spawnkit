import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

async function open(page: Page, story = "frontend", api = false) {
  await page.goto(
    `${testOrigins().stories}/iframe.html?id=project-dashboard-connected-deployments--${story}&viewMode=story${api ? "&args=useApi:true" : ""}`
  )
  await expect(page.getByRole("heading", { name: "Deployments", exact: true })).toBeVisible()
}
async function inspect(page: Page, id: string) {
  await page.locator(`.react-flow__node[data-id="${id}"]`).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog")).toBeVisible()
}

test("connected promotion uses the reviewed source and production version, then supports rollback", async ({
  page
}, info) => {
  await open(page)
  await expect(page.locator(".react-flow__node")).toHaveCount(3)
  await expect(page.getByRole("button", { name: /Game client Release deployed/ })).toHaveCount(2)
  await page.getByRole("button", { name: "Promote", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByLabel("Source release")).toContainText("Staging")
  await expect(dialog.getByLabel("Source release")).toContainText("v1.8.0")
  await expect(dialog.getByLabel("Current production release")).toContainText("v1.7.2")
  await expect(dialog.getByRole("tab", { name: "Commits 5" })).toBeVisible()
  await expect(dialog.getByRole("link", { name: "View commit 8e3a9c2 on GitHub", exact: true })).toHaveAttribute(
    "href",
    "https://github.com/studio/thornwatch/commit/8e3a9c2"
  )
  await page.screenshot({
    path: `work/connected-release-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
  await dialog.getByRole("button", { name: "Confirm promotion" }).click()
  await expect(dialog.getByText("Deployment request accepted.", { exact: false })).toBeVisible()
  await expect(page.getByTestId("deployment-action")).toHaveText(
    JSON.stringify({
      kind: "promote",
      projectId: "connected-project",
      values: { versionId: "v1.8.0", environment: "production", expectedVersionId: "v1.7.2" }
    })
  )
  await dialog.getByRole("button", { name: "Done" }).click()
  await expect(page.locator('.react-flow__node[data-id="production"]')).toContainText("v1.8.0")
  await page.getByRole("button", { name: "Rollback", exact: true }).click()
  await expect(page.getByRole("tab", { name: "Commits 5" })).toBeVisible()
  await page.getByRole("button", { name: "Confirm rollback" }).click()
  await expect(page.getByTestId("deployment-action")).toContainText('"expectedVersionId":"v1.8.0"')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test("preview deletion uses the event ID and leaves retained releases available", async ({ page }) => {
  await open(page)
  await inspect(page, "preview-18427")
  await page.getByRole("button", { name: "Delete preview", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Delete preview", exact: true })
  await expect(dialog).toContainText("The GitHub pull request stays open")
  await dialog.getByRole("button", { name: "Delete preview", exact: true }).click()
  await expect(page.getByTestId("deployment-action")).toContainText('"previewId":"github-event-18427"')
  await dialog.getByRole("button", { name: "Back to project" }).click()
  await expect(page.locator('.react-flow__node[data-id="preview-18427"]')).toHaveCount(0)
  await page.getByRole("tab", { name: "Releases", exact: true }).click()
  await expect(page.locator(".dm-live-release-row")).toHaveCount(3)
})

test("the graph chooser and dashboard destinations reuse existing release and environment pages", async ({ page }) => {
  await open(page)
  await page.getByRole("button", { name: "Change production release" }).click()
  await page.getByRole("button", { name: "v1.8.0", exact: true }).click()
  await page.getByRole("button", { name: "Open in dashboard" }).click()
  await expect(page.getByRole("heading", { name: "v1.8.0", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "All versions", exact: true }).click()
  await expect(page.getByRole("tab", { name: "Releases", exact: true })).toHaveAttribute("aria-selected", "true")
  await page.getByRole("tab", { name: "Environments", exact: true }).click()
  await inspect(page, "staging")
  await page.getByRole("button", { name: "Open in dashboard" }).click()
  await expect(page.getByRole("button", { name: "Deployment map", exact: true })).toBeVisible()
  await expect(page.getByText("PR previews", { exact: true })).toHaveCount(0)
  await page
    .getByRole("navigation", { name: "Project navigation" })
    .getByRole("button", { name: "Overview", exact: true })
    .click()
  await page.getByRole("button", { name: "View all", exact: true }).click()
  await expect(page.getByRole("tab", { name: "Releases", exact: true })).toHaveAttribute("aria-selected", "true")
})

test("unavailable runtime controls stay honest and empty projects have a setup path", async ({ page }, info) => {
  await open(page, "configured-infrastructure")
  await expect(page.locator('.react-flow__node[data-id="production"]')).toContainText("Not provisioned")
  await expect(page.getByRole("button", { name: "Promote", exact: true })).toBeDisabled()
  await inspect(page, "production")
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Game servers/ })
    .click()
  await expect(page.getByRole("button", { name: "Scale up", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Scale out", exact: true })).toBeDisabled()
  await expect(page.getByRole("dialog")).toContainText("saved resource settings")
  await open(page, "empty-project")
  await expect(page.getByRole("button", { name: "Configure GitHub", exact: true })).toBeEnabled()
  await expect(page.getByRole("button", { name: "Enable Staging", exact: true })).toBeEnabled()
  await page.screenshot({
    path: `work/connected-empty-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  })
})

test("GitHub failures and failed mutations never fabricate deployment success", async ({ page }) => {
  let requests = 0
  await page.route("**/release-changes?*", async (route) => {
    requests++
    expect(new URL(route.request().url()).searchParams.get("from")).toBe("v1.7.2")
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "GitHub could not load this comparison." } })
    })
  })
  await open(page, "frontend", true)
  await page.getByRole("button", { name: "Promote", exact: true }).click()
  await expect(page.getByRole("dialog")).toContainText("GitHub could not load this comparison")
  await expect(page.getByRole("button", { name: "Confirm promotion" })).toBeDisabled()
  await page.getByRole("button", { name: "Retry changes" }).click()
  await expect.poll(() => requests).toBe(2)
  await open(page, "request-conflict")
  await page.getByRole("button", { name: "Promote", exact: true }).click()
  await expect(page.getByRole("button", { name: "Confirm promotion" })).toBeEnabled()
  await page.getByRole("button", { name: "Confirm promotion" }).click()
  await expect(page.getByRole("dialog")).toContainText("The environment changed")
  await expect(page.getByRole("dialog").getByLabel("Current production release")).toContainText("v1.7.2")
  await expect(page.getByText("Deployment request accepted.", { exact: false })).toHaveCount(0)
})

test("a production change invalidates the reviewed comparison until refreshed", async ({ page }) => {
  await open(page, "production-changes")
  await page.getByRole("button", { name: "Promote", exact: true }).click()
  await expect(page.getByRole("dialog")).toContainText("Production changed while you were reviewing")
  await expect(page.getByRole("button", { name: "Confirm promotion" })).toBeDisabled()
  await expect(page.getByLabel("Current production release")).toContainText("v1.7.2")
  await page.getByRole("button", { name: "Review current production" }).click()
  await expect(page.getByLabel("Current production release")).toContainText("v1.7.1")
  await expect(page.getByRole("button", { name: "Confirm promotion" })).toBeEnabled()
  await page.getByRole("button", { name: "Confirm promotion" }).click()
  await expect(page.getByTestId("deployment-action")).toContainText('"expectedVersionId":"v1.7.1"')
})

test("read-only projects expose details without enabling mutations", async ({ page }) => {
  await open(page, "read-only")
  await expect(page.getByRole("button", { name: "Promote", exact: true })).toBeDisabled()
  await inspect(page, "preview-18427")
  await expect(page.getByRole("button", { name: "Delete preview", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Rebuild", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Open in dashboard", exact: true })).toBeEnabled()
})

test("preview builds stay independent and release choices follow current placement rather than build origin", async ({
  page
}) => {
  await open(page, "concurrent-preview")
  await expect(page.locator('.react-flow__node[data-id="preview-18427"]')).toContainText("Building")
  await expect(page.getByRole("button", { name: "Promote", exact: true })).toBeEnabled()
  await page.getByRole("tab", { name: "Releases", exact: true }).click()
  await page.getByRole("button", { name: "v1.9.0", exact: true }).click()
  await expect(page.getByRole("heading", { name: "v1.9.0", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "All versions", exact: true }).click()
  await page.getByRole("tab", { name: "Releases", exact: true }).click()
  await page.getByRole("button", { name: "v1.8.0", exact: true }).click()
  await expect(page.getByRole("dialog").getByLabel("Source release")).toContainText("Staging")
  await expect(page.getByRole("button", { name: "Confirm promotion" })).toBeEnabled()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await page.getByRole("button", { name: "v1.7.1", exact: true }).click()
  await expect(page.getByRole("button", { name: "Confirm rollback" })).toBeEnabled()
})
