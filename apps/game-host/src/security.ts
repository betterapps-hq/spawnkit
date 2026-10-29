import localOrigins from "../../../deploy/local-origins.json" with { type: "json" }
import previews from "../../../deploy/previews.json" with { type: "json" }

const frameAncestors = [
  "https://spawnkit.cloud",
  "https://staging.spawnkit.cloud",
  "https://stories.spawnkit.cloud",
  "https://stories.staging.spawnkit.cloud",
  ...previews.map((name) => `https://preview-${name}.spawnkit.cloud`),
  ...localOrigins,
  ...localOrigins.map((origin) =>
    origin
      .replace(/(e2e\.)?local\.spawnkit\.cloud$/, "$1stories.local.spawnkit.cloud")
      .replace("e2e.stories.", "stories.e2e.")
  )
].join(" ")

/** Enforced on every artifact response, including cached, conditional and range responses. */
export function secureGameResponse(response: Response) {
  const result = new Response(response.body, response)
  result.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      "sandbox allow-scripts allow-same-origin",
      // Existing Pixi builds generate shader/uniform helpers with Function(). Games
      // already execute arbitrary creator code; this exception never applies to the app.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://telemetry.spawnkit.cloud https://telemetry.staging.spawnkit.cloud https://cloudflareinsights.com",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      `frame-ancestors ${frameAncestors}`,
      "upgrade-insecure-requests"
    ].join("; ")
  )
  result.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), clipboard-read=(), clipboard-write=(), display-capture=()"
  )
  result.headers.set("Referrer-Policy", "no-referrer")
  result.headers.set("X-Content-Type-Options", "nosniff")
  return result
}
