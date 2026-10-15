import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { realpathSync } from "node:fs"
import { basename, join } from "node:path"
import { fileURLToPath } from "node:url"

export const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)))

export function checkoutName(directory = root) {
  if (process.env.SPAWN_LOCAL_NAME !== undefined) {
    const value = process.env.SPAWN_LOCAL_NAME
    if (value && !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(value)) throw new Error("Invalid SPAWN_LOCAL_NAME")
    return value
  }
  try {
    const common = realpathSync(
      execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
        cwd: directory,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }).trim()
    )
    if (common === join(directory, ".git")) return ""
  } catch {
    // A standalone checkout without Git is the primary checkout.
    return ""
  }
  const canonical = directory.replaceAll("\\", "/").toLowerCase()
  const slug =
    basename(directory)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30)
      .replace(/^-+|-+$/g, "") || "checkout"
  return `${slug}-${createHash("sha256").update(canonical).digest("hex").slice(0, 8)}`
}

export function developmentEnvironment(name = checkoutName()) {
  const prefix = name ? `${name}.` : ""
  const url = (service) => `https://${prefix}${service ? `${service}.` : ""}local.spawnkit.cloud`
  return {
    root,
    name: name || "primary",
    app: url(""),
    api: url("api"),
    stories: url("stories"),
    telemetry: url("telemetry"),
    e2e: url("e2e"),
    "e2e-stories": url("stories.e2e")
  }
}

export function testOrigins() {
  const local = developmentEnvironment()
  const loopback = process.env.CI || process.env.SPAWN_E2E_LOOPBACK === "1"
  return {
    app: process.env.SPAWN_E2E_APP_URL || (loopback ? "http://127.0.0.1:5174" : local.e2e),
    stories: process.env.SPAWN_E2E_STORIES_URL || (loopback ? "http://127.0.0.1:6007" : local["e2e-stories"])
  }
}
