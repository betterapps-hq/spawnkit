import { HttpError, requireValue } from "./http"

/** Called only after authentication and the project's ownership check in the router. */
export async function telemetryRoute(
  request: Request,
  env: Env,
  projectId: string,
  resource: string | undefined
): Promise<Response> {
  if (!env.TELEMETRY) throw new HttpError(503, "unavailable", "Telemetry service is not configured.")
  requireValue(resource === "settings" || resource === "events", "Unknown telemetry operation.")
  const incoming = new URL(request.url)
  const environment = incoming.searchParams.get("environment") ?? "production"
  requireValue(environment === "production" || environment === "sandbox", "Choose production or sandbox.")
  const enabled = await env.DATABASE.prepare("SELECT enabled FROM environments WHERE project_id = ? AND name = ?")
    .bind(projectId, environment)
    .first<{ enabled: number }>()
  if (!enabled) throw new HttpError(404, "not_found", "Project environment not found.")
  if (!enabled.enabled && request.method === "PUT")
    throw new HttpError(
      409,
      "environment_disabled",
      "Enable the environment before configuring a new telemetry key. Existing telemetry can still be read, disabled or erased."
    )
  const url = new URL(`https://telemetry.internal/${projectId}/${environment}/${resource}`)
  for (const field of ["since", "until", "limit", "cursor", "level", "kind", "release", "query", "fingerprint"]) {
    const value = incoming.searchParams.get(field)
    if (value !== null) url.searchParams.set(field, value)
  }
  // Forward only explicitly supported routing/filter fields. Browser headers cannot select a tenant.
  const result = await env.TELEMETRY.fetch(
    new Request(url, {
      method: request.method,
      headers: { "content-type": "application/json" },
      ...(request.body ? { body: request.body } : {})
    })
  )
  if (!result.ok) {
    const status = (await result.json()) as { message?: string }
    return Response.json(
      { error: { code: "telemetry_error", message: status.message ?? "Telemetry request failed." } },
      {
        status: result.status,
        headers: {
          "cache-control": "no-store",
          ...(result.headers.has("retry-after") ? { "retry-after": result.headers.get("retry-after")! } : {})
        }
      }
    )
  }
  return result
}
