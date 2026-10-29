export interface GameActivityCounts {
  views: number
  plays: number
}

function visitorId() {
  try {
    const now = Date.now()
    const key = "spawn:game-visitor:v1"
    const stored = JSON.parse(localStorage.getItem(key) ?? "null") as { id?: string; seen?: number } | null
    const id =
      typeof stored?.id === "string" &&
      /^[a-f0-9-]{36}$/.test(stored.id) &&
      typeof stored.seen === "number" &&
      stored.seen <= now &&
      now - stored.seen < 24 * 60 * 60_000
        ? stored.id
        : crypto.randomUUID()
    localStorage.setItem(key, JSON.stringify({ id, seen: now }))
    return id
  } catch {
    // Without persistent identity, skip counting instead of counting every refresh.
    return null
  }
}

export async function recordGameActivity(projectId: string, kind: "view" | "play"): Promise<GameActivityCounts | null> {
  const visitor = visitorId()
  if (!visitor) return null
  try {
    const response = await fetch(`/api/platform/v1/games/${encodeURIComponent(projectId)}/activity`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, visitorId: visitor }),
      keepalive: true,
      signal: AbortSignal.timeout(5000)
    })
    if (!response.ok) return null
    const result = (await response.json()) as GameActivityCounts
    return Number.isSafeInteger(result.views) &&
      result.views >= 0 &&
      Number.isSafeInteger(result.plays) &&
      result.plays >= 0
      ? { views: result.views, plays: result.plays }
      : null
  } catch {
    return null
  }
}
