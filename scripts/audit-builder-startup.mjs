import { mkdir, writeFile } from "node:fs/promises"
import { chromium } from "@playwright/test"

const origin = process.argv[2] ?? "https://spawnkit.cloud"
const label = process.argv[3] ?? "measurement"
const runs = Number(process.argv[4] ?? 5)
if (!/^[a-z0-9-]+$/.test(label) || !Number.isInteger(runs) || runs < 1 || runs > 20)
  throw new Error("Usage: node scripts/audit-builder-startup.mjs <origin> <label> <runs:1-20>")
await mkdir("work", { recursive: true })
const browser = await chromium.launch()
const samples = []
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const prefix = `work/builder-startup-${label}-${stamp}`
try {
  for (let run = 1; run <= runs; run++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true
    })
    await context.route("**/cdn-cgi/rum*", (route) => route.fulfill({ status: 204 }))
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    const cdp = await context.newCDPSession(page)
    await cdp.send("Network.enable")
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true })
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200000,
      uploadThroughput: 93750
    })
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
    if (run === 1)
      await cdp.send("Tracing.start", {
        categories: "devtools.timeline,blink.user_timing,loading",
        transferMode: "ReturnAsStream"
      })
    await page.addInitScript(() => {
      window.builderMetrics = { lcp: 0, cls: 0, ready: null, longTasks: [] }
      const observer = new MutationObserver(() => {
        if (document.querySelector('.public-site[data-ready="true"]')) {
          window.builderMetrics.ready = performance.now()
          observer.disconnect()
        }
      })
      observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-ready"] })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.builderMetrics.lcp = entry.startTime
          window.builderMetrics.lcpUrl = entry.url
          window.builderMetrics.lcpElement = entry.element?.tagName
        }
      }).observe({ type: "largest-contentful-paint", buffered: true })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.builderMetrics.cls += entry.value
      }).observe({ type: "layout-shift", buffered: true })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          window.builderMetrics.longTasks.push({ start: entry.startTime, duration: entry.duration })
      }).observe({ type: "longtask", buffered: true })
    })
    const response = await page.goto(new URL("/templates", origin).href, { waitUntil: "load", timeout: 60000 })
    await page.locator('.public-site[data-ready="true"]').waitFor({ timeout: 30000 })
    await page.waitForTimeout(2000)
    const sample = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0]
      const resources = performance.getEntriesByType("resource").map((entry) => ({
        url: entry.name,
        bytes: entry.transferSize,
        decodedBytes: entry.decodedBodySize,
        start: entry.startTime,
        end: entry.responseEnd
      }))
      return {
        ...window.builderMetrics,
        ttfb: navigation.responseStart,
        scriptBytes: resources
          .filter((resource) => /\.js(?:\?|$)/.test(resource.url))
          .reduce((sum, resource) => sum + resource.bytes, 0),
        resources,
        overflow: document.documentElement.scrollWidth > innerWidth
      }
    })
    samples.push({ run, status: response.status(), errors, ...sample })
    console.log(
      JSON.stringify({
        run,
        status: response.status(),
        lcp: Math.round(sample.lcp),
        ready: Math.round(sample.ready),
        ttfb: Math.round(sample.ttfb),
        scriptBytes: sample.scriptBytes,
        cls: sample.cls,
        errors
      })
    )
    if (run === 1) {
      await page.screenshot({ path: `${prefix}.png` })
      const complete = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve))
      await cdp.send("Tracing.end")
      const { stream } = await complete
      let trace = ""
      while (true) {
        const chunk = await cdp.send("IO.read", { handle: stream })
        trace += chunk.base64Encoded ? Buffer.from(chunk.data, "base64").toString("utf8") : chunk.data
        if (chunk.eof) break
      }
      await cdp.send("IO.close", { handle: stream })
      await writeFile(`${prefix}.trace.json`, trace)
    }
    // Exercise the first real control only after the startup observation window.
    try {
      await page.locator('.p-engine-grid label[aria-label="Phaser"]').click({ timeout: 10000 })
      if (!(await page.getByRole("radio", { name: "Phaser", exact: true }).isChecked()))
        throw new Error("Engine selection did not respond")
    } catch (error) {
      errors.push(error.message)
      await page.screenshot({ path: `${prefix}-run-${run}-error.png` })
    }
    await context.close()
  }
} finally {
  await browser.close()
}
const median = (key) => samples.map((sample) => sample[key]).sort((a, b) => a - b)[Math.floor(samples.length / 2)]
const report = {
  origin,
  capturedAt: new Date().toISOString(),
  browser: browser.version(),
  method:
    "Fresh context per run; cache disabled; 390x844 mobile, DPR 1, 4x CPU, 150ms latency, 1.6Mbps download, 750Kbps upload. RUM suppressed. First run includes a CDP trace in both comparisons. Observe until load + 2 seconds and hydration. Ready measures enabled page controls, not field INP. CLS covers this load window. Engine selection checked after each measurement. Lab medians, not field p75.",
  medians: Object.fromEntries(["lcp", "ready", "ttfb", "scriptBytes", "cls"].map((key) => [key, median(key)])),
  samples
}
await writeFile(`${prefix}.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ file: `${prefix}.json`, medians: report.medians }))
if (samples.some((sample) => sample.status !== 200 || sample.errors.length || sample.overflow)) process.exitCode = 1
