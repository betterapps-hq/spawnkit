import { expect, it } from "vitest"
import { appSecurityHeaders } from "./content-security"

it("trusts the exact identity provider without trusting games as scripts or connections", () => {
  const nonce = crypto.randomUUID()
  const policy = appSecurityHeaders(nonce, `pk_live_${btoa("clerk.spawnkit.cloud$")}`)["Content-Security-Policy"]
  const directives = Object.fromEntries(policy.split("; ").map((part) => [part.split(" ")[0], part]))
  expect(directives["script-src"]).toContain(`'nonce-${nonce}'`)
  expect(directives["script-src"]).toContain("https://clerk.spawnkit.cloud")
  for (const kind of ["script-src", "connect-src"]) {
    expect(directives[kind]).not.toContain("https://*.spawnkit.cloud")
    expect(directives[kind]).not.toContain("https://*.spawnkit.games")
    expect(directives[kind]).not.toContain("'unsafe-eval'")
    expect(directives[kind]).not.toContain("'unsafe-inline'")
  }
  expect(directives["frame-src"]).toContain("https://*.spawnkit.games")
  expect(policy).not.toContain("https://*.spawnkit.cloud")
  expect(directives["frame-ancestors"]).toBe("frame-ancestors 'none'")
  expect(directives["form-action"]).toBe("form-action 'self'")
  const consentPolicy = appSecurityHeaders(nonce, `pk_live_${btoa("clerk.spawnkit.cloud$")}`, true)[
    "Content-Security-Policy"
  ]
  expect(consentPolicy).toContain("form-action 'self' https://clerk.spawnkit.cloud http://127.0.0.1:43819/callback")
  expect(() => appSecurityHeaders("user-supplied")).toThrow(/./)
  expect(() => appSecurityHeaders(nonce, `pk_live_${btoa("evil.example; script-src *$")}`)).toThrow(/./)
})
