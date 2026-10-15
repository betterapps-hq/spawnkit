export class TelemetryError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number
  ) {
    super(message)
  }
}
export function requireValue(value: unknown, message: string): asserts value {
  if (!value) throw new TelemetryError(400, message)
}
export function object(value: unknown): Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), "Expected an object.")
  return value as Record<string, unknown>
}
export async function readJson(request: Request, limit: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
    throw new TelemetryError(415, "Use application/json.")
  if (request.headers.get("content-encoding")) throw new TelemetryError(415, "Compressed requests are not supported.")
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new TelemetryError(413, "Payload exceeds the limit.")
  const reader = request.body?.getReader()
  if (!reader) throw new TelemetryError(400, "A request body is required.")
  const parts: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new TelemetryError(413, "Payload exceeds the limit.")
      }
      parts.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.byteLength
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes))
  } catch {
    throw new TelemetryError(400, "Invalid JSON.")
  }
}
export function failure(error: unknown): Response {
  const status = error instanceof TelemetryError ? error.status : 503
  if (!(error instanceof TelemetryError))
    console.error(JSON.stringify({ event: "telemetry_failure", type: error instanceof Error ? error.name : "unknown" }))
  // google.rpc.Status JSON, as required by OTLP/HTTP.
  const code =
    status === 429 ? 8 : status === 401 ? 16 : status === 403 ? 7 : status === 404 ? 5 : status === 503 ? 14 : 3
  return Response.json(
    { code, message: error instanceof TelemetryError ? error.message : "Telemetry is temporarily unavailable." },
    {
      status,
      headers: {
        "cache-control": "no-store",
        ...(error instanceof TelemetryError && error.retryAfter ? { "retry-after": String(error.retryAfter) } : {})
      }
    }
  )
}
