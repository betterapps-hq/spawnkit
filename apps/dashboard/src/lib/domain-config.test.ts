import { describe, expect, it } from "vitest"
import { normalizeHostname, readDomainConfigurations } from "./domain-config"

describe("domain configuration", () => {
  it("normalizes hostnames and validates persisted intent", () => {
    expect(normalizeHostname(" Play.Example.com. ")).toBe("play.example.com")
    expect(readDomainConfigurations(undefined)).toEqual([])
    expect(readDomainConfigurations([{ hostname: "play.example.com", environment: "production" }])).toEqual([
      { hostname: "play.example.com", environment: "production" }
    ])
  })
  it("rejects URLs, wildcards, malformed hostnames and unsupported environments", () => {
    for (const input of [
      null,
      7,
      "",
      "localhost",
      "https://play.example.com",
      "play.example.com/path",
      "*.example.com",
      "-bad.example.com",
      "bad..com",
      "a.123",
      `${"x".repeat(64)}.com`,
      `${"a.".repeat(130)}com`
    ])
      expect(() => normalizeHostname(input)).toThrow("Enter a hostname")
    for (const input of [null, {}, [null], [{}], [{ hostname: "play.example.com", environment: "preview" }]])
      expect(() => readDomainConfigurations(input)).toThrow("Invalid domain")
    expect(() =>
      readDomainConfigurations([
        { hostname: "play.example.com", environment: "production" },
        { hostname: "PLAY.EXAMPLE.COM.", environment: "sandbox" }
      ])
    ).toThrow("already configured")
  })
})
