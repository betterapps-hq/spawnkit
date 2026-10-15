import { createClerkClient, verifyToken } from "@clerk/backend"
import { HttpError } from "./http"

export async function authenticate(request: Request, env: Env): Promise<string> {
  const token = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/)?.[1]
  if (!token) throw new HttpError(401, "unauthorized", "Sign in to continue.")
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY })
  try {
    const session = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: env.DASHBOARD_ORIGINS.split(",")
    })
    // OAuth JWTs must pass the OAuth-specific verifier and client binding below.
    if (typeof session.sid === "string" && session.sub.startsWith("user_") && !("client_id" in session))
      return session.sub
  } catch {
    // The CLI uses OAuth access tokens, which are distinct from browser sessions.
  }
  try {
    const verified = await clerk.idPOAuthAccessToken.verify(token)
    if (
      !env.CLERK_OAUTH_CLIENT_ID ||
      verified.clientId !== env.CLERK_OAUTH_CLIENT_ID ||
      verified.revoked ||
      verified.expired ||
      !verified.expiration ||
      verified.expiration <= Date.now() / 1000 ||
      !verified.subject.startsWith("user_")
    )
      throw new Error("Invalid token")
    return verified.subject
  } catch {
    throw new HttpError(401, "unauthorized", "Your session has expired or is not authorized. Sign in again.")
  }
}
