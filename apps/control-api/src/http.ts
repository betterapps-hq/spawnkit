export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}

export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new HttpError(400, "invalid_request", message)
}

export function record(value: unknown): Record<string, unknown> {
  requireValue(typeof value === "object" && value !== null && !Array.isArray(value), "Expected an object.")
  return value as Record<string, unknown>
}

export async function boundedBody(request: Pick<Request, "headers" | "body">, limit: number): Promise<Uint8Array> {
  requireValue(Number(request.headers.get("content-length") ?? 0) <= limit, "Request is too large.")
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new HttpError(413, "payload_too_large", "Request is too large.")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export async function jsonBody(request: Request) {
  try {
    return record(JSON.parse(new TextDecoder().decode(await boundedBody(request, 128 * 1024))))
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, "invalid_json", "Invalid JSON request.")
  }
}
