/** Only allowlisted authentication failures are exposed; never render provider diagnostics. */
export function authFailureResponse(response: Response, request: Request, local: boolean): Response | null {
  const reason = response.headers.get("x-clerk-auth-reason") ?? ""
  if (!/^(session-)?token-(iat-in-the-future|not-active-yet)$/.test(reason)) return null
  const message = local
    ? "Your computer’s clock is out of sync. Enable automatic time and sync your clock in your system settings, then try again."
    : "The sign-in service’s clock is out of sync. Please try again shortly."
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
    "content-security-policy":
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
  })
  if (!request.headers.get("accept")?.includes("text/html")) {
    return Response.json(
      { error: { code: "sign_in_required", message: "Sign in to continue." } },
      { status: 401, headers: { "cache-control": "no-store" } }
    )
  }
  if (new URL(request.url).pathname !== "/sign-in") {
    return new Response(null, { status: 303, headers: { location: "/sign-in", "cache-control": "no-store" } })
  }
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign-in interrupted | SpawnKit</title><style>body{margin:0;background:#121116;color:#f5f3fa;font:16px/1.6 system-ui;min-height:100vh;display:grid;place-items:center}main{max-width:400px;padding:32px}h1{font-size:24px;line-height:1.3}p{color:#bcb5ca}a{display:inline-block;background:#ad8be8;color:#171222;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600}</style></head><body><main role="alert"><h1>Check your clock</h1><p>${message}</p><a href="/sign-in">Try sign-in again</a></main></body></html>`,
    { status: 503, headers }
  )
}
