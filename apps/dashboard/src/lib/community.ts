export class CommunityError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}
export async function communityRequest<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(`/api/platform/v1/${path}`, {
    cache: "no-store",
    ...(body === undefined
      ? {}
      : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  })
  const result = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null
  if (!response.ok || !result)
    throw new CommunityError(result?.error?.message ?? "Unable to connect. Try again.", response.status)
  return result
}
export function communityDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
}
