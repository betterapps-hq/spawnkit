import { afterEach, expect, it, vi } from "vitest"
import {
  authDestination,
  authErrorMessage,
  navigateAfterAuth,
  requireAuthSuccess,
  signInStep,
  signUpStep
} from "./auth-flow"

afterEach(() => vi.unstubAllGlobals())
it("returns game reviewers to their game after sign-in and rejects other return addresses", () => {
  const store = new Map([["spawn-game-return", "/play/game-1#community"]])
  vi.stubGlobal("window", {
    sessionStorage: { getItem: (key: string) => store.get(key), removeItem: (key: string) => store.delete(key) }
  })
  expect(authDestination()).toBe("/play/game-1#community")
  expect(authDestination()).toBe("/dashboard")
  store.set("spawn-game-return", "//evil.example")
  expect(authDestination()).toBe("/dashboard")
})

it("preserves invitation fragments through sign-in without accepting an external redirect", () => {
  const token = "a".repeat(64)
  const store = new Map([["spawn-team-return", `/team/invitation#${token}`]])
  vi.stubGlobal("window", {
    sessionStorage: { getItem: (key: string) => store.get(key), removeItem: (key: string) => store.delete(key) }
  })
  expect(authDestination()).toBe(`/team/invitation#${token}`)
  expect(authDestination()).toBe("/dashboard")
  store.set("spawn-team-return", "https://evil.example/team/invitation#" + token)
  expect(authDestination()).toBe("/dashboard")
})
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
