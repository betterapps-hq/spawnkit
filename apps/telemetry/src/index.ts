import { LIMITS } from "@spawn/telemetry/protocol"
import { WorkerEntrypoint } from "cloudflare:workers"
import { failure, object, readJson, TelemetryError } from "./http"
import { parseLogs } from "./ingest"
import { signScope, validEnvironment, validProject, verifyScope } from "./keys"
import { allowedOrigin } from "./store"
export { TelemetryStore } from "./store"

/** Only service bindings can reach this named entrypoint. Default HTTP never dispatches here. */
export class TelemetryAdmin extends WorkerEntrypoint<Env> {
  override async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      const [, project = "", environment = "", operation = ""] = url.pathname.split("/")
      validProject(project)
      validEnvironment(environment)
      const store = this.env.TENANTS.getByName(`${project}:${environment}`)
      if (operation === "settings" && request.method === "PUT") {
        const body = object(await readJson(request, 4096))
        const scope = { project, environment, generation: crypto.randomUUID() }
        const key = await signScope(scope, this.env.SIGNING_KEY)
        const response = await store.manage("configure", { origins: body.origins, generation: scope.generation })
        if (!response.ok) return response
        return Response.json({ ...object(await response.json()), key, endpoint: this.env.PUBLIC_ENDPOINT })
      }
      if (operation === "settings" && request.method === "GET") return store.manage("settings", {})
      if (operation === "origins" && request.method === "PATCH")
        return store.manage("migrate-origin", object(await readJson(request, 4096)))
      if (operation === "settings" && request.method === "DELETE") return store.manage("disable", {})
      if (operation === "events" && request.method === "DELETE") return store.manage("erase", {})
      if (operation === "events" && request.method === "GET")
        return store.manage("events", Object.fromEntries(url.searchParams))
      throw new TelemetryError(404, "Not found.")
    } catch (error) {
      return failure(error)
    }
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get("origin")
    let response: Response
    try {
      if (new URL(request.url).pathname !== "/v1/logs") throw new TelemetryError(404, "Not found.")
      // Rate-limit before signature verification/body parsing; IP stays transient and is never stored.
      const rate = await env.EDGE_LIMIT.limit({ key: `ip:${request.headers.get("cf-connecting-ip") ?? "local"}` })
      if (!rate.success) throw new TelemetryError(429, "Request limit reached.", 60)
      if (request.method === "OPTIONS") {
        if (!allowedOrigin(origin)) throw new TelemetryError(403, "Invalid origin.")
        response = new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-methods": "POST",
            "access-control-allow-headers": "content-type,x-spawn-key",
            "access-control-max-age": "600"
          }
        })
      } else {
        if (request.method !== "POST") throw new TelemetryError(405, "Use POST.")
        const scope = await verifyScope(request.headers.get("x-spawn-key") ?? "", env.SIGNING_KEY)
        const keyRate = await env.EDGE_LIMIT.limit({
          key: `key:${scope.project}:${scope.environment}:${scope.generation}`
        })
        if (!keyRate.success) throw new TelemetryError(429, "Write key request limit reached.", 60)
        const payload = await readJson(request, LIMITS.batchBytes)
        const events = await parseLogs(payload, scope.environment)
        response = await env.TENANTS.getByName(`${scope.project}:${scope.environment}`).ingest(
          events,
          scope.generation,
          origin
        )
      }
    } catch (error) {
      response = failure(error)
    }
    // Public non-credentialed CORS exposes errors too; durable allowlist gates actual acceptance.
    response = new Response(response.body, response)
    if (allowedOrigin(origin)) response.headers.set("access-control-allow-origin", origin)
    response.headers.set("access-control-expose-headers", "retry-after")
    response.headers.set("vary", "Origin")
    response.headers.set("cache-control", "no-store")
    response.headers.set("x-content-type-options", "nosniff")
    return response
  }
} satisfies ExportedHandler<Env>
