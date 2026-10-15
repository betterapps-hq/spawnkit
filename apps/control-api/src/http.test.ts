import { describe, expect, it } from "vitest"
import { boundedBody, jsonBody } from "./http"

describe("request limits", () => {
  it("rejects chunked bodies above the limit without relying on content-length", async () => {
    const request = new Request("https://example.test", { method: "POST", body: "123456" })
    await expect(boundedBody(request, 5)).rejects.toMatchObject({ status: 413 })
  })
  it("rejects malformed JSON", async () => {
    await expect(jsonBody(new Request("https://example.test", { method: "POST", body: "[" }))).rejects.toMatchObject({
      status: 400
    })
  })
})
