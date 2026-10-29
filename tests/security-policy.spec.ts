import { createServer } from "node:http"
import { expect, test } from "@playwright/test"
import { appSecurityHeaders } from "../apps/dashboard/src/lib/content-security"
import { secureGameResponse } from "../apps/game-host/src/security"

const app = "https://spawnkit.cloud"
const game = "https://d-12345678.security-fixture.spawnkit.games"

test("CLI consent can submit to its identity provider and return to the fixed loopback callback", async ({
  page
}, info) => {
  test.skip(info.project.name !== "desktop", "The fixed CLI callback port is shared by browser projects")
  const callback = "http://127.0.0.1:43819/callback"
  const provider = "https://clerk.spawnkit.cloud"
  const policy = appSecurityHeaders(crypto.randomUUID(), `pk_live_${btoa("clerk.spawnkit.cloud$")}`, true)
  await page.route("**/*", (route) => {
    const url = route.request().url()
    if (url === `${app}/cli/authorize`)
      return route.fulfill({
        contentType: "text/html",
        headers: policy,
        body: `<form method="POST" action="${provider}/consent-fixture"><button>Allow test CLI</button></form>`
      })
    if (url === `${provider}/consent-fixture`) return route.fulfill({ status: 303, headers: { location: callback } })
    if (url === callback) return route.fulfill({ contentType: "text/html", body: "<h1>CLI connected</h1>" })
    return route.abort()
  })
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" })
    response.end("<h1>CLI connected</h1>")
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(43819, "127.0.0.1", resolve)
  })
  try {
    await page.goto(`${app}/cli/authorize`)
    await page.getByRole("button", { name: "Allow test CLI" }).click()
    await expect(page.getByRole("heading", { name: "CLI connected" })).toBeVisible()
    expect(page.url()).toBe(callback)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test("browser enforces app CSP and the game's sandbox and network policy", async ({ page }) => {
  const nonce = crypto.randomUUID()
  let forbiddenRequests = 0
  await page.route("**/*", async (route) => {
    const url = route.request().url()
    if (url === `${app}/security-fixture`) {
      return route.fulfill({
        contentType: "text/html",
        headers: appSecurityHeaders(nonce),
        body: `
        <h1>Security fixture</h1>
        <script nonce="${nonce}">window.results = []; window.addEventListener('message', e => { if (e.origin === '${game}') window.results.push(e.data) });</script>
        <script>document.body.dataset.inlineAttack = 'ran'</script>
        <script src="${game}/parent-attack.js"></script>
        <iframe title="Test game" sandbox="allow-scripts allow-same-origin" allow="fullscreen; gamepad" src="${game}/"></iframe>`
      })
    }
    if (url === `${game}/`) {
      const response = secureGameResponse(new Response())
      return route.fulfill({
        contentType: "text/html",
        headers: Object.fromEntries(response.headers),
        body: `
        <h1>Game running</h1><button id="escape">Try escape</button>
        <script>
          const send = value => parent.postMessage(value, '${app}');
          try { parent.document.body.dataset.owned = 'yes'; send('parent-access'); } catch { send('parent-blocked'); }
          fetch('https://blocked.invalid/exfiltrate').then(() => send('network-allowed')).catch(() => send('network-blocked'));
          try { eval('1 + 1'); send('eval-allowed'); } catch { send('eval-blocked'); }
          document.querySelector('button').onclick = () => {
            try { top.location = '${app}/escape'; } catch { send('top-blocked'); }
            send(window.open('https://blocked.invalid/popup') === null ? 'popup-blocked' : 'popup-allowed');
          };
          send('game-running');
        </script>`
      })
    }
    forbiddenRequests++
    return route.fulfill({ contentType: "text/javascript", body: "document.body.dataset.externalAttack = 'ran'" })
  })
  await page.goto(`${app}/security-fixture`)
  const frame = page.frameLocator("iframe")
  await expect(frame.getByRole("heading", { name: "Game running" })).toBeVisible()
  await frame.getByRole("button").click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { results: string[] }).results))
    .toEqual(
      expect.arrayContaining([
        "parent-blocked",
        "network-blocked",
        "eval-allowed",
        "top-blocked",
        "popup-blocked",
        "game-running"
      ])
    )
  await expect(page.locator("body")).not.toHaveAttribute("data-inline-attack")
  await expect(page.locator("body")).not.toHaveAttribute("data-external-attack")
  expect(page.url()).toBe(`${app}/security-fixture`)
  expect(forbiddenRequests).toBe(0)
})

test("games cannot read or overwrite account-domain cookies", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "security_fixture",
      value: "synthetic-only",
      domain: ".spawnkit.cloud",
      path: "/",
      secure: true,
      sameSite: "Strict"
    }
  ])
  await page.route(`${game}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      headers: Object.fromEntries(secureGameResponse(new Response()).headers),
      body: "<p>Isolated test fixture</p>"
    })
  )
  await page.goto(`${game}/`)
  expect(await page.evaluate(() => document.cookie)).not.toContain("security_fixture")
  await page.evaluate(() => {
    document.cookie = "security_fixture=changed; Domain=spawnkit.cloud; Path=/; Secure; SameSite=Strict"
  })
  expect((await context.cookies(app)).find((cookie) => cookie.name === "security_fixture")?.value).toBe(
    "synthetic-only"
  )
  expect(await context.cookies(game)).toEqual([])
})
