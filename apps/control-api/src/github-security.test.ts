import { expect, it } from "vitest"
import { githubRepository, validWebhookSignature } from "./github-security"
import { HttpError } from "./http"

it("verifies GitHub's published HMAC test vector", () => {
  expect(
    validWebhookSignature(
      Buffer.from("Hello, World!"),
      "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
      "It's a Secret to Everybody"
    )
  ).toBe(true)
})
it("rejects tampered payloads and malformed signatures", () => {
  for (const signature of [null, "sha1=123", "sha256=" + "0".repeat(64)])
    expect(validWebhookSignature(Buffer.from("bad"), signature, "secret")).toBe(false)
})
it("accepts only repository paths on GitHub", () => {
  expect(githubRepository("https://github.com/team/game.git")).toBe("team/game")
  expect(() => githubRepository("https://github.com.attacker.test/team/game")).toThrow(HttpError)
  expect(() => githubRepository("https://github.com/team/../game")).toThrow(HttpError)
})
