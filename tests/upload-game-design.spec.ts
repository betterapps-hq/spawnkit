import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { expect, test, type Page } from "@playwright/test"
import { testOrigins } from "../scripts/dev-environment.mjs"
const { zipSync, strToU8, unzipSync, strFromU8 } = createRequire(
  new URL("../apps/dashboard/package.json", import.meta.url)
)("fflate")
const gameZip = () => Buffer.from(zipSync({ "index.html": strToU8("<!doctype html><title>Game</title>") }))

async function story(page: Page, name = "upload") {
  await page.goto(`${testOrigins().stories}/iframe.html?id=publishing-upload-game--${name}&viewMode=story`)
  await expect(page.getByRole("heading", { name: "Upload game", exact: true })).toBeVisible()
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("spawn:theme", "dark")
    localStorage.setItem("spawn:sidebar", "expanded")
  })
})
test("walks through upload, validation, live listing preview and deployment without platform writes", async ({
  page
}, info) => {
  const writes: string[] = []
  page.on("request", (r) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && new URL(r.url()).pathname !== "/cdn-cgi/rum")
      writes.push(r.url())
  })
  await story(page)
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled()
  await page.getByLabel("Game ZIP").setInputFiles({
    name: "my-game.zip",
    mimeType: "application/zip",
    buffer: gameZip()
  })
  await expect(page.getByText("Ready to deploy", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page.getByText("Enter a game title.")).toBeVisible()
  await page.getByLabel("Game title", { exact: true }).fill("Moon Garden")
  await page.getByLabel("Description", { exact: true }).fill("Grow a garden among the stars and explore a new world.")
  await page.getByRole("combobox", { name: "Genre", exact: true }).click()
  await page.getByRole("option", { name: "Puzzle", exact: true }).click()
  await page.getByRole("button", { name: "2D", exact: true }).click()
  const preview = page.getByRole("complementary", { name: "Listing preview" })
  await expect(preview.getByRole("heading", { name: "Moon Garden" })).toBeVisible()
  await expect(preview).toContainText("Puzzle")
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Deploy game", exact: true }).click()
  await expect(page.getByText("Add a cover image to continue.")).toBeVisible()
  await page.getByLabel("Cover image file").setInputFiles("apps/dashboard/public/examples/snake.webp")
  await expect(preview.getByRole("img", { name: "Moon Garden cover" })).toBeVisible()
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await expect(page.getByLabel("Game title", { exact: true })).toHaveValue("Moon Garden")
  await page.screenshot({ path: `work/upload-details-${info.project.name}.png`, fullPage: true })
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Deploy game", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Moon Garden is live" })).toBeVisible()
  for (const name of ["moon-garden.spawnkit.games", "Play Moon Garden", "Play game"]) {
    const link = page.getByRole("link", { name, exact: true })
    await expect(link).toHaveAttribute("href", "https://moon-garden.spawnkit.games")
    await expect(link).toHaveAttribute("target", "_blank")
    await expect(link).toHaveAttribute("rel", "noopener noreferrer")
  }
  await expect(page.getByRole("link", { name: "Open project" })).toHaveAttribute(
    "href",
    "?id=project-dashboard-overview--frontend-only&viewMode=story"
  )
  expect(writes).toEqual([])
})

test("imports a listing and cover immediately, downloads edits, and preserves them without config", async ({
  page
}) => {
  const listing = {
    schemaVersion: 1,
    title: "Star Catcher",
    description: "Catch gold stars and dodge meteors in a space sprint.",
    genre: "Arcade",
    dimension: "2D",
    coverPath: "cover.webp",
    details: { controls: "Arrow keys" }
  }
  const files = {
    "index.html": strToU8("<!doctype html><title>Game</title>"),
    "spawnkit.config.json": strToU8(JSON.stringify(listing)),
    "cover.webp": new Uint8Array(readFileSync("apps/dashboard/public/examples/snake.webp"))
  }
  await story(page)
  const templateDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download template" }).click()
  const template = await templateDownload
  expect(template.suggestedFilename()).toBe("spawnkit-config-template.zip")
  const templateFiles = unzipSync(new Uint8Array(readFileSync((await template.path())!)))
  expect(Object.keys(templateFiles).sort()).toEqual(["spawnkit.config.json", "spawnkit.config.schema.json"])
  const schema = JSON.parse(strFromU8(templateFiles["spawnkit.config.schema.json"]))
  expect(schema.properties.genre.enum).toContain("Role-playing")
  expect(schema.properties.dimension.enum).toEqual(["2D", "3D"])
  expect(schema.properties.details.properties).toHaveProperty("sourcePermission")
  expect(JSON.parse(strFromU8(templateFiles["spawnkit.config.json"]))).toMatchObject({
    $schema: "./spawnkit.config.schema.json",
    schemaVersion: 1,
    genre: "Arcade",
    dimension: "2D"
  })
  await page
    .getByLabel("Game ZIP")
    .setInputFiles({ name: "star-catcher.zip", mimeType: "application/zip", buffer: Buffer.from(zipSync(files)) })
  await expect(page.getByText("Ready to deploy", { exact: true })).toBeVisible()
  const preview = page.getByRole("complementary", { name: "Listing preview" })
  await expect(preview.getByRole("heading", { name: "Star Catcher" })).toBeVisible()
  await expect(preview.getByRole("img", { name: "Star Catcher cover" })).toBeVisible()
  await expect(preview).not.toContainText("Game card")
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page.getByLabel("Game title", { exact: true })).toHaveValue("Star Catcher")
  await page.getByLabel("Game title", { exact: true }).fill("Star Catcher Deluxe")
  const editedDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download config" }).click()
  const edited = await editedDownload
  expect(JSON.parse(readFileSync((await edited.path())!, "utf8"))).toEqual({ ...listing, title: "Star Catcher Deluxe" })
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await page
    .getByLabel("Game ZIP")
    .setInputFiles({ name: "no-config.zip", mimeType: "application/zip", buffer: gameZip() })
  await expect(page.getByText("Ready to deploy", { exact: true })).toBeVisible()
  await expect(preview.getByRole("heading", { name: "Star Catcher Deluxe" })).toBeVisible()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page.getByRole("img", { name: "Selected cover", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await page.getByRole("button", { name: "Remove game file" }).click()
  await expect(preview.getByRole("heading", { name: "Your game title" })).toBeVisible()
  await expect(preview.getByRole("img")).toHaveCount(0)
  await expect(preview).toContainText("Your description will appear here.")
  await expect(preview).toContainText("your-game.spawnkit.games")
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Download template" })).toBeVisible()
})
test("rejects oversized or unsupported media while retaining the existing cover", async ({ page }) => {
  await story(page, "media")
  await page
    .getByLabel("Cover image file")
    .setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(1024 * 1024 + 1) })
  await expect(page.getByRole("alert")).toContainText("under 1 MB")
  await expect(page.getByRole("img", { name: "Selected cover", exact: true })).toBeVisible()
  await page
    .getByLabel("Gameplay video file")
    .setInputFiles({ name: "large.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(2 * 1024 * 1024 + 1) })
  await expect(page.getByText("Choose a file under 2 MB.")).toBeVisible()
  await page
    .getByLabel("Gameplay video file")
    .setInputFiles({ name: "preview.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") })
  await expect(page.getByText("Choose an MP4 or WebM video.")).toBeVisible()
  await page.getByLabel("Gameplay video file").setInputFiles({
    name: "preview.mp4",
    mimeType: "video/mp4",
    buffer: readFileSync("apps/control-api/fixtures/trailer.mp4")
  })
  await expect(page.getByText("preview.mp4", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Remove video", exact: true }).click()
  await expect(page.getByText("Play a clip on hover")).toBeVisible()
})
test("upload failure can retry and preserves the completed listing", async ({ page }) => {
  await story(page, "upload-failed")
  await page.getByRole("button", { name: "Retry upload", exact: true }).click()
  await expect(page.getByText("Ready to deploy", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page.getByLabel("Game title", { exact: true })).toHaveValue("Orchard Snake")
})
test("upload designs fit both themes and small screens without notices", async ({ page }, info) => {
  for (const state of [
    "upload",
    "uploading",
    "invalid-archive",
    "details",
    "imported-config",
    "media",
    "existing-game",
    "complete"
  ]) {
    await story(page, state)
    await expect(page.locator(".safety-root")).not.toContainText(/prototype|[·•]|approval/i)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (["upload", "media"].includes(state))
      await page.screenshot({ path: `work/upload-${state}-${info.project.name}.png`, fullPage: true })
  }
  await story(page, "media")
  await page.getByRole("button", { name: "Toggle theme" }).click()
  await page.screenshot({ path: `work/upload-light-${info.project.name}.png`, fullPage: true })
})
