import invariant from "tiny-invariant"

export function authConfigured(env: Record<string, string | undefined>) {
  const keys = ["VITE_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const
  if (keys.every((key) => !env[key]?.trim())) return false
  invariant(
    keys.every((key) => Boolean(env[key]?.trim())),
    "Clerk configuration is incomplete"
  )
  invariant(/^pk_(test|live)_\S+$/.test(env.VITE_CLERK_PUBLISHABLE_KEY!), "Invalid Clerk publishable key")
  invariant(/^sk_(test|live)_\S+$/.test(env.CLERK_SECRET_KEY!), "Invalid Clerk secret key")
  invariant(
    env.VITE_CLERK_PUBLISHABLE_KEY!.split("_")[1] === env.CLERK_SECRET_KEY!.split("_")[1],
    "Clerk keys must belong to the same environment"
  )
  invariant(
    env.SPAWN_ENVIRONMENT !== "production" || env.VITE_CLERK_PUBLISHABLE_KEY!.startsWith("pk_live_"),
    "Production requires Clerk production credentials"
  )
  return true
}

export function authorizedParties(env: Record<string, string | undefined>) {
  if (!env.SPAWN_SITE_URL) return ["http://127.0.0.1:5173", "http://localhost:5173"]
  const site = new URL(env.SPAWN_SITE_URL)
  invariant(
    (site.protocol === "https:" ||
      (env.SPAWN_ENVIRONMENT !== "production" &&
        site.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(site.hostname))) &&
      !site.username &&
      !site.password &&
      site.pathname === "/" &&
      !site.search &&
      !site.hash,
    "The deployed dashboard must have an exact HTTPS origin"
  )
  return [site.origin]
}
