import { expect, it } from "vitest"
import type { ProjectState } from "./cloud-project-model"
import { projectRefreshInterval } from "./project-refresh"

it("stops polling idle and completed projects and follows in-flight builds", () => {
  const state = { deployments: [], previews: [] } as unknown as ProjectState
  expect(projectRefreshInterval()).toBe(false)
  expect(projectRefreshInterval(state)).toBe(false)
  for (const status of ["queued", "building", "activating", "succeeded", "failed", "superseded"]) {
    state.deployments = [{ status }] as ProjectState["deployments"]
    expect(projectRefreshInterval(state)).toBe(["queued", "building", "activating"].includes(status) ? 5000 : false)
  }
  state.deployments = []
  state.previews = [{ status: null, updated: new Date().toISOString() }] as ProjectState["previews"]
  expect(projectRefreshInterval(state)).toBe(5000)
  state.previews = [{ status: null, updated: "2000-01-01" }] as ProjectState["previews"]
  expect(projectRefreshInterval(state)).toBe(false)
})
