import { expect, test, type Page } from "@playwright/test"
import { defaultProjectDraft } from "../apps/dashboard/src/components/project/creation-model"
import { testOrigins } from "../scripts/dev-environment.mjs"
const appStory = `${testOrigins().stories}/iframe.html?id=dashboard-dashboard--home&viewMode=story`
const key = "spawn:workspaces:v1:storybook-user"
async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Expand navigation" })
  if (page.viewportSize()!.width < 1024) await menu.click()
  await page
    .getByRole("navigation", { name: "Project navigation", exact: true })
    .getByRole("button", { name, exact: true })
    .click()
}
async function create(page: Page, name: string, renderer = "PixiJS") {
  await page.getByRole("button", { name: "Create project", exact: true }).first().click()
  await page.getByRole("button", { name: `Select ${renderer}`, exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByLabel("Project name", { exact: true }).fill(name)
}
async function review(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
}

test("reads current projects and persists the complete starter configuration", async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(
    ({ key, configuration }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify([{ id: "current-test", name: "Test", configuration }]))
    },
    { key, configuration: { ...defaultProjectDraft, name: "Test" } }
  )
  await page.goto(appStory)
  await expect(page.getByRole("heading", { name: "Test", exact: true })).toBeVisible()
  await create(page, "Night Orchard", "Three.js")
  await page.locator("summary").filter({ hasText: "Customize your stack" }).click()
  await page.getByRole("radio", { name: "Koota", exact: true }).check()
  await page.getByRole("radio", { name: "bitECS", exact: true }).check()
  await expect(page.getByRole("radio", { name: "Koota", exact: true })).not.toBeChecked()
  await page.getByRole("radio", { name: "No ECS", exact: true }).check()
  await page.getByRole("radio", { name: "bitECS", exact: true }).check()
  await page.getByRole("radio", { name: "Rapier 3D", exact: true }).check()
  await review(page)
  await page.getByRole("button", { name: "Create project", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Night Orchard is ready", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Open project", exact: true }).click()
  await expect(page.getByTestId("scaffold-command")).toContainText(
    "--add three,rapier3d,html-ui,no-telemetry,vitest,bitecs"
  )
  await expect(page.getByRole("button", { name: "New version", exact: true })).toBeDisabled()
  const records = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
  expect(records[0]).toEqual({
    id: "current-test",
    name: "Test",
    configuration: { ...defaultProjectDraft, name: "Test" }
  })
  expect(records[1].configuration.template).toBe("three")
  const savedId = records[1].id
  await page.reload()
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Night Orchard", exact: true }) })
    .click()
  await expect(page.getByTestId("scaffold-command")).toContainText("rapier3d")
  await page.getByRole("button", { name: "Edit configuration", exact: true }).first().click()
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Night Orchard")
  await page.getByLabel("Project name", { exact: true }).fill("Moon Orchard")
  await review(page)
  await page.getByRole("button", { name: "Save configuration", exact: true }).click()
  await page.getByRole("button", { name: "Open project", exact: true }).click()
  expect(
    await page.evaluate(
      ({ key, savedId }) => JSON.parse(localStorage.getItem(key)!).find((p: { id: string }) => p.id === savedId).name,
      { key, savedId }
    )
  ).toBe("Moon Orchard")
  await navigate(page, "Settings")
  await page.getByLabel("Project name", { exact: true }).fill("Moon Garden")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByText("Settings saved.", { exact: true })).toBeVisible()
  await navigate(page, "Dashboard")
  await expect(page.getByRole("heading", { name: "Moon Garden", exact: true })).toBeVisible()
  await page.screenshot({ path: `work/persisted-dashboard-${testInfo.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test("creates the first project without losing the success screen and keeps operational pages empty", async ({
  page
}) => {
  await page.goto(appStory)
  await create(page, "Emberfall")
  await review(page)
  await page.getByRole("button", { name: "Create project", exact: true }).click()
  await page.getByRole("button", { name: "Open project", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Emberfall", exact: true })).toBeVisible()
  await navigate(page, "Deployments")
  await expect(page.getByRole("button", { name: "Deploy", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Rollback", exact: true })).toBeDisabled()
  await page.getByRole("tab", { name: "Releases", exact: true }).click()
  await expect(page.getByText("No releases yet", { exact: true })).toBeVisible()
  await navigate(page, "Domains")
  await expect(page.getByRole("button", { name: "Connect domain", exact: true }).first()).toBeEnabled()
  await expect(page.getByRole("button", { name: "Copy SpawnKit domain", exact: true })).toHaveCount(0)
  await navigate(page, "Logs")
  await expect(page.getByText("No logs yet", { exact: true })).toBeVisible()
  await expect(page.getByText("Live stream", { exact: true })).toHaveCount(0)
  await navigate(page, "Dashboard")
  await create(page, "Emberfall")
  await review(page)
  await page.getByRole("button", { name: "Create project", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("already exists")
})

test("keeps unsaved choices when browser storage rejects a write", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError")
    }
  })
  await page.goto(appStory)
  await create(page, "Emberfall")
  await review(page)
  await page.getByRole("button", { name: "Create project", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Your changes were not saved")
  await expect(page.getByRole("heading", { name: "Emberfall is ready", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Emberfall")
})

test("preserves unreadable existing storage and blocks writes", async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(key, "unreadable-projects")
    },
    { key }
  )
  await page.goto(appStory)
  await expect(page.getByRole("alert")).toContainText("Existing data has been kept")
  await expect(page.getByRole("button", { name: "Create project", exact: true }).first()).toBeDisabled()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe("unreadable-projects")
})

test("isolates accounts and synchronizes project additions between tabs", async ({ page, context }) => {
  await page.addInitScript(
    (configuration) =>
      localStorage.setItem(
        "spawn:workspaces:v1:another-user",
        JSON.stringify([{ id: "private", name: "Other account project", configuration }])
      ),
    { ...defaultProjectDraft, name: "Other account project" }
  )
  await page.goto(appStory)
  await expect(page.getByRole("heading", { name: "Other account project", exact: true })).toHaveCount(0)
  const second = await context.newPage()
  await second.goto(appStory)
  await expect(second.getByRole("heading", { name: "Your first game starts here", exact: true })).toBeVisible()
  await create(page, "Shared Tab Project")
  await review(page)
  await page.getByRole("button", { name: "Create project", exact: true }).click()
  await expect(second.getByRole("heading", { name: "Shared Tab Project", exact: true })).toBeVisible()
  await expect(second.getByRole("heading", { name: "Other account project", exact: true })).toHaveCount(0)
})

test("filters starter kits and exposes current template options in the guided flow", async ({ page }) => {
  await page.goto(appStory)
  await page.getByRole("button", { name: "Create project", exact: true }).first().click()
  await page.getByRole("button", { name: "3D", exact: true }).click()
  await expect(page.getByRole("button", { name: "Select PixiJS", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Select Three.js", exact: true }).click()
  await expect(page.getByRole("button", { name: "Select Three.js", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByLabel("Project name", { exact: true }).fill("Skyward")
  await page.locator("summary").filter({ hasText: "Customize your stack" }).click()
  for (const name of ["Playwright", "Storybook"])
    await expect(page.getByRole("checkbox", { name, exact: true })).toBeDisabled()
  await expect(page.getByRole("radio", { name: "React", exact: true })).toBeDisabled()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("checkbox", { name: "Enable Sandbox", exact: true }).check()
  await expect(page.getByTestId("estimated-total")).toHaveText("$5.00/mo")
  await expect(page.getByRole("region", { name: "Sandbox regions", exact: true })).toHaveCount(0)
})

test("copies the generated command and reports clipboard failure", async ({ page, context }) => {
  await page.goto(appStory)
  await create(page, "Emberfall")
  await review(page)
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.getByRole("button", { name: "Copy scaffold command", exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "npx @spawnkit/cli init emberfall --add pixi,no-physics,html-ui,no-telemetry,vitest,no-ecs"
  )
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Denied")
        }
      }
    })
  })
  await page.getByRole("button", { name: "Command copied", exact: true }).click()
  await expect(page.getByRole("status").filter({ hasText: "Clipboard unavailable" })).toBeVisible()
})

test("protects the dashboard and presents Clerk sign-in", async ({ page }, testInfo) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/sign-in/)
  await expect(page.getByRole("heading", { name: "Sign in to SpawnKit", exact: true })).toBeAttached()
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toHaveCount(0)
  if (!(await page.getByText("Authentication setup required", { exact: true }).isVisible())) {
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled({ timeout: 30_000 })
    await expect(page.locator(".cl-signIn-root")).toHaveCount(0)
    await page.getByRole("button", { name: "Sign in with an email code", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("Enter your email address")
    await page.getByRole("button", { name: "Create an account", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Create your account", exact: true })).toBeVisible()
    await expect(page.getByLabel("Username", { exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "new-password")
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await page.getByRole("button", { name: "Forgot password?", exact: true }).click()
    await expect(page.getByRole("button", { name: "Send reset code", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Back to sign in", exact: true }).click()
  }
  await expect(page.locator(".login-scene img")).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `work/login-${testInfo.project.name}.png`, fullPage: true })
})
