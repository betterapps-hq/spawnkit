import { createHash } from "node:crypto"
import { createClerkClient } from "@clerk/backend"
import type { CommunityRole } from "@spawn/platform/community"
import { HttpError, requireValue } from "./http"

export async function communityRole(env: Env, userId: string): Promise<CommunityRole | null> {
  return (
    (
      await env.DATABASE.prepare("SELECT role FROM community_access WHERE user_id=?")
        .bind(userId)
        .first<{ role: CommunityRole }>()
    )?.role ?? null
  )
}
export async function requireCommunity(env: Env, userId: string, write = false) {
  const role = await communityRole(env, userId)
  if (!role || (write && role === "Observer"))
    throw new HttpError(403, "forbidden", "You don’t have permission for this action.")
  return role
}
export async function requireAdmin(env: Env, userId: string) {
  if ((await communityRole(env, userId)) !== "Admin")
    throw new HttpError(403, "forbidden", "Administrator access required.")
}
export async function communityIdentity(env: Env, userId: string) {
  const profile = await createClerkClient({ secretKey: env.CLERK_SECRET_KEY }).users.getUser(userId)
  return {
    name: (profile.username || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Team member").slice(
      0,
      128
    ),
    emails: (profile.emailAddresses ?? [])
      .filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress.toLowerCase())
  }
}
export const hashValue = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
export function commandId(value: unknown): asserts value is string {
  requireValue(typeof value === "string" && /^[a-f0-9-]{36}$/.test(value), "A request ID is required.")
}
export function revision(value: unknown): asserts value is number {
  requireValue(Number.isSafeInteger(value) && Number(value) >= 0, "Invalid revision.")
}
export function privateResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "private, no-store" } })
}
export function conflict() {
  return new HttpError(409, "conflict", "This item changed. Refresh and review it again.")
}
