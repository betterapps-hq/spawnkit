import { expect, test } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

test("live build output updates, allows pausing scroll and retains media warnings after completion", async ({
  page
}, testInfo) => {
  await page.goto(`${testOrigins().stories}/iframe.html?id=project-dashboard-build-output--live&viewMode=story`)
  const output = page.getByRole("log", { name: "Build output" })
  await expect(output).toContainText("Installing dependencies")
  await expect(page.getByText("Live", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Emit next build event" }).click()
  await expect(output).toContainText("Building module 80")
  await expect.poll(() => output.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(4)
  await page.getByRole("button", { name: "Pause scrolling" }).click()
  await output.evaluate((el) => {
    el.scrollTop = 0
  })
  await page.getByRole("button", { name: "Emit next build event" }).click()
  await expect(output).toContainText("Build completed")
  expect(await output.evaluate((el) => el.scrollTop)).toBe(0)
  await expect(page.getByText("Live", { exact: true })).toHaveCount(0)
  const warnings = page.getByRole("region", { name: "Media warnings" })
  await expect(warnings).toContainText("Cover image omitted:")
  await expect(warnings).toContainText("1 MiB")
  await expect(warnings).toContainText("trailer file was not found")
  await expect(page.locator("body")).not.toContainText(/submission|approval/i)
  await page.getByRole("button", { name: "Follow output" }).click()
  await expect.poll(() => output.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(4)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `work/live-logs-${testInfo.project.name}.png`, fullPage: true })
})
