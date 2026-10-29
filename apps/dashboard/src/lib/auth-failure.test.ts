import { describe, expect, it } from "vitest"
import { authFailureResponse } from "./auth-failure"
describe("authentication clock errors", () => {
  const request = new Request("https://local.spawnkit.cloud/sign-in", { headers: { accept: "text/html" } })
  it("stops a clock-skew redirect with actionable, non-cacheable HTML", async () => {
    const response = authFailureResponse(
      new Response(null, {
        status: 307,
        headers: {
          location: "https://auth.example/handshake",
          "x-clerk-auth-reason": "session-token-iat-in-the-future"
        }
      }),
      request,
      true
    )!
    expect(response.status).toBe(503)
    expect(response.headers.has("location")).toBe(false)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(await response.text()).toContain("sync your clock")
  })
  it("does not blame a visitor's clock for a production server clock failure", async () => {
    const response = authFailureResponse(
      new Response(null, { headers: { "x-clerk-auth-reason": "token-not-active-yet" } }),
      request,
      false
    )!
    expect(await response.text()).toContain("service’s clock")
  })
  it("redirects page requests to sign-in rather than displaying clock errors elsewhere", () => {
    const response = authFailureResponse(
      new Response(null, { headers: { "x-clerk-auth-reason": "token-iat-in-the-future" } }),
      new Request("https://local.spawnkit.cloud/dashboard", { headers: { accept: "text/html" } }),
      true
    )!
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("/sign-in")
  })
  it("returns a structured error to API callers and leaves ordinary refreshes alone", async () => {
    expect(
      authFailureResponse(
        new Response(null, { headers: { "x-clerk-auth-reason": "session-token-expired" } }),
        request,
        true
      )
    ).toBeNull()
    const response = authFailureResponse(
      new Response(null, { headers: { "x-clerk-auth-reason": "token-iat-in-the-future" } }),
      new Request(request.url),
      true
    )!
    expect((await response.json()).error.code).toBe("sign_in_required")
  })
})
