/** The application trusts its own scripts and its configured identity provider, never game hosts. */
export function appSecurityHeaders(nonce: string, publishableKey = "", cliAuthorization = false) {
  if (!/^[a-f0-9-]{36}$/.test(nonce)) throw new Error("Invalid CSP nonce")
  let clerk = ""
  if (publishableKey) {
    const host = atob(publishableKey.replace(/^pk_(live|test)_/, "")).replace(/\$$/, "")
    if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) throw new Error("Invalid Clerk CSP host")
    clerk = `https://${host}`
  }
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' ${clerk} https://challenges.cloudflare.com https://*.protect.clerk.com https://static.cloudflareinsights.com`,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.spawnkit.games https://img.clerk.com",
      "media-src 'self' blob: https://*.spawnkit.games",
      "font-src 'self' data:",
      `connect-src 'self' ${clerk} https://*.protect.clerk.com:* https://clerk-telemetry.com https://*.clerk-telemetry.com https://cloudflareinsights.com`,
      "frame-src https://*.spawnkit.games https://challenges.cloudflare.com https://*.protect.clerk.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'none'",
      `form-action 'self'${cliAuthorization ? ` ${clerk} http://127.0.0.1:43819/callback` : ""}`,
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()"
  }
}
