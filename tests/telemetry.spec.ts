import { execFileSync, spawnSync } from "node:child_process"
import { mkdtemp, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { test, expect } from "@playwright/test"
import { createServer, type ViteDevServer } from "vite"
import { startTelemetryRuntime } from "../apps/telemetry/testing/runtime"
import { testOrigins } from "../scripts/dev-environment.mjs"

test.describe("Scaffolded game telemetry", () => {
  test.setTimeout(120_000)
  let runtime: Awaited<ReturnType<typeof startTelemetryRuntime>>
  let game: ViteDevServer
  let fixture: string
  let gameUrl: string
  const projectId = "project-thornwatch"
  // oxlint-disable-next-line no-empty-pattern -- Playwright requires fixture destructuring even when no fixtures are used.
  test.beforeAll(async ({}, testInfo) => {
    const gamePort = 4197 + testInfo.workerIndex
    gameUrl = `http://127.0.0.1:${gamePort}`
    fixture = await mkdtemp(resolve("work/telemetry-browser-"))
    const gamePath = resolve(fixture, "game")
    execFileSync(
      process.execPath,
      [
        resolve("packages/cli/dist/main.mjs"),
        "create",
        "pixi",
        gamePath,
        "--name",
        "telemetry-acceptance",
        "--telemetry",
        "platform-telemetry",
        "--yes"
      ],
      { stdio: "pipe" }
    )
    const pnpmPath = process.env.npm_execpath
    if (!pnpmPath) throw Error("Run browser acceptance with pnpm exec playwright test.")
    const script = /\.[cm]?js$/.test(pnpmPath)
    const install = spawnSync(script ? process.execPath : pnpmPath, script ? [pnpmPath, "install"] : ["install"], {
      cwd: gamePath,
      stdio: "pipe",
      windowsHide: true,
      timeout: 90_000
    })
    if (install.status !== 0) throw Error(`Fixture install failed: ${String(install.stderr)}`)
    runtime = await startTelemetryRuntime()
    expect(
      (
        await runtime.request("/projects", "POST", {
          id: projectId,
          name: "Telemetry acceptance",
          configuration: { sandbox: true }
        })
      ).status
    ).toBe(201)
    const configuration = await runtime.request(`/projects/${projectId}/telemetry/settings`, "PUT", {
      origins: [gameUrl]
    })
    const configured = (await configuration.json()) as { key: string }
    await writeFile(
      resolve(gamePath, ".env"),
      `VITE_SPAWN_TELEMETRY_ENABLED=true\nVITE_SPAWN_TELEMETRY_ENDPOINT=${runtime.endpoint}\nVITE_SPAWN_TELEMETRY_KEY=${configured.key}\nVITE_SPAWN_RELEASE=acceptance-release\n`
    )
    game = await createServer({
      root: gamePath,
      server: { host: "127.0.0.1", port: gamePort, strictPort: true },
      logLevel: "error"
    })
    await game.listen()
  })
  test.afterAll(async () => {
    await game?.close()
    await runtime?.dispose()
    // Retain standalone fixtures under ignored work/, like the template smoke suite. On Windows
    // Vite's native modules remain locked until this test process exits.
  })
  test("reports real browser events and errors into the authenticated project dashboard", async ({
    page,
    context
  }, testInfo) => {
    const gamePage = await context.newPage()
    await gamePage.goto(gameUrl)
    await expect(gamePage.locator("canvas")).toBeVisible()
    const result = await gamePage.evaluate(async () => {
      const path = "/src/telemetry.ts"
      const telemetry = await import(/* @vite-ignore */ path)
      telemetry.track("consent.denied")
      telemetry.setTelemetryConsent(true)
      telemetry.track("level.completed", { level: 7, score: 1234, token: "must-redact" })
      telemetry.captureError(new Error("Browser save failure"))
      return telemetry.flushTelemetry()
    })
    expect(result.sent).toBe(2)
    await page.route("**/api/platform/v1/**", async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const response = await runtime.request(
        url.pathname.replace("/api/platform/v1", "") + url.search,
        request.method(),
        request.postData() ? JSON.parse(request.postData()!) : undefined
      )
      await route.fulfill({
        status: response.status,
        headers: { "content-type": "application/json" },
        body: await response.text()
      })
    })
    await page.goto(
      `${testOrigins().stories}/iframe.html?id=project-dashboard-management--telemetry-connected&viewMode=story`
    )
    await expect(page.getByRole("heading", { name: "Game telemetry", exact: true })).toBeVisible()
    await expect(page.getByRole("button").filter({ hasText: "level.completed" })).toBeVisible()
    await expect(page.getByRole("button").filter({ hasText: "Browser save failure" })).toBeVisible()
    await expect(page.getByText("consent.denied", { exact: true })).toHaveCount(0)
    await page.getByRole("button").filter({ hasText: "level.completed" }).click()
    await expect(page.getByRole("heading", { name: "Telemetry event", exact: true })).toBeVisible()
    await expect(page.getByText('"score": 1234', { exact: false })).toBeVisible()
    await expect(page.getByText("must-redact", { exact: false })).toHaveCount(0)
    await page.getByRole("button", { name: "Close", exact: true }).click()
    await page.getByRole("combobox", { name: "Telemetry level" }).click()
    await page.getByRole("option", { name: "error", exact: true }).click()
    await expect(page.getByRole("button").filter({ hasText: "level.completed" })).toHaveCount(0)
    await expect(page.getByRole("button").filter({ hasText: "Browser save failure" })).toBeVisible()
    await page.screenshot({ path: `work/telemetry-dashboard-${testInfo.project.name}.png`, fullPage: true })
    expect(
      (await runtime.request(`/projects/${projectId}/telemetry/events`, "GET", undefined, "telemetry-test-other"))
        .status
    ).toBe(404)
    await page.getByText("Telemetry setup ·", { exact: false }).click()
    await page.getByRole("button", { name: "Erase telemetry", exact: true }).click()
    await expect(page.getByText("Erase all telemetry for production", { exact: false })).toBeVisible()
    await page.getByRole("button", { name: "Confirm erasure", exact: true }).click()
    await expect(page.getByRole("button").filter({ hasText: "Browser save failure" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Enable telemetry", exact: true })).toBeVisible()
    const erased = await runtime.request(`/projects/${projectId}/telemetry/events`)
    expect(await erased.json()).toMatchObject({ events: [], used: 2 })
    await gamePage.close()
  })
})
