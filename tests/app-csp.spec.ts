import { expect, test } from "@playwright/test"

test("deployed app enforces fresh nonces through hydration and client navigation", async ({ page }) => {
  test.skip(process.env.SPAWN_LIVE_CSP !== "1", "Explicit deployed CSP verification")
  const violations: string[] = []
  page.on("console", (message) => {
    if (/violates.*Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text())
  })
  const response = await page.goto("/")
  const policy = response!.headers()["content-security-policy"]!
  expect(policy).toContain("frame-ancestors 'none'")
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1]
  expect(nonce).toBeTruthy()
  await expect(page.getByRole("navigation").first()).toBeVisible()
  expect(
    await page
      .locator("script:not([src])")
      .evaluateAll((scripts) => scripts.every((script) => (script as HTMLScriptElement).nonce !== ""))
  ).toBe(true)
  await page.getByRole("link", { name: "For creators", exact: true }).first().click()
  await expect(page).toHaveURL(/\/create$/)
  await expect(page.locator("h1")).toBeVisible()
  const second = await page.goto("/sign-in")
  expect(second!.headers()["content-security-policy"]).not.toContain(`'nonce-${nonce}'`)
  await expect(page.getByRole("button", { name: /Google/i }).first()).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1000)
  expect(violations).toEqual([])
})
