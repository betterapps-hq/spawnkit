import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"
import { createServer } from "vite"

for (const path of ["/this-link-does-not-exist", "/games/unknown-game", "/games/snake/unknown-page"]) {
  test(`missing route ${path} offers game discovery`, async ({ page }, info) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { name: "Game not found", exact: true })).toBeVisible()
    await expect(page).toHaveTitle("Game not found — SpawnKit")
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex")
    await expect(page.getByText("Discover more games powered by SpawnKit.", { exact: false })).toBeVisible()
    const discover = page.getByRole("link", { name: "Discover games", exact: true })
    await expect(discover).toHaveAttribute("href", "/")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (path === "/games/unknown-game") {
      await page.screenshot({ path: `work/not-found-${info.project.name}.png`, fullPage: true })
    }
    await discover.click()
    await expect(page.getByRole("heading", { name: "Free browser games" })).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expect(page).not.toHaveTitle("Game not found — SpawnKit")
  })
}

test("404 supports keyboard recovery and the saved light theme", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("spawn:theme", "light"))
  await page.goto("/unknown-game")
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "SpawnKit home" })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Discover games" })).toBeFocused()
  await page.screenshot({ path: `work/not-found-light-${info.project.name}.png`, fullPage: true })
  await page.keyboard.press("Enter")
  await expect(page.getByRole("heading", { name: "Free browser games" })).toBeVisible()
})

test.describe("recovery without JavaScript", () => {
  test.use({ javaScriptEnabled: false })

  test("missing main-site pages render and navigate on the server", async ({ page }) => {
    const response = await page.goto("/games/unknown-game")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { name: "Game not found" })).toBeVisible()
    await page.getByRole("link", { name: "Discover games" }).click()
    await expect(page.getByRole("heading", { name: "Free browser games" })).toBeVisible()
  })

  test("game-host fallback is self-contained and leaves the broken domain", async ({ page }, info) => {
    // Load the actual Worker response through Vite so its bundled CSS is tested as well.
    const server = await createServer({
      configFile: false,
      root: fileURLToPath(new URL("../apps/game-host", import.meta.url)),
      server: { middlewareMode: true, hmr: false },
      ssr: { noExternal: true }
    })
    let response: Response
    try {
      const { gameNotFound } = await server.ssrLoadModule("/src/not-found.ts")
      response = gameNotFound(new Request("https://missing.spawnkit.cloud/old-game"))
    } finally {
      await server.close()
    }
    const body = await response.text()
    const requests: string[] = []
    page.on("request", (request) => requests.push(request.url()))
    await page.route("https://missing.spawnkit.cloud/**", (route) =>
      route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body })
    )
    await page.route("https://spawnkit.cloud/", (route) =>
      route.fulfill({ contentType: "text/html", body: "<h1>Discovery destination</h1>" })
    )
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
    const result = await page.goto("https://missing.spawnkit.cloud/old-game")
    expect(result?.status()).toBe(404)
    await expect(page.getByRole("heading", { name: "Game not found" })).toBeVisible()
    await expect(page).toHaveTitle("Game not found — SpawnKit")
    expect(
      await page.locator(".spawn-not-found").evaluate((element) => getComputedStyle(element).backgroundColor)
    ).toBe("rgb(19, 18, 23)")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(requests).toEqual(["https://missing.spawnkit.cloud/old-game"])
    await page.screenshot({ path: `work/not-found-host-${info.project.name}.png`, fullPage: true })
    await page.emulateMedia({ colorScheme: "light" })
    expect(
      await page.locator(".spawn-not-found").evaluate((element) => getComputedStyle(element).backgroundColor)
    ).toBe("rgb(250, 249, 252)")
    await page.getByRole("link", { name: "Discover games" }).click()
    await expect(page).toHaveURL("https://spawnkit.cloud/")
  })
})
