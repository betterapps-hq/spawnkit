import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { previewRegistry, retiredPreviewWorkers, assertPreviewDeletion } from "./preview-config.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const repository = process.env.GITHUB_REPOSITORY
if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") || !process.env.GH_TOKEN) throw new Error("GitHub context is required")
const pulls = []
for (let page = 1; ; page++) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/pulls?state=open&per_page=100&page=${page}`,
    {
      headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json" }
    }
  )
  if (!response.ok) throw new Error(`Could not list pull requests: ${response.status}`)
  const batch = await response.json()
  pulls.push(...batch)
  if (batch.length < 100) break
}
// A queued update must not resurrect a closed PR or replace a newer commit.
if (process.env.SPAWN_PREVIEW_PR && process.env.SPAWN_PREVIEW_SHA) {
  const pull = pulls.find((pr) => pr.number === Number(process.env.SPAWN_PREVIEW_PR))
  if (!pull || pull.head.repo?.full_name !== repository || pull.head.sha !== process.env.SPAWN_PREVIEW_SHA)
    throw new Error("Preview request is closed, from a fork, or superseded; refusing deployment")
}
const path = new URL("../deploy/previews.json", import.meta.url)
const registry = previewRegistry(JSON.parse(readFileSync(path, "utf8")), pulls, repository)
writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`)

function cf(args) {
  const result = spawnSync(process.execPath, ["apps/dashboard/node_modules/cf/bin/cf", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  })
  if (result.status !== 0 || /APIError|Aborted\./.test(result.stderr))
    throw new Error(result.stderr || "Cloudflare command failed")
  return result.stdout.trim() ? JSON.parse(result.stdout) : null
}
function workers() {
  const all = []
  for (let page = 1; ; page++) {
    const batch = cf(["workers", "list", "--page", String(page), "--per-page", "100"])
    all.push(...batch)
    if (batch.length < 100) return all
  }
}
const retired = retiredPreviewWorkers(workers(), registry)
for (const worker of retired) {
  assertPreviewDeletion(worker)
  cf(["workers", "delete", worker.id, "--force", "--dry-run"])
  cf(["workers", "delete", worker.id, "--force"])
  console.log(`Removed ${worker.name}`)
}
if (retired.length && workers().some((worker) => retired.some(({ id }) => worker.id === id)))
  throw new Error("Preview cleanup did not complete")
console.log(`Registered ${registry.length} preview origins from the current open PRs`)
