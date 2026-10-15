import { expect, it } from "vitest"
import { normalizeHostname } from "./domains"
import { HttpError } from "./http"

it("normalizes owned public hostnames", () => {
  expect(normalizeHostname(" Play.Example.com. ")).toBe("play.example.com")
})
it.each([
  "https://example.com",
  "127.0.0.1",
  "game.local",
  "localhost",
  "a.workers.dev",
  "example.com/path",
  "-bad.com",
  "a..com",
  "*.example.com",
  "a.com:443"
])("rejects invalid custom hostname %s", (hostname) => {
  expect(() => normalizeHostname(hostname)).toThrow(HttpError)
})
