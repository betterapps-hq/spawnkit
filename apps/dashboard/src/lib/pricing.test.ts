import { expect, it } from "vitest"
import { estimateRuntime, estimateProject } from "./pricing"
it("adds the game fee once to usage and rounds cents", () => {
  expect(estimateRuntime(0.028, 730)).toEqual({ fee: 10, compute: 20.44, total: 30.44 })
  expect(estimateRuntime(0.021, 730)).toEqual({ fee: 10, compute: 15.33, total: 25.33 })
  expect(estimateRuntime(0.028, 0).total).toBe(10)
})
it.each([-1, 745, NaN, Infinity])("rejects invalid runtime hours %s", (hours) => {
  expect(() => estimateRuntime(0.1, hours)).toThrow("Invalid runtime estimate")
})
it("charges the multiplayer bundle once without charging again for included services or Sandbox", () => {
  const estimate = estimateProject({
    multiplayer: true,
    services: true,
    sandbox: true,
    locations: [
      { environment: "production", rate: 0.028, hours: 730 },
      { environment: "production", rate: 0.028, hours: 200 },
      { environment: "sandbox", rate: 0.021, hours: 100 },
      { environment: "sandbox", rate: 0.021, hours: 20 }
    ]
  })
  expect(estimate).toMatchObject({ gameFee: 10, sandboxFee: 0, total: 38.56 })
  expect(estimate.locations).toHaveLength(4)
})
it("excludes disabled sandbox compute", () => {
  expect(
    estimateProject({
      multiplayer: true,
      services: false,
      sandbox: false,
      locations: [
        { environment: "production", rate: 0.028, hours: 730 },
        { environment: "sandbox", rate: 0.021, hours: 100 }
      ]
    })
  ).toMatchObject({ gameFee: 10, sandboxFee: 0, total: 30.44 })
})
it("keeps single-player static, with included services and a separate sandbox fee", () => {
  const base = {
    multiplayer: false,
    services: false,
    sandbox: false,
    locations: [{ environment: "production" as const, rate: 1, hours: 730 }]
  }
  expect(estimateProject(base)).toEqual({ gameFee: 0, sandboxFee: 0, locations: [], total: 0 })
  expect(estimateProject({ ...base, services: true }).total).toBe(5)
  expect(estimateProject({ ...base, sandbox: true }).total).toBe(5)
  expect(estimateProject({ ...base, services: true, sandbox: true }).total).toBe(10)
})
