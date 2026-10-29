export async function prepareKitAttribution(request: Request, kit: string): Promise<string | null> {
  if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") return null
  try {
    const { env } = await import("cloudflare:workers")
    const response = await env.CREATOR_METRICS.fetch(
      new Request(`https://creator-metrics/download?kit=${encodeURIComponent(kit)}`, {
        method: "POST",
        headers: { "cf-connecting-ip": request.headers.get("cf-connecting-ip") ?? "unknown" },
        signal: AbortSignal.timeout(3000)
      })
    )
    if (!response.ok) return null
    const result = (await response.json()) as {
      schemaVersion: number
      downloadId: string
      kitId: string
      consent: boolean
    }
    if (
      result.schemaVersion !== 1 ||
      result.kitId !== kit ||
      result.consent !== true ||
      !/^[a-f0-9-]{36}$/.test(result.downloadId)
    )
      return null
    return JSON.stringify(result) + "\n"
  } catch {
    return null
  }
}
