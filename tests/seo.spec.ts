import { expect, test } from "@playwright/test"

test("docs navigation stays below the sticky header while scrolling", async ({ page }, info) => {
  const widths = info.project.name === "mobile" ? [390] : [1440, 1024, 900]
  for (const width of widths) {
    await page.setViewportSize({ width, height: 600 })
    await page.goto("/docs/getting-started")
    await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
    for (const scrollY of [400, 1200]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY)
      const header = await page.locator(".p-header").boundingBox()
      expect(header!.y).toBe(0)
      for (const selector of [".agent-docs-sidebar", ".agent-docs-outline"]) {
        const sidebar = page.locator(selector)
        if (!(await sidebar.isVisible())) continue
        const bounds = await sidebar.boundingBox()
        expect(bounds!.y).toBeGreaterThanOrEqual(header!.height + 16)
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(600 - 16)
        const firstLink = sidebar.getByRole("link").first()
        expect(
          await firstLink.evaluate((link) => {
            const bounds = link.getBoundingClientRect()
            return link.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2))
          })
        ).toBe(true)
      }
    }
    if (width > 760) {
      const sidebar = page.locator(".agent-docs-sidebar")
      await sidebar.getByRole("link", { name: "llms.txt", exact: true }).click({ trial: true })
      await sidebar.evaluate((element) => {
        element.scrollTop = 0
      })
      await sidebar.getByRole("button", { name: /Search docs/ }).click()
      await expect(page.getByRole("dialog", { name: "Search documentation" })).toBeVisible()
      await page.keyboard.press("Escape")
    }
    if (width <= 1180) {
      await page.locator(".agent-docs-mobile-outline summary").click()
    }
    const outline = page.locator(width > 1180 ? ".agent-docs-outline" : ".agent-docs-mobile-outline")
    await outline.getByRole("link", { name: "2. Run the game", exact: true }).click()
    await expect(page).toHaveURL(/#run-locally$/)
    const heading = await page.getByRole("heading", { name: "2. Run the game", exact: true }).boundingBox()
    const header = await page.locator(".p-header").boundingBox()
    expect(heading!.y).toBeGreaterThanOrEqual(header!.height + 16)
    await page.screenshot({ path: `work/docs-sticky-${width}.png` })
  }
})

test("standalone workflows, docs groups and search dismissal are usable", async ({ page, request }, info) => {
  for (const slug of ["create-with-cli", "upload-existing-game", "dashboard", "codex", "claude-code", "cursor"]) {
    const response = await request.get(`/docs/${slug}`)
    expect(response.status()).toBe(200)
    const markdown = await (await request.get(`/docs/${slug}.md`)).text()
    expect(markdown).not.toContain("pnpm --filter")
    expect(markdown).not.toContain("packages/cli/dist")
  }
  await page.goto("/docs/getting-started")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  if (info.project.name === "mobile") await page.getByText("Browse documentation", { exact: true }).click()
  const nav = page.getByRole("navigation", {
    name: info.project.name === "mobile" ? "Mobile documentation" : "Documentation",
    exact: true
  })
  for (const label of ["Build", "Guides", "Reference"])
    await expect(nav.getByText(label, { exact: true })).toBeVisible()
  const trigger = page.getByRole("button", { name: /Search docs/ }).filter({ visible: true })
  await trigger.focus()
  expect(await trigger.evaluate((element) => parseFloat(getComputedStyle(element).outlineOffset))).toBeLessThanOrEqual(
    0
  )
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Search documentation" })
  await dialog.getByRole("searchbox").fill("existing browser game")
  await expect(dialog.getByRole("link").first()).toBeVisible()
  await dialog.getByRole("searchbox").click()
  await expect(dialog).toBeVisible()
  await page.screenshot({ path: `work/docs-fixes-search-${info.project.name}.png` })
  await page.mouse.click(2, 2)
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(dialog.getByRole("searchbox")).toHaveValue("")
  await dialog.getByRole("button", { name: "Close search" }).click()
  await expect(dialog).not.toBeVisible()
  await trigger.click()
  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()
})

test("reference guides expose highlighted code and keyboard-accessible example tabs", async ({
  page,
  context,
  request
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  for (const slug of ["cli", "project-structure", "publishing-examples", "testing", "updating"]) {
    const response = await request.get(`/docs/${slug}`)
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('class="docs-token"')
    await page.goto(`/docs/${slug}`)
    await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const markdown = await (await request.get(`/docs/${slug}.md`)).text()
    await page.getByRole("button", { name: "Copy as Markdown", exact: true }).click()
    await expect
      .poll(async () => (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"))
      .toBe(markdown)
  }
  await page.goto("/docs/publishing-examples")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  const formats = page.getByRole("tablist", { name: "Game listing format" })
  await formats.getByRole("tab", { name: "TypeScript", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(formats.getByRole("tab", { name: "JSON", exact: true })).toBeFocused()
  await expect(formats.getByRole("tab", { name: "JSON", exact: true })).toHaveAttribute("aria-selected", "true")
  const panel = page.getByRole("tabpanel", { name: "JSON", exact: true })
  const source = await panel.locator("pre code").textContent()
  expect(JSON.parse(source!).title).toBe("Golden Dash")
  await panel.getByRole("button", { name: "Copy JSON", exact: true }).click()
  await expect
    .poll(async () => (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"))
    .toBe(source)
  const colors = []
  for (const theme of ["light", "dark"]) {
    await page.getByRole("button", { name: "Change theme" }).click()
    await page.getByRole("menuitemradio", { name: theme === "light" ? "Light" : "Dark", exact: true }).click()
    await expect(panel).toBeVisible()
    colors.push(
      await panel
        .locator(".docs-token")
        .evaluateAll((tokens) => [...new Set(tokens.map((token) => getComputedStyle(token).color))])
    )
    expect(colors.at(-1)!.length).toBeGreaterThan(1)
    await page.screenshot({ path: `work/docs-reference-${theme}-${info.project.name}.png`, fullPage: true })
  }
  expect(colors[0]).not.toEqual(colors[1])
  await expect(page.locator("[data-brand-wordmark]").first()).toHaveText("SpawnKit")
  await page.keyboard.press("Control+k")
  await page.getByRole("searchbox").fill("ownership record")
  await expect(page.getByRole("dialog").getByRole("link", { name: /Handle conflicts/ })).toBeVisible()
})

test("documentation hierarchy, navigation and examples work in both themes", async ({ page, context }, info) => {
  test.setTimeout(60_000)
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  for (const theme of ["light", "dark"]) {
    await page.goto("/docs/getting-started")
    await page.getByRole("button", { name: "Change theme" }).click()
    await page.getByRole("menuitemradio", { name: theme === "light" ? "Light" : "Dark", exact: true }).click()
    for (const slug of ["getting-started", "extend", "publishing", "authentication", "api"]) {
      await page.goto(`/docs/${slug}`)
      await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
      const sizes = await page.locator("article").evaluate((article) => ({
        title: parseFloat(getComputedStyle(article.querySelector("h1")!).fontSize),
        section: parseFloat(getComputedStyle(article.querySelector("h2")!).fontSize),
        width: document.documentElement.scrollWidth,
        viewport: innerWidth
      }))
      expect(sizes.title).toBeLessThanOrEqual(38)
      expect(sizes.section).toBeLessThanOrEqual(23)
      expect(sizes.title).toBeGreaterThan(sizes.section)
      expect(sizes.width).toBeLessThanOrEqual(sizes.viewport)
      const markdown = await (await page.request.get(`/docs/${slug}.md`)).text()
      await page.getByRole("button", { name: "Copy as Markdown", exact: true }).click()
      await expect
        .poll(async () => (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"))
        .toBe(markdown)
      if (slug === "getting-started" || slug === "publishing")
        await page.screenshot({ path: `work/docs-redesign-${slug}-${theme}-${info.project.name}.png`, fullPage: true })
      if (slug === "getting-started")
        await page.screenshot({ path: `work/docs-redesign-overview-${theme}-${info.project.name}.png` })
    }
  }
  await page.goto("/docs/getting-started")
  await page.getByRole("button", { name: "Copy Terminal · inside your game folder", exact: true }).click()
  await expect
    .poll(async () => (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"))
    .toBe("pnpm install\npnpm dev")
  if (info.project.name === "mobile") {
    await page.getByText("Browse documentation", { exact: true }).click()
    await page
      .getByRole("navigation", { name: "Mobile documentation", exact: true })
      .getByRole("link", { name: "Publish your game" })
      .click()
    await page.locator(".agent-docs-mobile-outline summary").click()
    await page.locator(".agent-docs-mobile-outline").getByRole("link", { name: "3. Upload and deploy" }).click()
  } else {
    await page
      .getByRole("navigation", { name: "Documentation", exact: true })
      .getByRole("link", { name: "Publish your game" })
      .click()
    await page
      .getByRole("navigation", { name: "On this page", exact: true })
      .getByRole("link", { name: "3. Upload and deploy" })
      .click()
  }
  await expect(page).toHaveURL(/\/docs\/publishing#upload$/)
  await expect(page.getByRole("heading", { name: "3. Upload and deploy", exact: true })).toBeInViewport()
  await expect(page.getByRole("link", { name: "Upload game", exact: true })).toHaveAttribute(
    "href",
    "/dashboard/upload"
  )
  await page
    .getByRole("navigation", { name: "Related guides" })
    .getByRole("link", { name: /Next guide/ })
    .click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Use the SpawnKit dashboard")
  await page.getByRole("button", { name: /Search docs/ }).click()
  const search = page.getByRole("dialog", { name: "Search documentation" })
  await expect(search.getByRole("searchbox")).toBeFocused()
  await search.getByRole("searchbox").fill("missing index.html")
  await page.screenshot({ path: `work/docs-redesign-search-${info.project.name}.png` })
  await search.getByRole("searchbox").press("ArrowDown")
  await expect(search.getByRole("link", { name: /Fix a failed upload/ })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/docs\/publishing#upload-troubleshooting$/)
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await page.keyboard.press("Control+k")
  await search.getByRole("searchbox").fill("no-matching-guide-123")
  await expect(search.getByText(/No sections match/)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(search).not.toBeVisible()
})

test("agent documentation, catalog and optional attribution are usable", async ({ request, page }, info) => {
  for (const path of [
    "/llms.txt",
    "/auth.md",
    "/catalog/v1.json",
    "/openapi.json",
    "/skills/spawnkit/SKILL.md",
    "/downloads/skills/spawnkit.zip"
  ]) {
    expect((await request.get(path)).status()).toBe(200)
    expect((await request.head(path)).status()).toBe(200)
    expect((await request.post(path)).status()).toBe(405)
  }
  const response = await request.get("/docs/getting-started")
  expect(await response.text()).toContain("Go from a starter kit to a playable browser game")
  await page.goto("/docs/getting-started")
  await expect(page.getByRole("heading", { name: "Build your first game", exact: true })).toBeVisible()
  await expect(page.locator('link[rel="alternate"]')).toHaveAttribute("href", "/docs/getting-started.md")
  await page.getByRole("button", { name: "Copy as Markdown" }).click()
  await expect(page.getByRole("status").filter({ hasText: /Copied Markdown|Copy unavailable/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `work/seo-agent-docs-${info.project.name}.png`, fullPage: true })
  await page.goto("/kits/phaser")
  const checkbox = page.getByRole("checkbox", {
    name: "Help measure whether this download leads to a first deployment."
  })
  await expect(checkbox).not.toBeChecked()
  const download = page.getByRole("link", { name: "Download Phaser game starter", exact: true })
  await expect(download).toHaveAttribute("href", "/downloads/kits/phaser.zip")
  await checkbox.check()
  await expect(download).toHaveAttribute("href", "/downloads/kits/phaser.zip?attribution=1")
  await checkbox.uncheck()
  await expect(download).toHaveAttribute("href", "/downloads/kits/phaser.zip")
  expect((await request.get("/docs/unknown")).status()).toBe(404)
})

test.beforeEach(async ({ request, page }) => {
  await request.post("http://127.0.0.1:5197/fixture")
  await page.route("**/api/platform/v1/games/**", (route) =>
    route.fulfill({ json: { rating: 0, reviews: 0, comments: [], views: 0, plays: 0 } })
  )
  await page.route("https://fixture.spawnkit.games/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html><body>Game fixture</body></html>" })
  )
})

test("public metadata and useful content exist in initial HTML", async ({ request, page }, info) => {
  for (const path of [
    "/",
    "/create",
    "/templates",
    "/cloud",
    "/about",
    "/help",
    "/community-guidelines",
    "/privacy",
    "/terms"
  ]) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('name="description"')
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
    expect(html).toContain(`href="https://spawnkit.cloud${path}"`)
    expect(html).toContain('property="og:url"')
    expect(html).toContain("application/ld+json")
    expect(html).toContain("<h1")
    await page.goto(path)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://spawnkit.cloud${path}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goto("/create")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await page.screenshot({ path: `work/seo-create-${info.project.name}.png`, fullPage: true })
  await page.getByRole("link", { name: "Start with a kit", exact: true }).first().click()
  await expect(page).toHaveURL(/\/templates\?engine=pixi/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://spawnkit.cloud/templates")
})

test("approved games get metadata; hidden and missing games retain their policies", async ({ request, page }) => {
  const response = await request.get("/play/seo-game")
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain("Collect apples using the arrow keys.")
  expect(html).toContain("https://fixture.spawnkit.games/cover.webp")
  await page.goto("/play/seo-game")
  await expect(page).toHaveTitle("Orchard Snake — Play free on SpawnKit")
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://spawnkit.cloud/play/seo-game")
  const graph = await page
    .locator('script[type="application/ld+json"]')
    .evaluate((element) => JSON.parse(element.textContent!))
  expect(graph["@graph"].find((entry: { "@type": string }) => entry["@type"] === "VideoGame").name).toBe(
    "Orchard Snake"
  )
  await page.goto("/play/hidden")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow")
  expect((await request.get("/play/missing")).status()).toBe(404)
  const unavailable = await request.get("/play/unavailable")
  expect(unavailable.status()).toBe(503)
  expect(await unavailable.text()).toContain("Game temporarily unavailable")
})

test("search URLs keep the clean canonical and temporary failures keep an honest page", async ({ page, request }) => {
  await page.goto("/?q=snake&sort=az")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow")
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://spawnkit.cloud/")
  await request.post("http://127.0.0.1:5197/fixture?unavailable=true")
  const response = await page.goto("/")
  expect(response?.status()).toBe(503)
  expect(response?.headers()["retry-after"]).toBe("60")
  await expect(page.getByRole("heading", { name: "Games are temporarily unavailable" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "No games found" })).toHaveCount(0)
  await page.getByRole("link", { name: "Explore starter kits", exact: true }).click()
  await expect(page).toHaveURL(/\/templates$/)
})

test("nonproduction crawl policy, HTTP methods and current routes", async ({ request }) => {
  const robots = await request.get("/robots.txt")
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n")
  expect((await request.head("/robots.txt")).status()).toBe(200)
  expect((await request.post("/robots.txt")).status()).toBe(405)
  expect((await request.get("/sitemap.xml")).status()).toBe(404)
  for (const path of ["/create", "/sign-in", "/dashboard", "/unknown"])
    expect((await request.get(path, { maxRedirects: 0 })).headers()["x-robots-tag"]).toContain("noindex")
  for (const path of ["/pricing", "/games/snake", "/submissions", "/admin/submissions", "/dashboard/review"]) {
    const removed = await request.get(path, { maxRedirects: 0 })
    expect(removed.status()).toBe(404)
    expect(removed.headers().location).toBeUndefined()
  }
})

test.describe("JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false })
  test("public pages explain their purpose and link to working destinations", async ({ page }) => {
    await page.goto("/create")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.getByRole("link", { name: "Start with a kit", exact: true }).first().click()
    await expect(page.getByRole("heading", { name: "Start with a kit", exact: true })).toBeVisible()
  })
})

test("curated kit pages have unique initial content, working downloads and related links", async ({
  page,
  request
}, info) => {
  for (const id of ["pixi", "phaser", "babylon", "three", "phaser-arcade", "three-rapier"]) {
    const response = await request.get(`/kits/${id}`)
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain(`href="https://spawnkit.cloud/kits/${id}"`)
    expect(html).toContain("Preview the generated project")
    expect(html).toContain("Node.js")
    const download = await request.get(`/downloads/kits/${id}.zip`)
    expect(download.status()).toBe(200)
    expect(download.headers()["content-type"]).toBe("application/zip")
    expect((await download.body()).subarray(0, 2).toString()).toBe("PK")
  }
  expect((await request.get("/kits/fake")).status()).toBe(404)
  await page.goto("/kits/phaser-arcade")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Phaser Arcade Physics starter")
  await expect(page.getByRole("link", { name: /^Phaser game starter/ })).toHaveAttribute("href", "/kits/phaser")
  const downloadEvent = page.waitForEvent("download")
  await page.getByRole("link", { name: "Download Phaser Arcade Physics starter" }).click()
  expect((await downloadEvent).suggestedFilename()).toBe("phaser-arcade-game.zip")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `work/seo-kit-${info.project.name}.png`, fullPage: true })
})

test("catalog pages are crawlable, self canonical and gated by real inventory", async ({ request, page }) => {
  expect((await request.get("/categories/arcade")).status()).toBe(404)
  await request.post("http://127.0.0.1:5197/fixture?count=30")
  await page.goto("/browse")
  await page.getByRole("link", { name: "Next page" }).click()
  await expect(page).toHaveURL(/\/browse\?page=2$/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://spawnkit.cloud/browse?page=2")
  await expect(page.getByRole("link", { name: "Previous page" })).toHaveAttribute("href", "/browse")
  expect((await request.get("/browse?page=3")).status()).toBe(404)
  expect((await request.get("/browse?page=0")).status()).toBe(404)
  expect((await request.get("/browse?page=1", { maxRedirects: 0 })).status()).toBe(301)
  await page.goto("/categories/arcade")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arcade browser games")
  await page.getByRole("link", { name: "Next page" }).click()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://spawnkit.cloud/categories/arcade?page=2"
  )
  await page.goto("/play/seo-game")
  await expect(page.getByText("Collect every apple", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "More arcade games" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Phaser game starter", exact: true })).toHaveAttribute(
    "href",
    "/kits/phaser"
  )
  await request.post("http://127.0.0.1:5197/fixture?unavailable=true")
  expect((await request.get("/browse")).status()).toBe(503)
})

test("footer destinations and content layouts have complete navigation", async ({ page, request }, info) => {
  test.setTimeout(90_000)
  await page.goto("/about")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  const footer = page.locator("footer")
  await expect(footer).not.toContainText("&")
  await expect(footer).not.toContainText("Made for the web")
  await expect(footer).not.toContainText("Â")
  await expect(footer.locator(".p-social-links")).toHaveCount(0)
  await expect(footer).toContainText("Discover browser games. Create and publish your own with AI.")
  const hrefs = await footer
    .locator("a")
    .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")!))])
  for (const href of hrefs) {
    expect(href).toMatch(/^\//)
    const url = new URL(href, "http://127.0.0.1:5196")
    const response = await request.get(url.pathname, { maxRedirects: 0 })
    expect(response.status(), href).toBe(200)
    const html = await response.text()
    expect(html, href).not.toMatch(/Â©|â€|�/)
    if (url.hash) expect(html, href).toContain(`id="${url.hash.slice(1)}"`)
  }
  for (const theme of ["Light", "Dark"]) {
    await page.getByRole("button", { name: "Change theme" }).click()
    await page.getByRole("menuitemradio", { name: theme, exact: true }).click()
    for (const path of ["/about", "/help", "/contact", "/community-guidelines", "/privacy", "/terms", "/docs"]) {
      await page.goto(path)
      await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
      await page.evaluate(() => document.fonts.ready)
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
      const home = page
        .getByRole("navigation", { name: "Breadcrumb", exact: true })
        .getByRole("link", { name: "Home", exact: true })
      await expect(home).toHaveAttribute("href", "/")
      await home.focus()
      await expect(home).toBeFocused()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true)
      const title = await page.locator("h1").evaluate((el) => ({
        size: parseFloat(getComputedStyle(el).fontSize),
        family: getComputedStyle(el).fontFamily,
        loaded: document.fonts.check('620 40px "Inter Variable"')
      }))
      expect(title.size).toBeLessThanOrEqual(40)
      expect(title.family).toContain("Inter Variable")
      expect(title.loaded).toBe(true)
      await page.screenshot({ path: `work/content-${path.slice(1)}-${theme.toLowerCase()}-${info.project.name}.png` })
    }
    await footer.screenshot({ path: `work/footer-${theme.toLowerCase()}-${info.project.name}.png` })
  }
  await page
    .getByRole("navigation", { name: "Breadcrumb", exact: true })
    .getByRole("link", { name: "Home", exact: true })
    .click()
  await expect(page).toHaveURL("/")
})

test("documentation is discoverable and every guide loads highlighted examples without runtime errors", async ({
  page
}, info) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/about")
  await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await page
    .getByRole("navigation", {
      name: info.project.name === "mobile" ? "Mobile navigation" : "Main navigation",
      exact: true
    })
    .getByRole("link", { name: "Documentation", exact: true })
    .click()
  await expect(page).toHaveURL(/\/docs\/?$/)
  const links = await page
    .locator("article .p-resource-link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!))
  expect(links).toHaveLength(16)
  expect(new Set(links).size).toBe(16)
  for (const href of links) {
    const response = await page.goto(href)
    expect(response?.status(), href).toBe(200)
    await expect(page.locator(".public-site")).toHaveAttribute("data-ready", "true")
    await expect(page.locator("article h1")).toBeVisible()
    await expect(page.locator("vite-error-overlay")).toHaveCount(0)
    if (await page.locator("article pre code").count())
      expect(await page.locator(".docs-token").count(), href).toBeGreaterThan(0)
  }
  expect(errors).toEqual([])
})
