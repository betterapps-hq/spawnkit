import { WorkerEntrypoint } from "cloudflare:workers"
import { recordGameActivity } from "./game-activity"
import { HttpError } from "./http"

/** Named entrypoints are available only to service bindings, never to the public HTTP router. */
export class GameActivity extends WorkerEntrypoint<Env> {
  override async fetch(request: Request): Promise<Response> {
    try {
      return await recordGameActivity(request, this.env)
    } catch (error) {
      if (error instanceof HttpError)
        return Response.json(
          { error: { code: error.code, message: error.message } },
          {
            status: error.status,
            headers: { "cache-control": "no-store", ...(error.status === 429 ? { "retry-after": "60" } : {}) }
          }
        )
      console.error(
        JSON.stringify({ event: "game_activity_failed", errorType: error instanceof Error ? error.name : "unknown" })
      )
      return Response.json({ error: { code: "unavailable" } }, { status: 503 })
    }
  }
}
