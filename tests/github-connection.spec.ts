import { expect, test } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

test("a cloud project can reach GitHub authorization from Settings", async ({ page }) => {
  await page.goto(
    `${testOrigins().stories}/iframe.html?id=project-dashboard-connected-deployments--empty-project&viewMode=story`
  )
  await expect(page.getByRole("heading", { name: "Deployments", exact: true })).toBeVisible()
  await page
    .getByRole("navigation", { name: "Project navigation" })
    .getByRole("button", { name: "Settings", exact: true })
    .click()
  await page.getByRole("button", { name: "Configure GitHub", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Configure project", exact: true })).toBeVisible()
  await expect(page.getByLabel("Repository URL", { exact: true })).toHaveValue("https://github.com/studio/thornwatch")
  await page.getByRole("button", { name: "Connect GitHub", exact: true }).click()
  await expect(page.getByTestId("deployment-action")).toContainText('"kind":"connect-repository"')
})
