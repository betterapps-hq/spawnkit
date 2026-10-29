import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"

const apiWrites = new WeakMap<Page, string[]>()

async function story(page: Page, id: string) {
  await page.goto(`${testOrigins().stories}/iframe.html?id=${id}&viewMode=story`)
  await expect(page.locator(".safety-root,.safety-player")).toBeVisible()
}
async function decision(page: Page) {
  await page.getByRole("button", { name: "Start review", exact: true }).click()
  await page.getByRole("button", { name: "Make a decision", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Make a decision" })
  await dialog.getByRole("combobox", { name: "Reason", exact: true }).click()
  await page.getByRole("option", { name: "Spam or advertising", exact: true }).click()
  await dialog
    .getByRole("textbox", { name: /Decision notes/ })
    .fill("Checked the captured comment and conversation. Repeated advertising.")
  return dialog
}

test.beforeEach(async ({ page }) => {
  const writes: string[] = []
  apiWrites.set(page, writes)
  page.on("request", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && new URL(request.url()).pathname.startsWith("/api/"))
      writes.push(request.url())
  })
  await page.addInitScript(() => {
    localStorage.setItem("spawn:theme", "dark")
    localStorage.setItem("spawn:sidebar", "expanded")
  })
})
test.afterEach(async ({ page }) => {
  expect(apiWrites.get(page)).toEqual([])
})

test("badge borders render consistently in both themes and screens omit prototype notices", async ({ page }) => {
  for (const id of ["administration-team--members", "project-dashboard-media-and-storage--overview"]) {
    await story(page, id)
    await expect(page.locator(".safety-root")).not.toContainText(/prototype|design preview|sample data|[·•]/i)
    for (const theme of ["dark", "light"]) {
      if ((await page.locator("html").getAttribute("class"))?.includes("dark") !== (theme === "dark"))
        await page.getByRole("button", { name: "Toggle theme" }).click()
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
            .map((animation) => animation.finished.catch(() => {}))
        )
      })
      const badges = await page.locator(".safety-pill:visible").evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element)
          return {
            text: element.textContent,
            background: style.backgroundColor,
            iconColors: Array.from(element.querySelectorAll("svg"), (icon) => getComputedStyle(icon).color),
            color: style.color,
            borders: [style.borderTop, style.borderRight, style.borderBottom, style.borderLeft]
          }
        })
      )
      expect(badges.length).toBeGreaterThan(0)
      for (const badge of badges) {
        expect(new Set(badge.borders).size, `${theme}: ${badge.text}`).toBe(1)
        expect(badge.borders[0]).toMatch(/^1px solid /)
        expect(badge.background).not.toBe("rgba(0, 0, 0, 0)")
        for (const iconColor of badge.iconColors) expect(iconColor).toBe(badge.color)
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
})

test("keyboard tabs, dialog focus return and the light theme remain usable", async ({ page }) => {
  await story(page, "administration-team--members")
  await page.getByRole("button", { name: "Toggle theme" }).click()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  const members = page.getByRole("tab", { name: "Members", exact: true })
  await members.focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("tab", { name: "Access history" })).toBeFocused()
  await expect(page.getByRole("tabpanel")).toContainText("Invited Sam Rivera")
  const invite = page.getByRole("button", { name: "Invite teammate" })
  await invite.click()
  const dialog = page.getByRole("dialog", { name: "Invite a teammate" })
  await expect(dialog.getByRole("textbox", { name: "Email address" })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(invite).toBeFocused()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("queue search and assignment filters preserve access to investigation", async ({ page }) => {
  await story(page, "administration-reports--inbox")
  await page.getByRole("textbox", { name: "Search reports" }).fill("Prism")
  await expect(page.locator(".safety-case")).toHaveCount(1)
  await page.getByRole("button", { name: "Clear report search" }).click()
  await page.getByRole("button", { name: "Assigned to me", exact: true }).click()
  await expect(page.locator(".safety-case")).toHaveCount(1)
  await page.locator(".safety-case").click()
  await expect(page.getByRole("heading", { name: "Orchard Snake" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Make a decision", exact: true })).toBeEnabled()
})

test("failed decision preserves draft, retry resolves the case and records reasoning", async ({ page }) => {
  await story(page, "administration-reports--save-failed")
  const dialog = await decision(page)
  await dialog.getByRole("button", { name: "Save decision", exact: true }).click()
  await expect(dialog.getByRole("alert")).toContainText("could not be saved")
  await expect(dialog.getByRole("textbox", { name: /Decision notes/ })).toHaveValue(/Checked the captured comment/)
  await dialog.getByRole("button", { name: "Save decision", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator(".safety-report-summary")).toContainText("3 open cases")
  await page.getByRole("tab", { name: /History & notes/ }).click()
  await expect(page.locator(".safety-timeline")).toContainText("Spam or advertising: Checked the captured comment")
})

test("edited content must be checked and taking over another review requires a reason", async ({ page }) => {
  await story(page, "administration-reports--edited-comment")
  await expect(page.getByRole("button", { name: "Make a decision", exact: true })).toBeDisabled()
  await page.getByRole("button", { name: "Take over review", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Take over review" })
  await expect(dialog.getByRole("button", { name: "Take over review", exact: true })).toBeDisabled()
  await dialog.getByRole("textbox", { name: /Reason/ }).fill("Alex asked me to finish this review.")
  await dialog.getByRole("button", { name: "Take over review", exact: true }).click()
  await expect(page.getByRole("button", { name: "Make a decision", exact: true })).toBeDisabled()
  await page.getByRole("button", { name: "Current version", exact: true }).click()
  await expect(page.getByRole("button", { name: "Make a decision", exact: true })).toBeEnabled()
})

test("a conflicting decision loads the latest state while retaining unsent notes", async ({ page }) => {
  await story(page, "administration-reports--updated-elsewhere")
  const dialog = await decision(page)
  await dialog.getByRole("button", { name: "Save decision" }).click()
  await expect(dialog.getByRole("alert")).toContainText("Alex Morgan resolved")
  await dialog.getByRole("button", { name: "Review latest" }).click()
  await page.getByRole("tab", { name: /History & notes/ }).click()
  await expect(page.getByRole("textbox", { name: "Add an internal note" })).toHaveValue(/Checked the captured comment/)
  await expect(page.locator(".safety-timeline")).not.toContainText("Repeated advertising.")
})

test("observer cannot decide and moderator cannot restrict hosted access", async ({ page }) => {
  await story(page, "administration-reports--observer")
  await expect(page.getByRole("button", { name: "Start review" })).toBeDisabled()
  await story(page, "administration-reports--moderator")
  await page.getByRole("button", { name: "Start review" }).click()
  await page.getByRole("button", { name: "Make a decision", exact: true }).click()
  await page.getByRole("combobox", { name: "Action", exact: true }).click()
  await expect(page.getByRole("option", { name: /Restrict game access/ })).toBeDisabled()
})

test("invitation retries without losing the address and adds a local access history entry", async ({ page }) => {
  await story(page, "administration-team--invite-failed")
  const dialog = page.getByRole("dialog", { name: "Invite a teammate" })
  await dialog.getByRole("textbox", { name: "Email address" }).fill("new-moderator@example.com")
  await dialog.getByRole("button", { name: "Send invitation" }).click()
  await expect(dialog.getByRole("alert")).toContainText("could not be sent")
  await expect(dialog.getByRole("textbox", { name: "Email address" })).toHaveValue("new-moderator@example.com")
  await dialog.getByRole("button", { name: "Send invitation" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator(".safety-team-table")).toContainText("new-moderator@example.com")
  await expect(page.getByRole("status")).toContainText("Invitation added")
  await page.getByRole("tab", { name: "Access history" }).click()
  await expect(page.locator(".safety-timeline")).toContainText("Invited new-moderator@example.com")
})

test("last admin is protected and expired invitations can be renewed once", async ({ page }) => {
  await story(page, "administration-team--last-admin")
  await page.getByRole("button", { name: "Actions for Andrew Craswell" }).click()
  await expect(page.getByRole("menuitem", { name: "Change role" })).toBeDisabled()
  await expect(page.getByRole("menuitem", { name: "Remove access" })).toBeDisabled()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Actions for Riley Park" }).click()
  await page.getByRole("menuitem", { name: "Resend invitation" }).click()
  await expect(page.locator("tr").filter({ hasText: "Riley Park" })).toContainText("Invited")
  await page.getByRole("button", { name: "Actions for Riley Park" }).click()
  await expect(page.getByRole("menuitem", { name: "Resend invitation" })).toBeDisabled()
})

test("game report retries, keeps context and ends with a private receipt", async ({ page }) => {
  await story(page, "public-site-report-content--failed")
  const dialog = page.getByRole("dialog", { name: "Report game", exact: true })
  await dialog.getByRole("radio", { name: "Something else", exact: true }).click()
  await dialog.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(dialog.getByRole("button", { name: "Send report" })).toBeDisabled()
  await dialog
    .getByRole("textbox", { name: /What should we know/ })
    .fill("The game opens an unrelated download after level one.")
  await dialog.getByRole("button", { name: "Change", exact: true }).click()
  await expect(dialog.getByRole("radio", { name: "Something else", exact: true })).toBeChecked()
  await dialog.getByRole("button", { name: "Continue", exact: true }).click()
  await dialog.getByRole("button", { name: "Send report" }).click()
  await expect(dialog.getByRole("alert")).toContainText("wasn’t sent")
  await expect(dialog.getByRole("textbox", { name: /What should we know/ })).toHaveValue(/unrelated download/)
  await dialog.getByRole("button", { name: "Send report" }).click()
  const receipt = page.getByRole("dialog", { name: "Report received" })
  await expect(receipt).toContainText("Your identity stays private")
  await receipt.getByRole("button", { name: "Back to the game" }).click()
  await expect(receipt).toHaveCount(0)
})

test("comment report opens in context and draft dismissal requires an explicit choice", async ({ page }) => {
  await story(page, "public-site-report-content--entry-points")
  await page.getByRole("button", { name: "Comment options" }).click()
  await page.getByRole("menuitem", { name: "Report comment" }).click()
  const dialog = page.getByRole("dialog", { name: "Report comment", exact: true })
  await expect(dialog).toContainText("Comment by pixelpilot")
  await dialog.getByRole("radio", { name: "Spam or advertising", exact: true }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Keep your report?" })).toBeVisible()
  await page.getByRole("button", { name: "Keep writing" }).click()
  await expect(dialog.getByRole("radio", { name: "Spam or advertising", exact: true })).toBeChecked()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Discard draft" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("cleanup protects current releases and preserves selection after a failure", async ({ page }) => {
  await story(page, "project-dashboard-media-and-storage--cleanup-failed")
  await expect(page.getByRole("checkbox", { name: "Select v12", exact: true })).toBeDisabled()
  await expect(page.getByRole("checkbox", { name: "Select v11", exact: true })).toBeDisabled()
  await page.getByRole("button", { name: "Select removable" }).click()
  await page.getByRole("button", { name: "Review cleanup" }).click()
  const dialog = page.getByRole("dialog", { name: "Remove 3 stored items?" })
  await expect(dialog).toContainText("390 MiB")
  await expect(dialog.getByRole("button", { name: "Remove selected" })).toBeDisabled()
  await dialog.getByRole("checkbox").check()
  await dialog.getByRole("button", { name: "Remove selected" }).click()
  await expect(dialog.getByRole("alert")).toContainText("Nothing was removed")
  await expect(dialog.getByRole("checkbox")).toBeChecked()
  await dialog.getByRole("button", { name: "Remove selected" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole("meter", { name: "Project storage used" })).toHaveAttribute("value", "352")
  await expect(page.locator(".safety-release-row")).toHaveCount(2)
  await expect(page.getByRole("checkbox", { name: "Select v12", exact: true })).toBeDisabled()
})

test("media processing retains previous assets and exposes a typed config example", async ({ page }) => {
  await story(page, "project-dashboard-media-and-storage--failed")
  await page.getByRole("button", { name: "Retry preparation" }).click()
  await expect(page.locator(".safety-media-card")).toHaveCount(2)
  await expect(page.locator(".safety-media-card").first()).toContainText("Previous version")
  await page.getByRole("button", { name: "Preview completed state" }).click()
  await expect(page.locator(".safety-media-card").first()).toContainText("Ready")
  await page.getByRole("button", { name: "Update game media" }).click()
  await expect(page.getByRole("dialog")).toContainText("defineConfig")
  await expect(page.getByRole("dialog")).toContainText("coverPath")
})

test("preview states render without horizontal overflow, script errors or backend mutations", async ({ page }) => {
  const errors: string[] = []
  const writes: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("request", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && new URL(request.url()).pathname.startsWith("/api/"))
      writes.push(request.url())
  })
  for (const id of [
    "administration-reports--loading",
    "administration-reports--empty",
    "administration-reports--failed",
    "administration-team--observer",
    "administration-team--small-team",
    "public-site-report-content--signed-out",
    "public-site-report-content--already-reported",
    "public-site-report-content--rate-limited",
    "project-dashboard-media-and-storage--queued",
    "project-dashboard-media-and-storage--limit-reached",
    "project-dashboard-media-and-storage--empty"
  ]) {
    await story(page, id)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(errors).toEqual([])
  expect(writes).toEqual([])
})
