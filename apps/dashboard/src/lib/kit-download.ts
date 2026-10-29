import { findStarterKit } from "@spawn/templates/kits"
import { strToU8, zipSync } from "fflate"
import { starterKitPlan } from "./kit-plan"

export async function kitDownload(request: Request, attribution?: string | null): Promise<Response | null> {
  const path = new URL(request.url).pathname
  if (!path.startsWith("/downloads/kits/")) return null
  const id = /^\/downloads\/kits\/([a-z0-9-]+)\.zip$/.exec(path)?.[1]
  const headers = { "X-Robots-Tag": "noindex", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  if (!id || !findStarterKit(id)) return new Response("Kit not found", { status: 404, headers })
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", { status: 405, headers: { ...headers, Allow: "GET, HEAD" } })
  const plan = await starterKitPlan(id)
  if (attribution) plan.files["spawnkit-attribution.json"] = attribution
  const archive =
    request.method === "HEAD"
      ? null
      : new Uint8Array(
          zipSync(
            Object.fromEntries(
              Object.entries(plan.files).map(([file, source]) => [`${plan.name}/${file}`, strToU8(source)])
            )
          )
        )
  return new Response(archive, {
    headers: {
      ...headers,
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${plan.name}.zip"`
    }
  })
}
