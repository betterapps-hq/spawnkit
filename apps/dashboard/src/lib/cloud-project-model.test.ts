import { expect, it } from "vitest"
import type { ProjectModel } from "@/components/project/model"
import { applyCloudState, type ProjectState } from "./cloud-project-model"

it("keeps hosting names scheme-free for dashboard links and copy controls", () => {
  const base = { production: { regions: [] }, sandbox: null } as unknown as ProjectModel
  const state: ProjectState = {
    environments: [
      { name: "production", enabled: 1, currentReleaseId: null, hostname: "emberfall.spawnkit.cloud" },
      { name: "sandbox", enabled: 1, currentReleaseId: null, hostname: "staging.emberfall.spawnkit.cloud" }
    ],
    releases: [],
    deployments: [],
    logs: [],
    domains: [],
    repository: null,
    capabilities: { builds: false, domains: false, github: false },
    previews: [
      {
        id: "pr",
        number: 42,
        title: "Preview",
        branch: "feature",
        commitSha: "sha",
        updated: "now",
        versionId: null,
        status: "succeeded",
        hostname: "pr-42.emberfall.spawnkit.cloud"
      }
    ]
  }
  const project = applyCloudState(base, state)
  expect(`https://${project.production.url}`).toBe("https://emberfall.spawnkit.cloud")
  expect(`https://${project.sandbox?.url}`).toBe("https://staging.emberfall.spawnkit.cloud")
  expect(`https://${project.previews[0]?.url}`).toBe("https://pr-42.emberfall.spawnkit.cloud")
})
