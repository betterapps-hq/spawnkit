import { expect, test } from "@playwright/test"
import { secureGameResponse } from "../apps/game-host/src/security"

test("published games load with the enforced game CSP", async ({ page, request }, info) => {
  test.skip(process.env.SPAWN_LIVE_CSP !== "1", "Explicit live compatibility check, with no account session")
  test.setTimeout(180_000)
  const catalog = await request.get("https://api.spawnkit.cloud/api/platform/v1/games")
  expect(catalog.ok()).toBe(true)
  const { games } = (await catalog.json()) as { games: { url: string; title: string }[] }
  expect(games.length).toBeGreaterThan(0)
  for (const game of games) {
    const violations: string[] = []
    const errors: string[] = []
    const log = (message: { text(): string }) => {
      if (/violates.*Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text())
    }
    const error = (error: Error) => errors.push(error.message)
    page.on("console", log)
    page.on("pageerror", error)
    if (process.env.SPAWN_CANDIDATE_CSP === "1")
      await page.route(`${new URL(game.url).origin}/**`, async (route) => {
        const response = await route.fetch()
        const headers = secureGameResponse(new Response(null, { headers: response.headers() })).headers
        await route.fulfill({ response, headers: Object.fromEntries(headers) })
      })
    const response = await page.goto(game.url)
    expect(response!.headers()["content-security-policy"], game.title).toContain(
      "sandbox allow-scripts allow-same-origin"
    )
    expect(response!.headers()["permissions-policy"], game.title).toContain("camera=()")
    if (game.title === "Orchard Snake") await page.getByRole("button", { name: "Start game", exact: true }).click()
    if (game.title === "The Art of the Steal")
      await expect(page.getByRole("button").first(), game.title).toBeVisible({ timeout: 30_000 })
    else await expect(page.locator("canvas").first(), game.title).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1200)
    await info.attach(`${game.title} CSP compatibility`, {
      body: JSON.stringify({ title: game.title, violations, errors }, null, 2),
      contentType: "application/json"
    })
    expect.soft(violations, game.title).toEqual([])
    expect.soft(errors, game.title).toEqual([])
    await page.unrouteAll({ behavior: "wait" })
    page.off("console", log)
    page.off("pageerror", error)
  }
})
