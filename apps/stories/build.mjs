import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  cleanBuildOutputDir,
  writeAssets,
  writeRootConfig,
  writeWorkerConfig,
  readBuildOutput,
  getWorkerAssetsDir
} from "@cloudflare/build-output-utils"
import config from "./cloudflare.config.ts"

const root = fileURLToPath(new URL(".", import.meta.url))
const source = fileURLToPath(new URL("../dashboard/storybook-static", import.meta.url))
// Build the current stories before packaging, keeping the browser fixtures tied to this checkout.
const storybook = fileURLToPath(new URL("../dashboard/node_modules/storybook/dist/bin/dispatcher.js", import.meta.url))
const built = spawnSync(process.execPath, [storybook, "build", "--quiet"], {
  cwd: fileURLToPath(new URL("../dashboard", import.meta.url)),
  stdio: "inherit"
})
if (built.status !== 0) throw new Error("Storybook build failed")
// The pinned Cloudflare helper removes only this app's generated .cloudflare/output tree.
await cleanBuildOutputDir(root)
await writeRootConfig(
  root,
  { accountId: config.accountId },
  { isPreview: false, mode: process.env.SPAWN_CONTROL_ENVIRONMENT ?? "staging" }
)
await writeWorkerConfig({ root, config: config.worker })
await writeAssets({ root, sourceDirectory: source })
await writeFile(
  join(getWorkerAssetsDir(root), "build.json"),
  JSON.stringify({
    environment: process.env.SPAWN_DASHBOARD_ENVIRONMENT ?? process.env.SPAWN_CONTROL_ENVIRONMENT ?? "staging",
    commit: process.env.SPAWN_DEPLOY_SHA ?? null,
    preview: process.env.SPAWN_PREVIEW_NAME ?? null,
    builtAt: new Date().toISOString(),
    storyIndexDigest: createHash("sha256")
      .update(readFileSync(join(source, "index.json")))
      .digest("hex")
  })
)
await readBuildOutput(root)
console.log(`Packaged ${config.worker.domains[0]}`)
