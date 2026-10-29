import { expect, test, type Page } from "@playwright/test"
import type { CommunityRole, ReportDetail, TeamData, TeamEvent } from "../packages/platform/src/community"

async function api(page: Page, role: CommunityRole = "Admin") {
  const team: TeamData = {
    role,
    userId: "me",
    members: [
      {
        userId: "me",
        name: "Alex",
        email: "alex@example.com",
        role,
        revision: 0,
        createdAt: "2026-10-17T12:00:00Z",
        cases: 0
      },
      {
        userId: "m",
        name: "Morgan",
        email: "morgan@example.com",
        role: "Moderator",
        revision: 0,
        createdAt: "2026-10-16T12:00:00Z",
        cases: 1
      }
    ],
    invitations: []
  }
  const events: TeamEvent[] = []
  let item: ReportDetail = {
    id: "case-1",
    projectId: "p",
    commentId: "c",
    title: "Orchard Snake",
    kind: "Comment",
    state: "open",
    assigneeId: null,
    assigneeName: null,
    revision: 0,
    createdAt: "2026-10-17T12:00:00Z",
    updatedAt: "2026-10-17T12:00:00Z",
    reports: 1,
    reason: "Spam or advertising",
    contentVersion: "evidence-v1",
    current: { title: "Orchard Snake", author: "Player", body: "Current comment", revision: 0 },
    evidence: [
      {
        id: "report-1",
        reason: "Spam or advertising",
        details: "Repeated promotion",
        snapshot: { title: "Orchard Snake", author: "Player", body: "Original comment", revision: 0 },
        createdAt: "2026-10-17T12:00:00Z"
      }
    ],
    events: [],
    evidenceCursor: null,
    historyCursor: null,
    url: "https://spawn-snake.spawnkit.games"
  }
  let listing = {
    projectId: "p",
    title: "Orchard Snake",
    description: "Collect apples in a sunny orchard.",
    details: { controls: "Arrow keys", creator: "Existing creator" },
    genre: "Arcade",
    dimension: "2D",
    revision: 0,
    overridden: false,
    coverUrl: "/examples/snake.webp",
    trailerUrl: null,
    releaseId: "r",
    warnings: []
  }
  const writes: { path: string; body: Record<string, unknown> }[] = []
  let fail = false
  await page.route("**/api/platform/v1/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.replace("/api/platform/v1/", "")
    if (route.request().method() !== "GET") {
      const body = route.request().postDataJSON()
      writes.push({ path, body })
      if (fail)
        return route.fulfill({ status: 503, json: { error: { message: "Temporarily unavailable. Try again." } } })
      if (path === "admin/team/invitations") {
        team.invitations.push({
          id: "inv-1",
          email: body.email,
          role: body.role,
          state: "pending",
          emailState: "pending",
          revision: 0,
          createdAt: "2026-10-17T12:00:00Z",
          expiresAt: "2099-01-01T00:00:00Z"
        })
        events.push({
          id: "e1",
          actorName: "Alex",
          targetName: body.email,
          action: "invite",
          reason: "",
          beforeState: "",
          afterState: body.role,
          createdAt: "2026-10-17T12:00:00Z"
        })
      }
      if (path === "admin/team/members/m") {
        team.members[1]!.role = body.role
        team.members[1]!.revision++
      }
      if (path === "admin/reports/case-1") {
        item = {
          ...item,
          revision: item.revision + 1,
          ...(body.action === "claim" ? { assigneeId: "me", assigneeName: "Alex" } : {}),
          ...(["hide-comment", "resolve"].includes(body.action) ? { state: "resolved" as const } : {}),
          events: [
            {
              id: String(item.revision),
              actorName: "Alex",
              action: body.action,
              reason: body.reason,
              note: body.note,
              createdAt: "2026-10-17T12:00:00Z"
            },
            ...item.events
          ]
        }
      }
      if (path === "projects/p/listing") {
        listing = { ...listing, ...body, revision: listing.revision + 1, overridden: !body.reset }
        return route.fulfill({ json: listing })
      }
      return route.fulfill({ json: { received: true, id: "saved" } })
    }
    if (path === "admin/team/members") return route.fulfill({ json: team })
    if (path === "admin/team/history") return route.fulfill({ json: { items: events, nextCursor: null } })
    if (path === "admin/reports/case-1") return route.fulfill({ json: item })
    if (path === "admin/reports")
      return route.fulfill({
        json: {
          items: item.state === "resolved" && url.searchParams.get("state") === "open" ? [] : [item],
          nextCursor: null,
          role,
          userId: "me"
        }
      })
    if (path === "projects/p")
      return route.fulfill({ json: { name: listing.title, hostname: "spawn-snake.spawnkit.games" } })
    if (path === "projects/p/listing") return route.fulfill({ json: listing })
    return route.fulfill({ json: {} })
  })
  return {
    writes,
    fail: (value: boolean) => {
      fail = value
    }
  }
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("spawn:theme", "dark")
  })
})
test("team invites, failures, access changes and history use the live endpoints", async ({ page }, info) => {
  const server = await api(page)
  await page.goto("/tests/fixtures/community.html?page=team", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toHaveCount(1)
  await page.getByRole("button", { name: "Invite teammate", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Invite teammate" })
  await dialog.getByRole("textbox", { name: "Email", exact: true }).fill("sam@example.com")
  server.fail(true)
  await dialog.getByRole("button", { name: "Send invitation" }).click()
  await expect(dialog.getByRole("alert")).toContainText("Temporarily unavailable")
  await expect(dialog.getByRole("textbox", { name: "Email", exact: true })).toHaveValue("sam@example.com")
  server.fail(false)
  await dialog.getByRole("button", { name: "Send invitation" }).click()
  await expect(page.getByRole("row").filter({ hasText: "sam@example.com" })).toContainText("Sending")
  await page.getByRole("button", { name: "Actions for Morgan", exact: true }).click()
  await page.getByRole("menuitem", { name: "Change role", exact: true }).click()
  const change = page.getByRole("dialog", { name: "Change role" })
  await change.getByRole("radio", { name: /Observer/ }).check()
  await change.getByRole("textbox", { name: "Reason", exact: true }).fill("Read-only review access")
  await change.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByRole("row").filter({ hasText: "Morgan" })).toContainText("Observer")
  await page.getByRole("tab", { name: "Access history" }).click()
  await expect(page.getByRole("tabpanel")).toContainText("sam@example.com")
  expect(server.writes.at(-1)?.body).toMatchObject({ role: "Observer", revision: 0, reason: "Read-only review access" })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `work/community-team-${info.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test("report investigation requires current evidence before an audited decision", async ({ page }, info) => {
  const server = await api(page, "Moderator")
  await page.goto("/tests/fixtures/community.html?page=reports&role=Moderator")
  await page.getByRole("button", { name: "Review Orchard Snake: Spam or advertising" }).click()
  await expect(page.getByText("Original comment", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Start review", exact: true }).click()
  await page.getByRole("button", { name: "Review current content", exact: true }).click()
  await expect(page.getByText("Current comment", { exact: true })).toBeVisible()
  await page.getByRole("combobox", { name: "Moderation action" }).click()
  await expect(page.getByRole("option", { name: "Restrict game" })).toHaveCount(0)
  await page.getByRole("option", { name: "Hide comment" }).click()
  const dialog = page.getByRole("dialog", { name: "Hide comment" })
  await dialog.getByRole("combobox", { name: "Reason", exact: true }).click()
  await page.getByRole("option", { name: "Spam or advertising", exact: true }).click()
  await dialog.getByRole("textbox", { name: "Decision notes" }).fill("Verified repeated promotional links.")
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByRole("button", { name: "Reopen report", exact: true })).toBeVisible()
  expect(server.writes.at(-1)?.body).toMatchObject({
    action: "hide-comment",
    revision: 1,
    contentVersion: "evidence-v1"
  })
  await page.getByRole("button", { name: "History", exact: true }).click()
  await expect(page.getByText("Verified repeated promotional links.", { exact: true })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `work/community-reports-${info.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test("observer has read access without invitation or decision controls", async ({ page }) => {
  await api(page, "Observer")
  await page.goto("/tests/fixtures/community.html?page=team&role=Observer")
  await expect(page.getByRole("button", { name: "Invite teammate" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Actions for Morgan" })).toHaveCount(0)
  await page.getByRole("button", { name: "Reports", exact: true }).click()
  await page.getByRole("button", { name: "Review Orchard Snake: Spam or advertising" }).click()
  await expect(page.getByText("Original comment", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Start review" })).toHaveCount(0)
})
test("player reports support discard, retained failed input and acknowledgement", async ({ page }) => {
  const server = await api(page)
  await page.goto("/tests/fixtures/community.html?page=player")
  await page.getByRole("button", { name: "Game options" }).click()
  await page.getByRole("menuitem", { name: "Report game" }).click()
  await page.getByRole("radio", { name: "Something else", exact: true }).check()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  const details = page.getByRole("textbox", { name: /Details/ })
  await details.fill("The listing opens an unrelated game.")
  server.fail(true)
  await page.getByRole("button", { name: "Send report", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Temporarily unavailable")
  await expect(details).toHaveValue("The listing opens an unrelated game.")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Discard report?" })).toBeVisible()
  await page.getByRole("button", { name: "Keep editing" }).click()
  server.fail(false)
  await page.getByRole("button", { name: "Send report", exact: true }).click()
  await expect(page.getByRole("dialog", { name: "Report received" })).toBeVisible()
  expect(server.writes.at(-1)?.body).toMatchObject({
    kind: "Game",
    reason: "Something else",
    details: "The listing opens an unrelated game."
  })
})
test("listing settings save real metadata without exposing submission approval", async ({ page }, info) => {
  const server = await api(page)
  await page.goto("/tests/fixtures/community.html?page=settings")
  const listing = page.locator(".settings-proposal")
  await listing.scrollIntoViewIfNeeded()
  await expect(listing).not.toContainText(/approval|submission/i)
  await listing.getByRole("textbox", { name: "Game name", exact: true }).fill("Orchard Snake Deluxe")
  await expect(listing.getByRole("textbox", { name: /Objective|Controls|creator|Source code/ })).toHaveCount(0)
  await expect(listing.getByRole("checkbox")).toHaveCount(0)
  await listing.getByRole("button", { name: "Save changes" }).click()
  await expect(page.locator(".settings-toast")).toContainText("Changes saved")
  expect(server.writes.at(-1)?.body).toMatchObject({ title: "Orchard Snake Deluxe", revision: 0, reset: false })
  expect(server.writes.at(-1)?.body.details).toEqual({ controls: "Arrow keys", creator: "Existing creator" })
  await expect(listing.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `work/community-listing-${info.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test("uploads a browser build through real form contracts and waits for deployment success", async ({ page }, info) => {
  const { createRequire } = await import("node:module")
  const { zipSync, strToU8, unzipSync, strFromU8 } = createRequire(
    new URL("../apps/dashboard/package.json", import.meta.url)
  )("fflate")
  const calls: string[] = []
  let deploymentReads = 0
  let projectId = ""
  await page.route("**/api/platform/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    calls.push(`${request.method()} ${path}`)
    if (path.endsWith("/name-availability"))
      return route.fulfill({
        json: { available: new URL(request.url()).searchParams.get("name") !== "Taken", slug: "upload-acceptance" }
      })
    if (path.endsWith("/projects")) {
      expect(request.postDataJSON().requireUniqueName).toBe(true)
      projectId = request.postDataJSON().id
      return route.fulfill({ json: { id: projectId } })
    }
    if (path.endsWith("/state")) return route.fulfill({ json: { capabilities: { builds: true } } })
    if (path.endsWith("/uploads")) {
      expect(request.postDataJSON().format).toBe("spawn-source-v1")
      return route.fulfill({ json: { id: "upload" } })
    }
    if (path.endsWith("/uploads/upload")) {
      expect(request.headers()["x-content-sha256"]).toMatch(/^[a-f0-9]{64}$/)
      return route.fulfill({ json: {} })
    }
    if (path.endsWith("/deployments")) return route.fulfill({ json: { id: "deployment" } })
    if (path.endsWith("/logs"))
      return route.fulfill({ json: { entries: [{ message: "Processing cover image…" }], nextCursor: "1" } })
    if (++deploymentReads === 1)
      return route.fulfill({
        status: 401,
        json: { error: { code: "sign_in_required", message: "Sign in to continue." } }
      })
    if (deploymentReads === 3) return route.fulfill({ json: { status: "failed" } })
    if (deploymentReads === 4) return route.fulfill({ json: { status: "activating" } })
    return route.fulfill({
      json:
        deploymentReads === 2
          ? { status: "building" }
          : {
              status: "succeeded",
              url: "https://assigned-name.spawnkit.games",
              dashboardUrl: "https://spawnkit.cloud/dashboard/projects/ignored"
            }
    })
  })
  await page.goto("/tests/fixtures/community.html?page=upload")
  const downloadPending = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download template", exact: true }).click()
  const download = await downloadPending
  expect(download.suggestedFilename()).toBe("spawnkit-config-template.zip")
  const { readFileSync } = await import("node:fs")
  const files = unzipSync(new Uint8Array(readFileSync((await download.path())!)))
  expect(Object.keys(files).sort()).toEqual(["spawnkit.config.json", "spawnkit.config.schema.json"])
  const config = JSON.parse(strFromU8(files["spawnkit.config.json"]))
  const schema = JSON.parse(strFromU8(files["spawnkit.config.schema.json"]))
  expect(config.$schema).toBe("./spawnkit.config.schema.json")
  expect(schema.properties.genre.enum).toHaveLength(13)
  expect(schema.properties.dimension.enum).toEqual(["2D", "3D"])
  expect(schema.properties.details.properties).toHaveProperty("kitId")
  await page.getByLabel("Game ZIP").setInputFiles({
    name: "sample.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync({ "index.html": strToU8("<h1>Game</h1>") }))
  })
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByLabel("Game title", { exact: true }).fill("Taken")
  await expect(
    page.getByText('The name "Taken" is already taken! Please choose a unique name.', { exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page.getByLabel("Game title", { exact: true })).toBeVisible()
  await page.getByLabel("Game title", { exact: true }).fill("Upload acceptance")
  await expect(page.getByText("This game name is available.", { exact: true })).toBeVisible()
  await page.getByLabel("Description", { exact: true }).fill("A small game for browser deployment acceptance.")
  await page.getByRole("combobox", { name: "Genre", exact: true }).click()
  await page.getByRole("option", { name: "Arcade", exact: true }).click()
  await page.getByRole("button", { name: "2D", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByLabel("Cover image file").setInputFiles("apps/dashboard/public/examples/snake.webp")
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0)
  await page.getByRole("button", { name: "Deploy game", exact: true }).click()
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/sign-in")
  await expect(page.getByText(/clock is out of sync/)).toHaveCount(0)
  await expect(page.getByRole("img", { name: "Selected cover", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.getByText("Preparing your game and media…", { exact: true })).toBeVisible()
  await page.screenshot({ path: `work/upload-progress-${info.project.name}.png`, fullPage: true })
  await expect(page.getByRole("heading", { name: "Couldn't publish your game", exact: true })).toBeVisible()
  await expect(page.getByRole("alert")).toContainText("Your game couldn't be published")
  await expect(page.getByRole("link", { name: "Open project", exact: true })).toHaveAttribute(
    "href",
    `/dashboard/projects/${projectId}`
  )
  await page.screenshot({ path: `work/upload-failure-${info.project.name}.png`, fullPage: true })
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Upload acceptance uploaded", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Play game", exact: true })).toBeDisabled()
  await expect(page.getByRole("link", { name: "Open project", exact: true })).toHaveAttribute(
    "href",
    `/dashboard/projects/${projectId}`
  )
  await page.screenshot({ path: `work/upload-address-pending-${info.project.name}.png`, fullPage: true })
  await expect(page.getByRole("heading", { name: "Upload acceptance is live" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Play game", exact: true })).toHaveAttribute(
    "href",
    "https://assigned-name.spawnkit.games"
  )
  await expect(page.getByRole("link", { name: "Open project", exact: true })).toHaveAttribute(
    "href",
    `/dashboard/projects/${projectId}`
  )
  await expect(page.getByRole("link", { name: "assigned-name.spawnkit.games", exact: true })).toBeVisible()
  expect(calls.filter((call) => call === "POST /api/platform/v1/projects")).toHaveLength(2)
  await page.screenshot({ path: `work/upload-live-${info.project.name}.png`, fullPage: true })
})

test("dashboard replaces cover media through the processing queue", async ({ page }, info) => {
  await api(page)
  let saved = false
  await page.route("**/api/platform/v1/projects/p/listing/media", async (route) => {
    const body = route.request().postDataJSON()
    expect(body.cover.extension).toBe("webp")
    expect(body.cover.content.length).toBeGreaterThan(10)
    expect(body.releaseId).toBe("r")
    saved = true
    await route.fulfill({ json: { id: "media-update" } })
  })
  await page.route("**/api/platform/v1/projects/p/deployments/media-update", (route) =>
    route.fulfill({ json: { status: "succeeded" } })
  )
  await page.goto("/tests/fixtures/community.html?page=settings")
  await page.locator("#settings-cover").setInputFiles("apps/dashboard/public/examples/snake.webp")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect.poll(() => saved).toBe(true)
  await expect(page.locator(".settings-toast")).toContainText("Changes saved")
  await page.screenshot({ path: `work/listing-media-${info.project.name}.png`, fullPage: true })
})

test("project deletion confirms the saved name, keeps failures visible, and follows server cleanup", async ({
  page
}, info) => {
  await api(page)
  let fail = true,
    started = false,
    complete = false
  await page.route("**/api/platform/v1/projects/p", async (route) => {
    if (route.request().method() !== "DELETE")
      return route.fulfill({ json: { name: "Orchard Snake", hostname: "spawn-snake.spawnkit.games" } })
    expect(route.request().postDataJSON()).toEqual({ name: "Orchard Snake" })
    if (fail)
      return route.fulfill({ status: 503, json: { error: { message: "Couldn't delete the project. Try again." } } })
    started = true
    return route.fulfill({ status: 202, json: { state: "pending" } })
  })
  await page.route("**/api/platform/v1/projects/p/deletion", (route) =>
    route.fulfill({ json: { state: complete ? "complete" : "retrying" } })
  )
  await page.goto("/tests/fixtures/community.html?page=settings")
  await page.getByRole("button", { name: "Delete project", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Delete project?", exact: true })
  const confirm = dialog.getByRole("button", { name: "Delete project", exact: true })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole("textbox").fill("Orchard Snake")
  await confirm.click()
  await expect(dialog.getByRole("alert")).toContainText("Couldn't delete the project")
  await expect(dialog.getByRole("textbox")).toHaveValue("Orchard Snake")
  fail = false
  await confirm.click()
  await expect.poll(() => started).toBe(true)
  await expect(page.getByRole("heading", { name: "Deleting project", exact: true })).toBeVisible()
  await expect(page.getByText(/Cleanup hit a problem/)).toBeVisible()
  await expect(page.getByRole("heading", { name: "Project deleted", exact: true })).toHaveCount(0)
  await page.screenshot({ path: `work/settings-cleanup-${info.project.name}.png`, fullPage: true })
  complete = true
  await expect(page.getByRole("heading", { name: "Project deleted", exact: true })).toBeVisible({ timeout: 7000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
