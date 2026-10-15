import { afterEach, expect, it, vi } from "vitest"
import { authErrorMessage, navigateAfterAuth, requireAuthSuccess, signInStep, signUpStep } from "./auth-flow"

afterEach(() => vi.unstubAllGlobals())

it("never completes sign-in before Clerk verifies all required factors", () => {
  expect(signInStep({ status: "needs_first_factor", supportedSecondFactors: [] })).toEqual({ step: "unsupported" })
  expect(signInStep({ status: "needs_second_factor", supportedSecondFactors: [{ strategy: "totp" }] })).toEqual({
    step: "mfa",
    factors: ["totp"]
  })
  expect(signInStep({ status: "needs_client_trust", supportedSecondFactors: [] })).toEqual({ step: "unsupported" })
  expect(signInStep({ status: "needs_new_password", supportedSecondFactors: [] })).toEqual({ step: "new-password" })
  expect(signInStep({ status: "complete", supportedSecondFactors: [] })).toEqual({ step: "complete" })
})

it("keeps incomplete registrations in verification or account setup", () => {
  expect(signUpStep({ status: "missing_requirements", missingFields: [], unverifiedFields: ["email_address"] })).toBe(
    "email-code"
  )
  expect(signUpStep({ status: "missing_requirements", missingFields: ["email_address"], unverifiedFields: [] })).toBe(
    "requirements"
  )
  expect(signUpStep({ status: "missing_requirements", missingFields: [], unverifiedFields: [] })).toBe("unsupported")
  expect(signUpStep({ status: "complete", missingFields: [], unverifiedFields: [] })).toBe("complete")
})

it("propagates SDK failures rather than advancing the authentication flow", async () => {
  const failure = { code: "verification_failed", longMessage: "That code is incorrect." }
  await expect(requireAuthSuccess(Promise.resolve({ error: failure }))).rejects.toBe(failure)
  await expect(requireAuthSuccess(Promise.resolve({ error: null }))).resolves.toBeUndefined()
  expect(authErrorMessage(failure)).toBe("That code is incorrect.")
  expect(authErrorMessage(new Error("private internal detail"))).not.toContain("private")
})

it("routes required session tasks before opening the dashboard", () => {
  const assign = vi.fn<(url: string) => void>()
  vi.stubGlobal("window", { location: { assign } })
  const context = (session: unknown) =>
    ({ session, decorateUrl: (url: string) => url }) as Parameters<typeof navigateAfterAuth>[0]
  navigateAfterAuth(context({ currentTask: { key: "setup-mfa" } }))
  expect(assign).toHaveBeenLastCalledWith("/session-tasks")
  navigateAfterAuth(context({ currentTask: null }))
  expect(assign).toHaveBeenLastCalledWith("/dashboard")
})

it("returns CLI sign-ins to the website without allowing external redirects", () => {
  const assign = vi.fn<(url: string) => void>()
  const getItem = vi.fn<() => string>().mockReturnValue("/cli/login?state=test")
  vi.stubGlobal("window", { location: { assign }, sessionStorage: { getItem } })
  const context = { session: { currentTask: null }, decorateUrl: (url: string) => url } as unknown as Parameters<
    typeof navigateAfterAuth
  >[0]
  navigateAfterAuth(context)
  expect(assign).toHaveBeenLastCalledWith("/cli/login?state=test")
  getItem.mockReturnValue("https://other.example")
  navigateAfterAuth(context)
  expect(assign).toHaveBeenLastCalledWith("/dashboard")
})
