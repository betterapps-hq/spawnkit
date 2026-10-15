import { readFile } from "node:fs/promises"
import { test, expect, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

const base = testOrigins().stories
async function open(page: Page, story = "overview") {
  await page.goto(`${base}/iframe.html?id=project-dashboard-analytics--${story}&viewMode=story`)
  await expect(page.locator(".analytics-workspace")).toBeVisible({ timeout: 15_000 })
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click()
  await page.getByRole("option", { name: option, exact: true }).click()
}
async function choosePeriod(page: Page, preset: string, label = "Analytics date range") {
  await page.getByRole("button", { name: new RegExp(`^${label}:`) }).click()
  const picker = page.getByRole("dialog", { name: `Choose ${label.toLowerCase()}` })
  if (/^Last (7|30|90|365) days$/.test(preset)) await picker.getByRole("button", { name: "Last", exact: true }).click()
  await picker.getByRole("button", { name: preset, exact: true }).click()
  await picker.getByRole("button", { name: "Apply", exact: true }).click()
}
async function tab(page: Page, name: string) {
  if (name === "Alerts") {
    await page.getByRole("button", { name: "Alerts", exact: true }).click()
    return
  }
  const health = ["Issues", "Performance", "Releases"].includes(name)
  const explore = ["Events", "Sessions"].includes(name)
  await page
    .getByRole("navigation", { name: "Analytics sections" })
    .getByRole("button", { name: health ? "Health" : explore ? "Explore" : name, exact: true })
    .click()
  if (health || explore)
    await page
      .getByRole("navigation", { name: health ? "Health views" : "Explore datasets" })
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .click()
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

test("hundreds of releases remain searchable, bounded and selectable without traffic", async ({ page }, info) => {
  await open(page, "many-releases")
  const trigger = page.getByRole("combobox", { name: "Analytics release", exact: true })
  await trigger.click()
  const picker = page.getByRole("dialog", { name: "Choose analytics release" })
  const search = picker.getByRole("combobox", { name: "Search releases", exact: true })
  await expect(search).toBeFocused()
  await expect(picker.getByRole("status")).toHaveText("1–20 of 500")
  await expect(picker.getByRole("option")).toHaveCount(21)
  await expect(picker.getByRole("button", { name: "Previous releases" })).toBeDisabled()
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-release-picker-${info.project.name}.png`,
    animations: "disabled",
    scale: "css"
  })
  await picker.getByRole("button", { name: "Next releases" }).click()
  await expect(picker.getByRole("status")).toHaveText("21–40 of 500")
  await expect(picker.getByRole("option")).toHaveCount(21)
  await search.fill("1.3.3")
  await expect(picker.getByRole("option").first()).toHaveAccessibleName("1.3.3")
  await search.press("Enter")
  await expect(trigger).toContainText("1.3.3")
  await expect(page.getByText("No matching diagnostic data", { exact: true })).toBeVisible()
  await trigger.click()
  await expect(picker.getByRole("option", { name: "1.3.3", exact: true })).toHaveAttribute("aria-selected", "true")
  await expect(picker.getByRole("option")).toHaveCount(22)
  await search.fill("does-not-exist")
  await expect(picker.getByText("No matching releases", { exact: true })).toBeVisible()
  await expect(picker.getByRole("option")).toHaveCount(0)
  await search.press("Enter")
  await expect(picker).toBeVisible()
  await search.press("Escape")
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText("1.3.3")
  await choose(page, "Analytics environment", "Sandbox")
  await expect(trigger).toContainText("1.3.3")
  await choose(page, "Analytics release", "All releases")
  await expect(page.getByText("No matching diagnostic data", { exact: true })).toHaveCount(0)
})

test("release lookup supports commits, keyboard paging and long prerelease versions", async ({ page }, info) => {
  await open(page, "many-releases")
  const trigger = page.getByRole("combobox", { name: "Analytics release", exact: true })
  await trigger.focus()
  await trigger.press("Enter")
  const picker = page.getByRole("dialog", { name: "Choose analytics release" })
  const search = picker.getByRole("combobox", { name: "Search releases", exact: true })
  await search.press("PageDown")
  await expect(picker.getByRole("status")).toHaveText("21–40 of 500")
  await search.press("PageUp")
  await expect(picker.getByRole("status")).toHaveText("1–20 of 500")
  await search.fill("A41E9C8")
  await expect(picker.getByRole("option")).toHaveCount(1)
  await expect(picker.getByRole("option")).toHaveAccessibleName("1.8.3")
  await search.press("Enter")
  await expect(trigger).toContainText("1.8.3")
  await trigger.click()
  await search.fill("CHECKPOINT")
  const version = "1.6.0-rc.2+checkpoint-recovery.mobile-renderer"
  await expect(picker.getByRole("option", { name: version, exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-release-search-${info.project.name}.png`,
    animations: "disabled",
    scale: "css"
  })
  await search.press("Enter")
  await expect(trigger).toHaveAttribute("title", version)
  await noOverflow(page)
})

test("release comparisons search the complete catalog and bound the adoption chart", async ({ page }) => {
  await open(page, "many-releases-comparison")
  const adoption = page
    .locator(".an-panel")
    .filter({ has: page.getByRole("heading", { name: "Release adoption", exact: true }) })
  await expect(adoption.getByText("Other releases (57)", { exact: true })).toBeVisible()
  await expect(adoption.locator(".h-1\\.5")).toHaveCount(6)
  await expect(page.getByRole("combobox", { name: "Baseline release", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Compare 1.8.3", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Release adoption", exact: true })).not.toBeVisible()
  await page.getByRole("combobox", { name: "Baseline release", exact: true }).click()
  const picker = page.getByRole("dialog", { name: "Choose baseline release" })
  await expect(picker.getByRole("option", { name: "All releases", exact: true })).toHaveCount(0)
  await picker.getByRole("combobox", { name: "Search releases" }).fill("1.7.99")
  await picker.getByRole("option", { name: "1.7.99", exact: true }).click()
  await expect(
    page.getByRole("table", { name: "Release health comparison" }).getByRole("row", { name: /^Recorded sessions/ })
  ).toContainText("1")
  await page.getByRole("combobox", { name: "Comparison release", exact: true }).click()
  const comparisonPicker = page.getByRole("dialog", { name: "Choose comparison release" })
  await expect(comparisonPicker.getByRole("combobox", { name: "Search releases" })).toBeFocused()
  await comparisonPicker.getByRole("combobox", { name: "Search releases" }).fill("1.3.3")
  await comparisonPicker.getByRole("option", { name: "1.3.3", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Not enough data for this comparison" })).toBeVisible()
  await tab(page, "Alerts")
  await page.getByRole("button", { name: "Back to releases", exact: true }).click()
  await expect(page.getByRole("combobox", { name: "Baseline release", exact: true })).toContainText("1.7.99")
  await expect(page.getByRole("combobox", { name: "Comparison release", exact: true })).toContainText("1.3.3")
  await noOverflow(page)
})

test("release health leads with data and comparison returns to the selected history", async ({ page }, info) => {
  await open(page, "many-releases-comparison")
  await expect(page.getByRole("heading", { name: "Release health", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Compare releases", exact: true })).toHaveCount(0)
  const history = page.getByRole("region", { name: "Release history", exact: true })
  await expect(history.locator("tbody tr")).toHaveCount(10)
  await history.getByRole("button", { name: "Next release page" }).click()
  await expect(history.getByRole("status")).toHaveText("11–20 of 500")
  const compare = history.getByRole("button", { name: /^Compare / }).first()
  const version = (await compare.getAttribute("aria-label"))!.replace("Compare ", "")
  await compare.click()
  await expect(page.getByRole("heading", { name: "Compare releases", exact: true })).toBeFocused()
  await expect(page.getByRole("combobox", { name: "Comparison release", exact: true })).toContainText(version)
  await page.getByRole("button", { name: "Back to release health", exact: true }).click()
  await expect(compare).toBeFocused()
  await expect(history.getByRole("status")).toHaveText("11–20 of 500")
  const search = history.getByRole("textbox", { name: "Search release history" })
  await search.fill("1.3.3")
  const row = history
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "View issues in 1.3.3", exact: true }) })
  await expect(row.locator('[data-label="Sessions"]')).toHaveText("0")
  await expect(row.locator('[data-label="Issue-free"]')).toHaveText("—")
  await search.fill("CHECKPOINT")
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-release-health-long-${info.project.name}.png`,
    animations: "disabled",
    scale: "css"
  })
  await search.fill("missing-version")
  await expect(history.getByRole("heading", { name: "No matching releases" })).toBeVisible()
  await search.fill("a41e9c8")
  await expect(history.locator("tbody tr")).toHaveCount(1)
  await page.getByRole("button", { name: "View issues in 1.8.3", exact: true }).click()
  await expect(page.getByRole("combobox", { name: "Analytics release", exact: true })).toContainText("1.8.3")
  await expect(page.getByRole("heading", { name: "Issues", exact: true })).toBeVisible()
  await tab(page, "Releases")
  await expect(search).toHaveValue("a41e9c8")
  await expect(page.getByRole("combobox", { name: "Baseline release", exact: true })).toHaveCount(0)
})

test("date range drafts validate, cancel and apply to diagnostics without changing player reporting", async ({
  page
}, info) => {
  await open(page)
  const trigger = page.getByRole("button", { name: /^Analytics date range:/ })
  const sessions = page
    .locator(".an-health-strip > div")
    .filter({ has: page.getByText("Recorded sessions", { exact: true }) })
    .locator("strong")
  const picker = page.getByRole("dialog", { name: "Choose analytics date range" })
  await trigger.click()
  await picker.getByLabel("Start date", { exact: true }).fill("2026-10-12")
  await picker.getByLabel("End date", { exact: true }).fill("2026-10-12")
  await expect(sessions).toHaveText("1,080")
  await picker.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(trigger).toContainText("Last 24 hours")
  await trigger.click()
  await expect(picker.getByLabel("End date", { exact: true })).toHaveValue("2026-10-14")
  await picker.getByLabel("Start date", { exact: true }).fill("2026-10-13")
  await picker.getByLabel("End date", { exact: true }).fill("2026-10-12")
  await expect(picker.getByRole("alert")).toContainText("Start date")
  await expect(picker.getByRole("button", { name: "Apply", exact: true })).toBeDisabled()
  await picker.getByLabel("End date", { exact: true }).fill("2026-10-15")
  await expect(picker.getByRole("alert")).toContainText("on or before")
  await picker.getByLabel("Start date", { exact: true }).fill("2026-10-12")
  await picker.getByLabel("End date", { exact: true }).fill("2026-10-12")
  await noOverflow(page)
  await picker.getByRole("button", { name: "Apply", exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `work/analytics-date-picker-${info.project.name}.png`,
    animations: "disabled",
    scale: "css"
  })
  await picker.getByRole("button", { name: "Apply", exact: true }).click()
  await expect(trigger).toContainText("Oct 12, 2026")
  const count = Number((await sessions.textContent())!.replaceAll(",", ""))
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(1080)
  await tab(page, "Players")
  await expect(page.getByRole("button", { name: /^Player date range:/ })).toContainText("Last 30 days")
  await expect(
    page.locator(".an-metric").filter({ hasText: "Daily active players" }).locator(".an-metric-value")
  ).toHaveText("1,427")
  await tab(page, "Issues")
  await expect(trigger).toContainText("Oct 12, 2026")
  await page.locator(".an-issue-title:visible").first().click()
  await tab(page, "Alerts")
  await choosePeriod(page, "Last hour")
  await page.getByRole("button", { name: "Back to issue", exact: true }).click()
  await expect(trigger).toContainText("Oct 12, 2026")
  await page.getByRole("button", { name: "Back to issues", exact: true }).click()
  await expect(trigger).toContainText("Oct 12, 2026")
})

test("calendar supports reverse cross-month ranges, keyboard navigation and Escape", async ({ page }) => {
  await open(page, "players")
  const trigger = page.getByRole("button", { name: /^Player date range:/ })
  const picker = page.getByRole("dialog", { name: "Choose player date range" })
  await trigger.click()
  await expect(picker.getByRole("button", { name: "Wednesday, October 14, 2026", exact: true })).toBeDisabled()
  await expect(picker.getByRole("button", { name: "Next month", exact: true })).toBeDisabled()
  await picker.getByRole("button", { name: "Saturday, October 3, 2026", exact: true }).click()
  await picker.getByRole("button", { name: "Previous month", exact: true }).click()
  await picker.getByRole("button", { name: "Wednesday, September 30, 2026", exact: true }).click()
  await expect(picker.getByLabel("Start date", { exact: true })).toHaveValue("2026-09-30")
  await expect(picker.getByLabel("End date", { exact: true })).toHaveValue("2026-10-03")
  await picker.getByRole("button", { name: "Apply", exact: true }).click()
  await expect(trigger).toContainText("Sep 30 – Oct 3, 2026")
  await expect(page.getByText("4 days (UTC)", { exact: true })).toBeVisible()
  await trigger.click()
  const firstDay = picker.getByRole("button", { name: "Saturday, October 3, 2026", exact: true })
  await firstDay.focus()
  await firstDay.press("ArrowLeft")
  await expect(picker.getByRole("button", { name: "Friday, October 2, 2026", exact: true })).toBeFocused()
  await page.keyboard.press("PageUp")
  const previous = picker.getByRole("button", { name: "Wednesday, September 2, 2026", exact: true })
  await expect(previous).toBeFocused()
  await previous.press("Enter")
  await page.keyboard.press("Escape")
  await expect(picker).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText("Sep 30 – Oct 3, 2026")
  await noOverflow(page)
})

test("player dates change period totals, retain rolling MAU and survive view and environment changes", async ({
  page
}) => {
  await open(page, "players")
  const metric = (label: string) => page.locator(".an-metric").filter({ hasText: label }).locator(".an-metric-value")
  const beforeHours = Number((await metric("Hours played").textContent())!.replaceAll(",", ""))
  await choosePeriod(page, "Last 7 days", "Player date range")
  await expect(page.getByText("7 days (UTC)", { exact: true })).toBeVisible()
  await expect(metric("Daily active players")).toHaveText("1,427")
  await expect(metric("Monthly active players")).toHaveText("5,829")
  expect(Number((await metric("Hours played").textContent())!.replaceAll(",", ""))).toBeLessThan(beforeHours)
  await expect(page.locator(".an-retention-table tbody tr")).toHaveCount(7)
  await expect(page.getByRole("button", { name: "Older cohorts", exact: true })).toBeDisabled()
  await choose(page, "Analytics environment", "Sandbox")
  await expect(page.getByRole("button", { name: /^Player date range:/ })).toContainText("Last 7 days")
  await tab(page, "Issues")
  await choosePeriod(page, "Yesterday")
  await tab(page, "Players")
  await expect(page.getByRole("button", { name: /^Player date range:/ })).toContainText("Last 7 days")
  await choosePeriod(page, "Last 90 days", "Player date range")
  await expect(metric("Hours played")).toHaveText("—")
  await expect(page.getByText("Incomplete coverage", { exact: true })).toBeVisible()
  await choosePeriod(page, "Yesterday", "Player date range")
  await expect(page.getByText("1 day (UTC)", { exact: true })).toBeVisible()
  await noOverflow(page)
})

test("player engagement uses distinct daily and monthly players and exposes mature retention cohorts", async ({
  page
}, info) => {
  await open(page, "players")
  const daily = page.locator(".an-metric").filter({ hasText: "Daily active players" }).locator(".an-metric-value")
  await expect(daily).toHaveText("1,427")
  await expect(
    page.locator(".an-metric").filter({ hasText: "Monthly active players" }).locator(".an-metric-value")
  ).toHaveText("5,829")
  await expect(page.getByRole("button", { name: /^Analytics date range:/ })).toHaveCount(0)
  await page.getByRole("button", { name: "Playtime", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Hours played", exact: true })).toBeVisible()
  const rows = page.locator(".an-retention-table tbody tr")
  await expect(rows.first()).toContainText("Oct 13")
  await expect(rows.first().locator("td").last()).toHaveText("—")
  await choosePeriod(page, "Last 90 days", "Player date range")
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Older cohorts", exact: true }).click()
  await expect(rows.first().locator("td").last()).toContainText("%")
  await rows.first().getByRole("button").click()
  await expect(page.getByRole("dialog")).toContainText("returned")
  await page.getByRole("button", { name: "D30", exact: true }).click()
  await expect(page.locator(".an-cohort-comparison")).toContainText("vs.")
  await page.getByRole("button", { name: "Close", exact: true }).click()
  if (info.project.name === "mobile") {
    await page.getByRole("combobox", { name: "Cohort return day" }).selectOption("30")
    await expect(rows.first().locator("td").last()).toBeInViewport()
  }
  await choose(page, "Analytics environment", "Sandbox")
  expect(Number((await daily.textContent())!.replaceAll(",", ""))).toBeLessThan(1427)
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-players-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
})

test("AI investigation cancels safely, cites evidence, proposes a fix and exports an actionable brief", async ({
  page,
  context
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await open(page, "issue-investigation")
  await page.getByRole("button", { name: "Investigate with AI", exact: true }).click()
  await expect(page.getByText("Following the evidence")).toBeVisible()
  await page.getByRole("button", { name: "Cancel investigation" }).click()
  await page.getByRole("textbox", { name: "Additional context" }).fill("Check simultaneous checkpoint writes.")
  await page.getByRole("button", { name: "Start investigation" }).click()
  await expect(page.getByRole("tab", { name: "Findings", exact: true })).toBeVisible()
  await expect(page.getByRole("dialog")).toContainText("73 affected sessions")
  await page.getByRole("tab", { name: "Proposed fix" }).click()
  await expect(page.locator(".an-ai-diff")).toContainText("status: 'conflict'")
  await expect(page.getByText("Not applied or tested")).toBeVisible()
  await page.getByRole("tab", { name: "Verify", exact: true }).click()
  await page.getByRole("checkbox").first().check()
  await expect(page.getByText("1 of 5 reviewed", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Copy for coding agent", exact: true }).click()
  const brief = await page.evaluate(() => navigator.clipboard.readText())
  expect(brief).toContain("Check simultaneous checkpoint writes.")
  expect(brief).toContain("[E1]")
  expect(brief).toContain("Uncertainty:")
  await page.getByRole("tab", { name: "Findings", exact: true }).click()
  await noOverflow(page)
  await page.screenshot({ path: `work/analytics-ai-${info.project.name}.png`, scale: "css", animations: "disabled" })
  await page.getByRole("button", { name: /E2 73 affected sessions/ }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByRole("tab", { name: /^Affected sessions/ })).toHaveAttribute("data-state", "active")
  await expect(page.locator(".an-evidence-section")).toBeFocused()
  await page.getByRole("button", { name: "View investigation", exact: true }).click()
  await expect(page.getByRole("tab", { name: "Findings", exact: true })).toBeVisible()
  await page.getByRole("button", { name: /E3 Related trace/ }).click()
  await expect(page.getByRole("heading", { name: "checkpoint.save", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Back to issue", exact: true }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("tab", { name: "Findings", exact: true })).toHaveAttribute("data-state", "active")
  await page.getByRole("tab", { name: "Verify", exact: true }).click()
  await expect(page.getByRole("checkbox").first()).toBeChecked()
  await expect(page.getByText("1 of 5 reviewed", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Copy for coding agent", exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(brief)
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await tab(page, "Alerts")
  await choose(page, "Analytics release", "1.8.1")
  await choosePeriod(page, "Last hour")
  await page.getByRole("button", { name: "Back to issue", exact: true }).click()
  await page.getByRole("button", { name: "View investigation", exact: true }).click()
  await expect(page.getByRole("tab", { name: "Verify", exact: true })).toHaveAttribute("data-state", "active")
  await expect(page.getByRole("checkbox").first()).toBeChecked()
  await expect(page.locator(".an-ai-scope")).toContainText("Last 24h")
})

test("AI errors, missing integration and read-only access have honest recovery states", async ({ page }) => {
  await open(page, "ai-service-error")
  await page.getByRole("button", { name: "Investigate with AI", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Investigation failed")
  await page.getByRole("button", { name: "Retry investigation" }).click()
  await expect(page.getByRole("alert")).toContainText("Investigation failed")
  await open(page, "ai-unavailable")
  await page.getByRole("button", { name: "Investigate with AI", exact: true }).click()
  await expect(page.getByRole("dialog")).toContainText("AI analysis is unavailable")
  await expect(page.getByRole("button", { name: "Start investigation" })).toHaveCount(0)
  await open(page, "read-only")
  await page.getByRole("button", { name: "Investigate with AI", exact: true }).click()
  await expect(page.getByRole("button", { name: "Start investigation" })).toBeDisabled()
})

test("Analytics is distinct from Logs and shared filters change the observations", async ({ page }, info) => {
  await open(page)
  await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible()
  const sessions = page
    .locator(".an-health-strip > div")
    .filter({ has: page.getByText("Recorded sessions", { exact: true }) })
    .locator("strong")
  await expect(sessions).toHaveText("1,080")
  await choose(page, "Analytics environment", "Sandbox")
  await expect(sessions).toHaveText("108")
  await choose(page, "Analytics release", "1.8.3")
  const subset = await sessions.textContent()
  expect(Number(subset?.replaceAll(",", ""))).toBeLessThan(108)
  await choose(page, "Analytics environment", "Production")
  await choose(page, "Analytics release", "1.8.1")
  await expect(sessions).toHaveText("0")
  await choose(page, "Analytics release", "All releases")
  await expect(page.getByText("Design preview", { exact: true })).toHaveCount(0)
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-overview-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
  const logs = page.getByRole("button", { name: "Logs", exact: true })
  await logs.click()
  await expect(page.getByRole("heading", { name: "Logs", exact: true })).toBeVisible()
  await expect(page.locator(".analytics-workspace")).toHaveCount(0)
})

test("issue triage, context and session-to-trace investigation stay connected", async ({ page }, info) => {
  await open(page, "issues")
  await page.getByRole("textbox", { name: "Search issues" }).fill("SaveConflict")
  await page.getByRole("button", { name: "Open SaveConflictError", exact: true }).click()
  await expect(page.getByRole("heading", { name: "SaveConflictError", exact: true })).toBeVisible()
  await page.getByRole("combobox", { name: "Assign issue", exact: true }).selectOption("Platform")
  await page.getByRole("button", { name: "Resolve issue", exact: true }).click()
  await page.getByRole("tab", { name: /^Activity/ }).click()
  await expect(page.getByText("You resolved this issue.", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: "Reopen issue", exact: true }).click()
  await page.getByRole("button", { name: "Back to issues", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Search issues" })).toHaveValue("SaveConflict")
  await page.getByRole("button", { name: "Open SaveConflictError", exact: true }).click()
  await page.getByRole("tab", { name: /^Activity/ }).click()
  await expect(page.getByText("Assigned to Platform.", { exact: false })).toBeVisible()
  await page.getByRole("tab", { name: "Stack trace", exact: true }).click()
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-issue-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
  await page.getByRole("button", { name: "Open latest session" }).click()
  await expect(page.getByText("Event timeline")).toBeVisible()
  await page.locator(".an-timeline-entry").filter({ hasText: "scene.loaded" }).click()
  await expect(page.locator("aside").getByText("scene.loaded", { exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-session-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
  await page.getByRole("button", { name: "Inspect trace", exact: true }).click()
  await page.getByRole("button", { name: "Inspect span save.write", exact: true }).click()
  await expect(page.getByRole("heading", { name: "save.write", exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-trace-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
})

test("performance operations open matching trace context", async ({ page }) => {
  await open(page, "performance")
  await page.getByRole("button", { name: "scene.load", exact: true }).click()
  await expect(page.getByRole("heading", { name: "scene.load", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Inspect span textures.decode", exact: true }).click()
  await expect(page.getByRole("heading", { name: "textures.decode", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Back to performance" }).click()
  await page.getByRole("button", { name: "frame.update", exact: true }).click()
  await expect(page.getByRole("heading", { name: "frame.update", exact: true })).toBeVisible()
  await noOverflow(page)
})

test("event exploration supports saved views, grouping, detail and real CSV export", async ({ page }, info) => {
  await open(page, "explore")
  await page.getByRole("textbox", { name: "Search events" }).fill("checkpoint.failed")
  await choose(page, "Event severity", "Errors")
  await choose(page, "Group events by", "Device")
  await page.getByRole("button", { name: "Save view", exact: true }).click()
  await page.getByRole("textbox", { name: "View name" }).fill("Save failures")
  await page.getByRole("dialog").getByRole("button", { name: "Save view", exact: true }).click()
  await page.getByRole("textbox", { name: "Search events" }).fill("absent-event")
  await expect(page.getByRole("heading", { name: "No events match" })).toBeVisible()
  await choose(page, "Saved event view", "Save failures")
  await expect(page.getByRole("textbox", { name: "Search events" })).toHaveValue("checkpoint.failed")
  await choose(page, "Analytics environment", "Sandbox")
  await expect(page.getByRole("textbox", { name: "Search events" })).toHaveValue("checkpoint.failed")
  await choose(page, "Analytics release", "1.8.1")
  await expect(page.getByRole("heading", { name: "No matching data" })).toBeVisible()
  await page.getByRole("button", { name: "Reset release and dates" }).click()
  await choose(page, "Analytics environment", "Production")
  await choose(page, "Saved event view", "Save failures")
  await expect(page.getByRole("textbox", { name: "Search events" })).toHaveValue("checkpoint.failed")
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export CSV" }).click()
  const download = await downloadPromise
  const csv = await readFile((await download.path())!, "utf8")
  expect(csv.split("\r\n")).toHaveLength(74)
  expect(csv).toContain("checkpoint.failed")
  expect(csv).not.toContain("scene.loaded")
  await page.getByRole("button", { name: "checkpoint.failed", exact: true }).first().click()
  await expect(page.getByRole("dialog").getByText("session.id", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-explore-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
})

test("release comparison changes cohorts and reports insufficient data", async ({ page }, info) => {
  await open(page, "release-comparison")
  await page.getByRole("button", { name: "Compare 1.8.3", exact: true }).click()
  await expect(page.getByRole("combobox", { name: "Analytics release", exact: true })).toHaveCount(0)
  await expect(page.getByText("73 affected sessions", { exact: true })).toBeVisible()
  await choose(page, "Baseline release", "1.8.3")
  await expect(page.getByRole("heading", { name: "Choose two different releases" })).toBeVisible()
  await choose(page, "Baseline release", "1.8.1")
  await expect(page.getByRole("heading", { name: "Not enough data for this comparison" })).toBeVisible()
  await choosePeriod(page, "Last 48 hours")
  await expect(page.getByRole("heading", { name: "Not enough data for this comparison" })).toHaveCount(0)
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-releases-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
})

test("alert rules validate, test without sending, persist across navigation and pause", async ({ page }, info) => {
  await open(page, "alerts")
  await page.getByRole("button", { name: "Create alert", exact: true }).click()
  await page.getByRole("textbox", { name: "Alert name" }).fill("Mobile frame budget")
  await page.getByRole("combobox", { name: "Signal", exact: true }).selectOption("frame")
  await page.getByRole("spinbutton", { name: "Threshold (ms)" }).fill("-1")
  await page.getByRole("button", { name: "Save alert" }).click()
  await expect(page.getByRole("alert")).toContainText("positive threshold")
  await page.getByRole("spinbutton", { name: "Threshold (ms)" }).fill("16.7")
  await page.getByRole("button", { name: "Save alert" }).click()
  const rule = page.locator(".an-alert-row").filter({ hasText: "Mobile frame budget" })
  await rule.getByRole("button", { name: "Test", exact: true }).click()
  await expect(rule).toContainText("Would trigger")
  await expect(page.getByText("Delivery not connected", { exact: true })).toBeVisible()
  await rule.getByRole("button", { name: "Pause Mobile frame budget" }).click()
  await expect(rule).toContainText("Paused")
  await tab(page, "Overview")
  await tab(page, "Alerts")
  await expect(rule).toContainText("Paused")
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-alerts-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
})

test("read-only, empty, loading and unavailable states are explicit", async ({ page }) => {
  await open(page, "read-only")
  await expect(page.getByRole("button", { name: "Resolve issue" })).toBeDisabled()
  await expect(page.getByRole("combobox", { name: "Assign issue", exact: true })).toBeDisabled()
  await tab(page, "Alerts")
  await expect(page.getByRole("button", { name: "Create alert" })).toBeDisabled()
  await open(page, "empty")
  await page.getByRole("button", { name: "Set up telemetry" }).click()
  await expect(page.getByRole("dialog")).toContainText("@spawn/telemetry")
  await open(page, "loading")
  await expect(page.getByLabel("Loading analytics")).toHaveAttribute("aria-busy", "true")
  await open(page, "unavailable")
  await page.getByRole("button", { name: "Retry connection" }).click()
  await expect(page.locator(".an-player-brief")).toBeVisible()
})

test("dark theme remains readable and responsive", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("spawn:theme", "dark"))
  await open(page)
  await expect(page.locator("html")).toHaveClass(/dark/)
  await noOverflow(page)
  await page.screenshot({
    path: `work/analytics-dark-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled"
  })
})

test("keyboard navigation opens filters, switches investigation tabs and closes dialogs", async ({ page }) => {
  await open(page, "issue-investigation")
  const scope = page.getByRole("combobox", { name: "Analytics environment", exact: true })
  await scope.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("option", { name: "Production", exact: true })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("option", { name: "Sandbox", exact: true })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(scope).toContainText("Sandbox")
  await tab(page, "Issues")
  await page.getByRole("button", { name: "Open SaveConflictError", exact: true }).focus()
  await page.keyboard.press("Enter")
  await page.getByRole("tab", { name: "Stack trace", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("tab", { name: /^Affected sessions/ })).toHaveAttribute("data-state", "active")
  await page.getByRole("button", { name: "Investigate with AI", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("four primary sections fit the viewport and urgent health appears before player charts", async ({ page }) => {
  await open(page)
  const navigation = page.getByRole("navigation", { name: "Analytics sections" })
  await expect(navigation.getByRole("button")).toHaveText(["Overview", "Players", "Health", "Explore"])
  for (const button of await navigation.getByRole("button").all()) await expect(button).toBeInViewport({ ratio: 1 })
  const priority = page.getByRole("heading", { name: "Checkpoint saves are failing" })
  await expect(priority).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole("button", { name: "Open issue", exact: true })).toBeInViewport({ ratio: 1 })
  await page.getByRole("button", { name: "Open issue", exact: true }).click()
  await expect(navigation.getByRole("button", { name: "Health", exact: true })).toHaveAttribute("aria-current", "page")
  await page.getByRole("button", { name: "Back to overview", exact: true }).click()
  await tab(page, "Performance")
  await expect(page.getByRole("button", { name: "scene.load", exact: true })).toBeVisible()
  await tab(page, "Sessions")
  await expect(page.getByRole("textbox", { name: "Search sessions" })).toBeVisible()
  await tab(page, "Events")
  await expect(page.getByRole("textbox", { name: "Search events" })).toBeVisible()
})

test("player windows remain independent from diagnostic filters and unavailable rollups are not zero", async ({
  page
}) => {
  await open(page)
  await choose(page, "Analytics release", "1.8.3")
  await choosePeriod(page, "Last hour")
  await tab(page, "Players")
  await expect(page.getByRole("combobox", { name: "Analytics release", exact: true })).toHaveCount(0)
  await expect(
    page.locator(".an-metric").filter({ hasText: "Daily active players" }).locator(".an-metric-value")
  ).toHaveText("1,427")
  await tab(page, "Overview")
  await expect(page.getByRole("combobox", { name: "Analytics release", exact: true })).toContainText("1.8.3")
  await open(page, "players-unavailable")
  await expect(page.getByRole("heading", { name: "No complete player activity yet" })).toBeVisible()
  await expect(page.locator(".an-metric")).toHaveCount(0)
  await open(page, "players-quiet")
  await expect(
    page.locator(".an-metric").filter({ hasText: "Daily active players" }).locator(".an-metric-value")
  ).toHaveText("0")
  await open(page, "new-game")
  await expect(
    page.locator(".an-metric").filter({ hasText: "Monthly active players" }).locator(".an-metric-value")
  ).toHaveText("—")
})

test("release and alert detours restore the original view and comparison", async ({ page }) => {
  await open(page)
  await choose(page, "Analytics release", "1.8.2")
  await tab(page, "Releases")
  await choosePeriod(page, "Last 48 hours")
  await page.getByRole("button", { name: "Compare 1.8.3", exact: true }).click()
  await choose(page, "Baseline release", "1.8.1")
  await page.locator(".an-release-issue").filter({ hasText: "SaveConflictError" }).click()
  await expect(page.getByRole("heading", { name: "SaveConflictError", exact: true })).toBeVisible()
  await page.getByRole("tab", { name: /^Affected sessions/ }).click()
  await tab(page, "Alerts")
  await choosePeriod(page, "Last hour")
  await choose(page, "Analytics release", "1.8.1")
  await page.getByRole("button", { name: "Back to issue", exact: true }).click()
  await expect(page.getByRole("button", { name: /^Analytics date range:/ })).toContainText("Last 48 hours")
  await expect(page.getByRole("tab", { name: /^Affected sessions/ })).toHaveAttribute("data-state", "active")
  await page.getByRole("button", { name: "Back to releases", exact: true }).click()
  await expect(page.getByRole("combobox", { name: "Baseline release", exact: true })).toContainText("1.8.1")
  await expect(page.getByRole("button", { name: /^Analytics date range:/ })).toContainText("Last 48 hours")
  await tab(page, "Issues")
  await expect(page.getByRole("combobox", { name: "Analytics release", exact: true })).toContainText("1.8.2")
})

test("non-save session traces preserve the captured operation and outcome", async ({ page }) => {
  for (const [issue, operation, outcome] of [
    ["WebGL context lost", "scene.load", "Load failed"],
    ["Scene asset failed to load", "scene.load", "Load failed"],
    ["Frame budget exceeded", "frame.update", "Slow frame"]
  ]) {
    await open(page, "issues")
    await page.getByRole("button", { name: `Open ${issue}`, exact: true }).click()
    await page.getByRole("button", { name: "Open latest session", exact: true }).click()
    await page.getByRole("button", { name: "Inspect trace", exact: true }).click()
    await expect(page.getByRole("heading", { name: operation, exact: true })).toBeVisible()
    await expect(page.getByText(outcome!, { exact: true }).and(page.locator(":visible"))).toBeVisible()
    await expect(page.getByRole("button", { name: "Inspect span retry.backoff", exact: true })).toHaveCount(0)
    if (issue === "Scene asset failed to load") {
      await page.getByRole("button", { name: "Inspect span assets.fetch", exact: true }).click()
      await expect(page.getByText("503", { exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: "Inspect span scene.activate", exact: true })).toHaveCount(0)
    }
    await page.getByRole("button", { name: "Back to session", exact: true }).click()
    await expect(page.getByText("Event timeline", { exact: true })).toBeVisible()
  }
})
