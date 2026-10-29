import type { SignInFutureResource, SignUpFutureResource, SetActiveNavigate } from "@clerk/tanstack-react-start/types"

export type SecondFactor = "totp" | "email_code" | "phone_code" | "backup_code"
const factors: SecondFactor[] = ["totp", "email_code", "phone_code", "backup_code"]

export function signInStep(signIn: Pick<SignInFutureResource, "status" | "supportedSecondFactors">) {
  if (signIn.status === "complete") return { step: "complete" as const }
  if (signIn.status === "needs_new_password") return { step: "new-password" as const }
  if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
    const available = factors.filter((strategy) =>
      signIn.supportedSecondFactors.some((factor) => factor.strategy === strategy)
    )
    if (available.length) return { step: "mfa" as const, factors: available }
  }
  return { step: "unsupported" as const }
}

export function signUpStep(signUp: Pick<SignUpFutureResource, "status" | "missingFields" | "unverifiedFields">) {
  if (signUp.status === "complete") return "complete"
  if (signUp.missingFields.length) return "requirements"
  if (signUp.unverifiedFields.includes("email_address")) return "email-code"
  return "unsupported"
}

export function authErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "longMessage" in error &&
    typeof error.longMessage === "string" &&
    error.longMessage
  )
    return error.longMessage
  return "We couldn't complete that request. Please try again."
}

export async function requireAuthSuccess(request: Promise<{ error: unknown }>) {
  const result = await request
  if (result.error) throw result.error
}

export function authDestination() {
  let cliReturn: string | null = null
  let gameReturn: string | null = null
  let teamReturn: string | null = null
  try {
    cliReturn = window.sessionStorage?.getItem("spawn-cli-return") ?? null
    gameReturn = window.sessionStorage?.getItem("spawn-game-return") ?? null
    teamReturn = window.sessionStorage?.getItem("spawn-team-return") ?? null
    window.sessionStorage?.removeItem("spawn-team-return")
    window.sessionStorage?.removeItem("spawn-game-return")
  } catch {
    /* Storage can be unavailable in private browser contexts. */
  }
  return teamReturn && /^\/team\/invitation#[a-f0-9]{64}$/.test(teamReturn)
    ? teamReturn
    : cliReturn?.startsWith("/cli/login?") ||
        cliReturn === "/cli/access" ||
        (cliReturn && /^\/cli\/claim\?claim_attempt_token=cla_[A-Za-z0-9_-]{43}$/.test(cliReturn))
      ? cliReturn
      : gameReturn && /^\/play\/[A-Za-z0-9_-]{1,128}#community$/.test(gameReturn)
        ? gameReturn
        : "/dashboard"
}

export const navigateAfterAuth: SetActiveNavigate = ({ session, decorateUrl }) => {
  window.location.assign(decorateUrl(session?.currentTask ? "/session-tasks" : authDestination()))
}
