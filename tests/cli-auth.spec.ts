import { test, expect } from "@playwright/test"

test("CLI sign-in has a branded, responsive entry point", async ({ page }, testInfo) => {
  const params = new URLSearchParams({
    redirect_uri: "http://127.0.0.1:43819/callback",
    response_type: "code",
    scope: "openid",
    state: "a".repeat(43),
    code_challenge: "b".repeat(43),
    code_challenge_method: "S256"
  })
  await page.goto(`/cli/login?${params}`)
  await expect(page.getByRole("heading", { name: "Connect your CLI" })).toBeVisible()
  await expect(page.getByText("Sign in to review the terminal’s access request.", { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath("cli-login.png"), fullPage: true })
})
test("direct consent visits do not grant access", async ({ page }, testInfo) => {
  await page.goto("/cli/authorize")
  await expect(page.getByRole("heading", { name: "Authorize your CLI" })).toBeVisible()
  await expect(page.getByText("Start with spawn login", { exact: false })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("cli-authorize.png"), fullPage: true })
})
