import { appendFileSync } from "node:fs"

const environment = process.env.SPAWN_RELEASE_ENVIRONMENT
if (!["staging", "production", "preview"].includes(environment)) throw new Error("Invalid environment")
const pr = process.env.SPAWN_PREVIEW_PR
if (environment === "preview" && !/^[1-9]\d*$/.test(pr ?? "")) throw new Error("Invalid PR number")
const app =
  environment === "production"
    ? "https://spawnkit.cloud"
    : environment === "staging"
      ? "https://staging.spawnkit.cloud"
      : `https://preview-pr-${pr}.spawnkit.cloud`
const stories =
  environment === "production"
    ? "https://stories.spawnkit.cloud"
    : environment === "staging"
      ? "https://stories.staging.spawnkit.cloud"
      : `https://stories-preview-pr-${pr}.spawnkit.cloud`
for (const url of [app, `${stories}/`, `${stories}/iframe.html`, `${stories}/index.json`, `${stories}/build.json`]) {
  let passed = false
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (url.endsWith("index.json")) {
        const index = await response.json()
        if (!index.entries?.["authentication-login-scene--animated"]) throw new Error("Login story missing")
      }
      if (url.endsWith("build.json")) {
        const build = await response.json()
        if (build.commit !== process.env.SPAWN_DEPLOY_SHA) throw new Error("Storybook is serving a different commit")
      }
      passed = true
      break
    } catch (error) {
      console.log(`Waiting for ${url}: ${error.message}`)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
  if (!passed) throw new Error(`Deployment smoke check failed: ${url}`)
}
const summary = `App: ${app}\n\nStorybook: ${stories}/?path=/story/authentication-login-scene--animated\n\nCommit: ${process.env.SPAWN_DEPLOY_SHA}\n`
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
