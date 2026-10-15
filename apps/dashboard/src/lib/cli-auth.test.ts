import { expect, it } from "vitest"
import { cliAuthConfiguration, validateCliRequest } from "./cli-auth"
it("does not expose secrets in public CLI configuration", () => {
  expect(
    cliAuthConfiguration({
      CLERK_SECRET_KEY: "secret",
      CLERK_OAUTH_CLIENT_ID: "client",
      CLERK_OAUTH_ISSUER: "https://clerk.example.com"
    })
  ).toEqual({ clientId: "client", issuer: "https://clerk.example.com" })
  expect(() => cliAuthConfiguration({})).toThrow("setup required")
})
it("limits CLI requests to loopback, identity scopes, and S256 proofs", () => {
  const request = {
    redirect_uri: "http://127.0.0.1:43819/callback",
    response_type: "code",
    scope: "openid",
    state: "a".repeat(43),
    code_challenge: "b".repeat(43),
    code_challenge_method: "S256"
  }
  expect(validateCliRequest({ ...request, client_id: "untrusted" })).not.toHaveProperty("client_id")
  expect(() => validateCliRequest({ ...request, redirect_uri: "https://evil.example" })).toThrow(
    "Invalid CLI authorization"
  )
  expect(() => validateCliRequest({ ...request, scope: "private_metadata" })).toThrow("Invalid CLI authorization")
  expect(() => validateCliRequest({ ...request, state: "bad" })).toThrow("Invalid CLI authorization")
})
