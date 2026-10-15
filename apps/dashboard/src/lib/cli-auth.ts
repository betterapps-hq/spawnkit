export function cliAuthConfiguration(env: Record<string, string | undefined>) {
  const clientId = env.CLERK_OAUTH_CLIENT_ID
  const issuer = env.CLERK_OAUTH_ISSUER
  if (!clientId || !issuer) throw new Error("CLI sign-in setup required. Configure the Clerk public OAuth application.")
  const url = new URL(issuer)
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw new Error("CLERK_OAUTH_ISSUER must be an HTTPS origin.")
  return { clientId, issuer: url.origin }
}

export function validateCliRequest(search: Record<string, unknown>) {
  if (
    search.redirect_uri !== "http://127.0.0.1:43819/callback" ||
    search.response_type !== "code" ||
    search.scope !== "openid" ||
    search.code_challenge_method !== "S256"
  )
    throw new Error("Invalid CLI authorization request. Start again with spawn login.")
  for (const key of ["state", "code_challenge"])
    if (typeof search[key] !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(search[key]))
      throw new Error("Invalid CLI authorization proof.")
  return Object.fromEntries(
    ["redirect_uri", "response_type", "scope", "state", "code_challenge", "code_challenge_method"].map((key) => [
      key,
      String(search[key])
    ])
  )
}
