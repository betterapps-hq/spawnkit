import { mkdir, writeFile } from "node:fs/promises"
import { chromium } from "@playwright/test"

const origin = process.argv[2] ?? "https://spawnkit.cloud"
const interactionMode = process.argv.includes("--interactions")
const paths = process.argv.slice(3).filter((value) => value !== "--interactions")
const browser = await chromium.launch()
const results = []
await mkdir("work", { recursive: true })

async function measureInteractions(page, path) {
  const samples = []
  async function sample(name, action, verify) {
    const since = await page.evaluate(() => performance.now())
    try {
      await action()
      await verify()
      // Let the browser deliver Event Timing entries after the resulting paint.
      await page.waitForTimeout(150)
      const timings = await page.evaluate((start) => {
        window.seoFlushEvents()
        return window.seoEvents.filter((entry) => entry.startTime >= start)
      }, since)
      samples.push({
        name,
        completed: true,
        longestEventMs: timings.length ? Math.max(...timings.map((entry) => entry.duration)) : null,
        timings
      })
    } catch (error) {
      samples.push({ name, completed: false, error: error.message })
    }
  }
  const openMenu = page.getByRole("button", { name: "Open menu", exact: true })
  await sample(
    "Open mobile menu",
    () => openMenu.click(),
    () => page.getByRole("navigation", { name: "Mobile navigation", exact: true }).waitFor({ state: "visible" })
  )
  await sample(
    "Close mobile menu",
    () => page.getByRole("button", { name: "Close menu", exact: true }).click(),
    () => page.getByRole("navigation", { name: "Mobile navigation", exact: true }).waitFor({ state: "hidden" })
  )
  if (new URL(path, origin).pathname === "/templates") {
    await sample(
      "Select Phaser engine",
      () => page.locator('.p-engine-grid label[aria-label="Phaser"]').click(),
      () => page.locator('.p-engine-grid label.is-selected input[value="phaser"]').waitFor({ state: "attached" })
    )
  }
  if (new URL(path, origin).pathname.startsWith("/kits/")) {
    await sample(
      "Expand project files",
      () => page.locator("summary").filter({ hasText: "Project files" }).click(),
      () => page.locator("details[open]").filter({ hasText: "Project files" }).waitFor({ state: "visible" })
    )
  }
  return samples
}

async function measureGameFrame(page) {
  const player = page.locator(".hosted-player iframe")
  if (!(await player.count())) return null
  const iframe = await player.elementHandle()
  if (!iframe) return null
  const frame = await iframe.contentFrame()
  if (!frame) return { loaded: false, gameplayReady: null, reason: "Game frame is unavailable." }
  const topOrigin = await page.evaluate(() => performance.timeOrigin)
  const ready = await page.evaluate(() => window.seoGameReady)
  const observed = await frame.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0]
    return {
      url: location.origin + location.pathname,
      documentReadyState: document.readyState,
      loadEventEnd: navigation?.loadEventEnd ?? 0,
      timeOrigin: performance.timeOrigin,
      canvasCount: document.querySelectorAll("canvas").length,
      resources: performance.getEntriesByType("resource").map((entry) => ({
        url: entry.name.split("?")[0],
        transferBytes: entry.transferSize,
        decodedBytes: entry.decodedBodySize,
        startTime: entry.startTime,
        responseEnd: entry.responseEnd
      }))
    }
  })
  return {
    ...observed,
    loaded: observed.loadEventEnd > 0,
    frameLoadAfterNavigationMs:
      observed.loadEventEnd > 0 ? Math.round(observed.timeOrigin - topOrigin + observed.loadEventEnd) : null,
    gameplayReady: ready ? true : null,
    gameplayReadyAfterNavigationMs: ready ? Math.round(ready.time) : null,
    reason: ready
      ? "Version 1 game-ready message verified against the player frame and its exact origin."
      : "No verified game-ready message was received; document load and canvas presence do not establish gameplay readiness."
  }
}

try {
  for (const path of paths.length ? paths : ["/", "/create", "/templates", "/cloud"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true
    })
    // Lab visits must not increase the real catalog's view/play counters.
    await context.route("**/api/platform/v1/games/*/activity", (route) =>
      route.fulfill({ status: 200, json: { views: 0, plays: 0 } })
    )
    // Keep beacon execution realistic without mixing synthetic visits into field reports.
    await context.route("**/cdn-cgi/rum*", (route) => route.fulfill({ status: 204 }))
    const page = await context.newPage()
    page.setDefaultTimeout(10000)
    const cdp = await context.newCDPSession(page)
    await cdp.send("Network.enable")
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200000,
      uploadThroughput: 93750
    })
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
    await page.addInitScript(() => {
      window.seoGameReady = null
      window.addEventListener("message", (event) => {
        const frame = document.querySelector(".hosted-player iframe")
        if (
          !frame ||
          event.source !== frame.contentWindow ||
          event.origin !== new URL(frame.src).origin ||
          event.data?.type !== "spawnkit:ready" ||
          event.data?.version !== 1
        )
          return
        window.seoGameReady ??= { time: performance.now(), origin: event.origin }
      })
      window.seoVitals = { lcp: 0, cls: 0 }
      window.seoEvents = []
      const eventObservers = []
      const collectEvents = (entries) => {
        for (const entry of entries) {
          if (!entry.interactionId && entry.entryType !== "first-input") continue
          window.seoEvents.push({
            name: entry.name,
            interactionId: entry.interactionId,
            startTime: entry.startTime,
            duration: entry.duration,
            inputDelay: entry.processingStart - entry.startTime,
            processingDuration: entry.processingEnd - entry.processingStart
          })
        }
      }
      for (const type of ["event", "first-input"]) {
        if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue
        const observer = new PerformanceObserver((list) => collectEvents(list.getEntries()))
        observer.observe({ type, buffered: true, ...(type === "event" ? { durationThreshold: 16 } : {}) })
        eventObservers.push(observer)
      }
      window.seoFlushEvents = () => eventObservers.forEach((observer) => collectEvents(observer.takeRecords()))
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.seoVitals.lcp = entry.startTime
          window.seoVitals.lcpElement = entry.element?.tagName
          window.seoVitals.lcpUrl = entry.url
        }
      }).observe({ type: "largest-contentful-paint", buffered: true })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.seoVitals.cls += entry.value
      }).observe({ type: "layout-shift", buffered: true })
    })
    const failures = []
    const networkFailures = []
    const gameDocuments = []
    page.on("pageerror", (error) => failures.push(error.message))
    page.on("requestfailed", (request) =>
      networkFailures.push({ url: request.url().split("?")[0], error: request.failure()?.errorText })
    )
    page.on("response", (response) => {
      const request = response.request()
      if (request.resourceType() === "document" && request.frame().parentFrame())
        gameDocuments.push({ url: response.url().split("?")[0], status: response.status() })
      if (response.status() >= 400)
        networkFailures.push({ url: response.url().split("?")[0], status: response.status() })
    })
    const observationWarnings = []
    const response = await page.goto(new URL(path, origin).href, { waitUntil: "domcontentloaded", timeout: 60000 })
    const player = page.locator(".hosted-player iframe")
    if (await player.count()) {
      const element = await player.elementHandle()
      const frame = await element?.contentFrame()
      if (frame) {
        await frame
          .waitForURL(new URL(await player.getAttribute("src")).href, { waitUntil: "load", timeout: 45000 })
          .catch(() => observationWarnings.push("Game frame did not complete document load within 45 seconds."))
      }
    }
    // Third-party authentication probes may never settle. Keep useful measurements and
    // report a bounded observation instead of discarding the whole audit.
    await page
      .waitForLoadState("networkidle", { timeout: 5000 })
      .catch(() => observationWarnings.push("Network remained active after the five-second idle wait."))
    await page.waitForTimeout(2000)
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0]
      const resources = performance.getEntriesByType("resource")
      return {
        ...window.seoVitals,
        ttfb: navigation.responseStart,
        resources: resources.map((entry) => ({
          url: entry.name,
          transferBytes: entry.transferSize,
          startTime: entry.startTime,
          responseEnd: entry.responseEnd
        })),
        scripts: resources
          .filter((entry) => /\.js(?:\?|$)/.test(entry.name))
          .map((entry) => ({
            url: entry.name,
            transferBytes: entry.transferSize,
            decodedBytes: entry.decodedBodySize
          })),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        heading: document.querySelector("h1")?.textContent
      }
    })
    const gameFrame = await measureGameFrame(page)
    await page.screenshot({
      path: `work/seo-mobile-${path.replace(/[^a-z0-9]+/gi, "-") || "home"}.png`,
      fullPage: true
    })
    const interactions = interactionMode ? await measureInteractions(page, path) : []
    const result = {
      path,
      status: response.status(),
      ...metrics,
      failures,
      networkFailures,
      gameDocuments,
      observationWarnings,
      gameFrame,
      interactions
    }
    results.push(result)
    console.log(
      JSON.stringify({
        path,
        status: result.status,
        lcp: Math.round(result.lcp),
        cls: result.cls,
        ttfb: Math.round(result.ttfb),
        scriptTransferBytes: result.scripts.reduce((sum, script) => sum + script.transferBytes, 0),
        failures,
        networkFailureCount: networkFailures.length,
        interactions: interactions.map(({ timings, ...sample }) => sample),
        gameFrame: gameFrame
          ? {
              loaded: gameFrame.loaded,
              frameLoadAfterNavigationMs: gameFrame.frameLoadAfterNavigationMs,
              gameplayReady: gameFrame.gameplayReady,
              gameplayReadyAfterNavigationMs: gameFrame.gameplayReadyAfterNavigationMs
            }
          : null
      })
    )
    await context.close()
  }
} finally {
  await browser.close()
}
const file = `work/seo-performance-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
await writeFile(
  file,
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      origin,
      interactionsEnabled: interactionMode,
      syntheticGameActivitySuppressed: true,
      syntheticRumDeliverySuppressed: true,
      method:
        "Single cold lab load per page, mobile viewport, 4x CPU throttle, 150ms latency and 1.6Mbps download. CLS covers the observed load window. Optional interaction samples report browser Event Timing durations (16ms threshold plus first-input); null means no timing was exposed, not zero latency. These samples are not field INP or p75 measurements. Frame loading is not proof of gameplay readiness.",
      results
    },
    null,
    2
  )
)
console.log(file)
if (
  results.some(
    (result) =>
      result.status >= 400 || result.failures.length || result.interactions.some((sample) => !sample.completed)
  )
)
  process.exitCode = 1
