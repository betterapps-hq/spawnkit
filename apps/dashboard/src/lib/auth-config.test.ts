import { expect, it } from "vitest"
import { authConfigured, authorizedParties } from "./auth-config"

const valid = { VITE_CLERK_PUBLISHABLE_KEY: "pk_test_example", CLERK_SECRET_KEY: "sk_test_example" }
it("keeps an unconfigured dashboard signed out", () => {
  expect(authConfigured({})).toBe(false)
  expect(authConfigured({ VITE_CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: " " })).toBe(false)
})
it("rejects partial credentials without exposing their values", () => {
  expect(() => authConfigured({ VITE_CLERK_PUBLISHABLE_KEY: valid.VITE_CLERK_PUBLISHABLE_KEY })).toThrow("incomplete")
  expect(() => authConfigured({ CLERK_SECRET_KEY: valid.CLERK_SECRET_KEY })).toThrow("incomplete")
})
it("accepts complete development and production configuration", () => {
  expect(authConfigured(valid)).toBe(true)
  expect(authConfigured({ VITE_CLERK_PUBLISHABLE_KEY: "pk_live_example", CLERK_SECRET_KEY: "sk_live_example" })).toBe(
    true
  )
})
it("rejects swapped keys and mixed environments", () => {
  expect(() => authConfigured({ ...valid, VITE_CLERK_PUBLISHABLE_KEY: "sk_test_example" })).toThrow("publishable key")
  expect(() => authConfigured({ ...valid, CLERK_SECRET_KEY: "pk_test_example" })).toThrow("secret key")
  expect(() => authConfigured({ ...valid, CLERK_SECRET_KEY: "sk_live_example" })).toThrow("same environment")
})
it("never accepts development credentials for the production dashboard", () => {
  expect(() => authConfigured({ ...valid, SPAWN_ENVIRONMENT: "production" })).toThrow("production credentials")
  expect(authConfigured({ ...valid, SPAWN_ENVIRONMENT: "staging" })).toBe(true)
  expect(
    authConfigured({
      VITE_CLERK_PUBLISHABLE_KEY: "pk_live_example",
      CLERK_SECRET_KEY: "sk_live_example",
      SPAWN_ENVIRONMENT: "production"
    })
  ).toBe(true)
})
it("restricts sessions to the exact dashboard rather than customer game subdomains", () => {
  expect(authorizedParties({ SPAWN_SITE_URL: "https://spawnkit.cloud" })).toEqual(["https://spawnkit.cloud"])
  expect(authorizedParties({ SPAWN_SITE_URL: "https://staging.spawnkit.cloud" })).toEqual([
    "https://staging.spawnkit.cloud"
  ])
  expect(authorizedParties({})).toEqual(["http://127.0.0.1:5173", "http://localhost:5173"])
  expect(authorizedParties({ SPAWN_SITE_URL: "https://feature-a1b2.local.spawnkit.cloud" })).toEqual([
    "https://feature-a1b2.local.spawnkit.cloud"
  ])
  expect(authorizedParties({ SPAWN_SITE_URL: "http://127.0.0.1:5174" })).toEqual(["http://127.0.0.1:5174"])
  expect(() => authorizedParties({ SPAWN_ENVIRONMENT: "production", SPAWN_SITE_URL: "http://127.0.0.1:5174" })).toThrow(
    "exact HTTPS origin"
  )
  for (const site of ["http://spawnkit.cloud", "https://user@spawnkit.cloud", "https://spawnkit.cloud/path"])
    expect(() => authorizedParties({ SPAWN_SITE_URL: site })).toThrow("exact HTTPS origin")
})
