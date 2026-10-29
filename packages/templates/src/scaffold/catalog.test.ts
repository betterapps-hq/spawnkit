import { checkCatalog } from "@buildkitgg/scaffolder"
import { describe, expect, it } from "vitest"
import { catalog } from "./catalog"

describe("scaffold catalog", () => {
  it("plans every kit and every pair of answers for each template", () => {
    expect(checkCatalog(catalog, { matrix: true })).toEqual([])
  })
})
