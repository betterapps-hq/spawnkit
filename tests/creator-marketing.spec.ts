import { expect, test } from "@playwright/test"

test("new visits default to dark while saved and system choices remain usable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto("/create")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.getByRole("button", { name: "Change theme", exact: true }).click()
  await page.getByRole("menuitemradio", { name: "Light", exact: true }).click()
  await page.reload()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.getByRole("button", { name: "Change theme", exact: true }).click()
  await page.getByRole("menuitemradio", { name: "System", exact: true }).click()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.evaluate(() => localStorage.removeItem("spawn:theme"))
  await page.emulateMedia({ colorScheme: "light" })
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
})

test("creator tests animate, can be paused and respect reduced motion", async ({ page }) => {
  // The physics demo below loads while the browser tests play. With software WebGL, as in CI, it can hold the main
  // thread for several seconds, so the animation gets extra time.
  test.setTimeout(60_000)
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto("/create")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  const checks = page.locator(".c-checks-workbench")
  await checks.scrollIntoViewIfNeeded()
  const run = checks.locator(".c-test-run")
  await expect(run).toHaveAttribute("data-running", "true")
  await checks.getByRole("button", { name: "Replay unit tests animation", exact: true }).click()
  await expect(run).toHaveAttribute("data-complete", "true", { timeout: 15000 })
  await checks.getByRole("button", { name: "Pause unit tests animation", exact: true }).click()
  await expect(run).toHaveAttribute("data-running", "false")
  await page.waitForTimeout(1200)
  await expect(run).toHaveAttribute("data-complete", "true")
  await checks.getByRole("button", { name: "Replay unit tests animation", exact: true }).click()
  await expect(run).toHaveAttribute("data-complete", "false")
  await checks.getByRole("tab", { name: "Browser tests", exact: true }).click()
  await run.scrollIntoViewIfNeeded()
  await expect(run).toHaveAttribute("data-running", "true")
  await expect(run).toHaveAttribute("data-complete", "true", { timeout: 30000 })
  await expect(checks.locator(".c-test-level")).toHaveAttribute("data-collected", "true")
  await page.emulateMedia({ reducedMotion: "reduce" })
  await expect(run).toHaveAttribute("data-running", "false")
  await expect(checks.getByRole("button", { name: /animation/ })).toHaveCount(0)
  await expect(checks.locator('[data-state="passed"]')).toHaveCount(3)
})

test("device composition stays within its section at every breakpoint", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/create")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  for (const width of [1385, 1225, 920, 768, 540, 390, 320]) {
    await page.setViewportSize({ width, height: 1004 })
    await page.locator(".c-device-composition").scrollIntoViewIfNeeded()
    await expect
      .poll(
        () =>
          page.locator(".c-platform-showcase").evaluate((section) => {
            const figure = section.querySelector(".c-device-composition")!.getBoundingClientRect()
            const details = section.querySelector(".c-platform-details")!.getBoundingClientRect()
            return [...section.querySelectorAll(".c-laptop, .c-phone")].every((device) => {
              const bounds = device.getBoundingClientRect()
              return bounds.top >= figure.top && bounds.bottom < details.top
            })
          }),
        { message: `Devices stay inside their section at ${width}px` }
      )
      .toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await expect(page.locator(".mk-art-label, .mk-reassurance")).toHaveCount(0)
  const heading = page.getByRole("heading", { name: "Build movement that feels right.", exact: true })
  const type = await heading.evaluate((el) => ({
    font: parseFloat(getComputedStyle(el).fontSize),
    line: parseFloat(getComputedStyle(el).lineHeight)
  }))
  expect(type.line / type.font).toBeGreaterThanOrEqual(1.2)
  expect(await page.locator(".mk-creators").innerText()).not.toMatch(/[—•·]/)
})
