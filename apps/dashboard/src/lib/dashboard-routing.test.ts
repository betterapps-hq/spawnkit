import { expect, it } from "vitest"
import { dashboardDestination, deploymentSearch } from "./dashboard-routing"
it("uses real paths for dashboard pages, project pages and releases", () => {
  expect(dashboardDestination({ page: "projects" })).toEqual({ to: "/dashboard" })
  expect(dashboardDestination({ page: "create" })).toEqual({ to: "/dashboard/new" })
  expect(dashboardDestination({ page: "submissions" })).toEqual({ to: "/dashboard/submissions" })
  expect(dashboardDestination({ page: "manage" })).toEqual({ to: "/dashboard/manage" })
  expect(dashboardDestination({ page: "overview", projectId: "p" })).toEqual({
    to: "/dashboard/projects/$projectId",
    params: { projectId: "p" }
  })
  expect(dashboardDestination({ page: "deployments", projectId: "p", versionId: "r" })).toEqual({
    to: "/dashboard/projects/$projectId/releases/$versionId",
    params: { projectId: "p", versionId: "r" }
  })
  expect(dashboardDestination({ page: "domains", projectId: "p" })).toEqual({
    to: "/dashboard/projects/$projectId/$page",
    params: { projectId: "p", page: "domains" },
    search: {}
  })
  expect(dashboardDestination({ page: "deployments", projectId: "p", deploymentView: "activity" })).toMatchObject({
    search: { tab: "activity" }
  })
})
it("validates deployment filters", () => {
  expect(deploymentSearch({ tab: "bad", environment: "x".repeat(257) })).toEqual({
    tab: undefined,
    environment: undefined
  })
})
