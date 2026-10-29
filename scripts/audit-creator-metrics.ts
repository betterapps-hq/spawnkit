import { mkdir, writeFile } from "node:fs/promises"
import { readCredentials } from "../packages/cli/src/auth"

const { site, accessToken } = await readCredentials()
const response = await fetch(new URL("/api/platform/v1/admin/creator-metrics", site), {
  headers: { authorization: `Bearer ${accessToken}` },
  redirect: "error",
  signal: AbortSignal.timeout(15000)
})
if (!response.ok)
  throw new Error(`Creator metrics unavailable (${response.status}). Sign in with an administrator account.`)
const report = { observedAt: new Date().toISOString(), site, ...((await response.json()) as object) }
await mkdir("work", { recursive: true })
const path = `work/creator-metrics-${Date.now()}.json`
await writeFile(path, JSON.stringify(report, null, 2) + "\n")
console.log(JSON.stringify({ path, ...report }))
