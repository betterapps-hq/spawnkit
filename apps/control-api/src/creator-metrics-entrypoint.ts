import { WorkerEntrypoint } from "cloudflare:workers"
import { recordKitDownload } from "./creator-metrics"

/** Private service binding. No public HTTP ingestion endpoint. */
export class CreatorMetrics extends WorkerEntrypoint<Env> {
  override async fetch(request: Request) {
    const url = new URL(request.url),
      kit = url.searchParams.get("kit")
    if (request.method !== "POST" || !kit) return new Response(null, { status: 400 })
    const limiter = this.env.API_WRITE_LIMIT
    if (
      limiter &&
      !(await limiter.limit({ key: `kit:${request.headers.get("cf-connecting-ip") ?? "unknown"}` })).success
    )
      return new Response(null, { status: 429 })
    try {
      return Response.json(await recordKitDownload(this.env, kit))
    } catch {
      return new Response(null, { status: 503 })
    }
  }
}
