import { expect, test, type Page } from "@playwright/test"
import { defaultProjectDraft } from "../apps/dashboard/src/components/project/creation-model"
import { testOrigins } from "../scripts/dev-environment.mjs"
const home = `${testOrigins().stories}/iframe.html?id=dashboard-dashboard--home&viewMode=story`
const key = "spawn:workspaces:v1:storybook-user"
async function navigate(page: Page, name: string) {
  if (page.viewportSize()!.width < 1024)
    await page.getByRole("button", { name: "Expand navigation", exact: true }).click()
  await page
    .getByRole("navigation", { name: "Project navigation", exact: true })
    .getByRole("button", { name, exact: true })
    .click()
}
async function openProject(page: Page) {
  await page.addInitScript(
    ({ key, configuration }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify([
            { id: "setup-project", name: "Moon Garden", configuration: { ...configuration, name: "Moon Garden" } },
            {
              id: "other-project",
              name: "Other game",
              configuration: { ...configuration, name: "Other game" },
              domainConfigurations: [{ hostname: "reserved.example.com", environment: "production" }]
            }
          ])
        )
    },
    { key, configuration: defaultProjectDraft }
  )
  await page.goto(home)
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Moon Garden", exact: true }) })
    .click()
}
async function saveConfiguration(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Save configuration", exact: true }).click()
  await page.getByRole("button", { name: "Open project", exact: true }).click()
}

test("domains can be saved before deployment and remain unverified across reload", async ({ page }, testInfo) => {
  await openProject(page)
  await navigate(page, "Domains")
  await expect(page.getByText(/Pull request previews keep their own generated addresses/)).toBeVisible()
  await expect(page.getByText("Assigned on the first deployment.", { exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Connect domain", exact: true }).first().click()
  const form = page.getByRole("dialog", { name: "Connect a domain", exact: true })
  await form.getByLabel("Domain", { exact: true }).fill("reserved.example.com")
  await form.getByRole("button", { name: "Save domain", exact: true }).click()
  await expect(form.getByRole("alert")).toContainText("already configured")
  await form.getByLabel("Domain", { exact: true }).fill("Play.MoonGarden.Example.com.")
  await form.getByRole("button", { name: "Save domain", exact: true }).click()
  const detail = page.getByRole("dialog", { name: "play.moongarden.example.com", exact: true })
  await expect(detail).toContainText("Not verified")
  await expect(detail.getByRole("button", { name: "Check status", exact: true })).toBeDisabled()
  await expect(detail.getByRole("button", { name: "Copy CNAME value", exact: true })).toHaveCount(0)
  await expect(detail.getByRole("button", { name: "Set as primary", exact: true })).toHaveCount(0)
  await page.screenshot({ path: `work/domain-before-deployment-${testInfo.project.name}.png`, animations: "disabled" })
  await page.reload()
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Moon Garden", exact: true }) })
    .click()
  await navigate(page, "Domains")
  await page.getByRole("button", { name: "Set up play.moongarden.example.com", exact: true }).click()
  await expect(detail).toContainText("Not yet verified")
  await detail.getByRole("button", { name: "Remove", exact: true }).click()
  await detail.getByRole("button", { name: "Remove domain", exact: true }).click()
  await expect(detail).toHaveCount(0)
  const records = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
  expect(records[0].domainConfigurations).toEqual([])
  expect(records[1].domainConfigurations).toHaveLength(1)
})

test("Staging and GitHub have direct setup paths without any versions", async ({ page }, testInfo) => {
  await openProject(page)
  await navigate(page, "Deployments")
  await expect(page.getByRole("button", { name: "Deploy", exact: true })).toBeDisabled()
  await page.getByRole("button", { name: "Enable Staging", exact: true }).click()
  await expect(page.getByRole("checkbox", { name: "Enable Sandbox", exact: true })).toBeChecked()
  await expect(page.getByTestId("estimated-total")).toHaveText("$5.00/mo")
  await expect(page.getByRole("region", { name: "Sandbox regions", exact: true })).toHaveCount(0)
  await saveConfiguration(page)
  await navigate(page, "Deployments")
  await expect(page.getByRole("button", { name: "Enable Staging", exact: true })).toHaveCount(0)
  await expect(page.getByRole("group", { name: /^Staging, .*no deployment$/ })).toBeVisible()
  await expect(page.getByRole("group", { name: /^Production, .*no deployment$/ })).toBeVisible()
  await expect(page.getByRole("button", { name: "Deploy", exact: true })).toBeDisabled()
  await page.screenshot({ path: `work/setup-before-deployment-${testInfo.project.name}.png`, animations: "disabled" })
  await page.getByRole("button", { name: "Configure GitHub", exact: true }).click()
  await expect(page.getByRole("radio", { name: "Connect repository", exact: true })).toBeChecked()
  await expect(page.getByRole("button", { name: "Connect GitHub", exact: true })).toBeDisabled()
  await page.getByLabel("Repository URL", { exact: true }).fill("https://github.com/spawn/moon-garden")
  await saveConfiguration(page)
  await navigate(page, "Settings")
  await expect(
    page.getByText("Repository configuration saved. GitHub is not connected.", { exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Configure GitHub", exact: true }).click()
  await expect(page.getByLabel("Repository URL", { exact: true })).toHaveValue("https://github.com/spawn/moon-garden")
  const configuration = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].configuration, key)
  expect(configuration.sandbox).toBe(true)
  expect(configuration.github.mode).toBe("connect")
})

test("DNS setup and primary selection do not require a deployed version", async ({ page }) => {
  await page.goto(
    `${testOrigins().stories}/iframe.html?id=project-dashboard-domains--before-first-deployment&viewMode=story`
  )
  await page.getByRole("button", { name: "Connect domain", exact: true }).first().click()
  const form = page.getByRole("dialog", { name: "Connect a domain", exact: true })
  await form.getByLabel("Domain", { exact: true }).fill("play.prelaunch.example.com")
  await form.getByRole("button", { name: "Continue to DNS", exact: true }).click()
  const detail = page.getByRole("dialog", { name: "play.prelaunch.example.com", exact: true })
  await detail.getByRole("button", { name: "Check status", exact: true }).click()
  await expect(detail).toContainText("Issuing certificate")
  await detail.getByRole("button", { name: "Check status", exact: true }).click()
  await detail.getByRole("button", { name: "Set as primary", exact: true }).click()
  await detail.getByRole("button", { name: "Confirm primary domain", exact: true }).click()
  await expect(detail.getByText("Primary domain", { exact: true })).toBeVisible()
  await expect(detail.getByRole("link", { name: "Visit domain", exact: true })).toHaveCount(0)
})
