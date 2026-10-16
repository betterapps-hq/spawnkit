import { realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { getEndpoint } from "@buildkitgg/dev-domains/node"

export const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)))
const services = ["app", "api", "stories", "telemetry", "e2e", "e2e-stories"]
const endpoints = await Promise.all(services.map((service) => getEndpoint(service, root)))
const origins = Object.fromEntries(endpoints.map((endpoint) => [endpoint.service, endpoint.origin]))

// Config loading and checkout identity belong to Buildkit; Spawn owns its service roles.
export function developmentEnvironment() {
  return { root, ...origins }
}

export function testOrigins() {
  const loopback = process.env.CI || process.env.SPAWN_E2E_LOOPBACK === "1"
  return {
    app: process.env.SPAWN_E2E_APP_URL || (loopback ? "http://127.0.0.1:5174" : origins.e2e),
    stories: process.env.SPAWN_E2E_STORIES_URL || (loopback ? "http://127.0.0.1:6007" : origins["e2e-stories"])
  }
}
