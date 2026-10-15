import { expect, it } from "vitest"
import type { ProjectModel } from "@/components/project/model"
import { applyCloudState, type ProjectState } from "./cloud-project-model"

it("keeps configured previews enabled after the last PR closes, only with a connected repository", () => {
  const base = {
    production: { regions: [] },
    sandbox: null,
    configuration: { previews: true },
    previewsEnabled: false
  } as unknown as ProjectModel
  const state: ProjectState = {
    environments: [],
    releases: [],
    deployments: [],
    logs: [],
    domains: [],
    previews: [],
    repository: "studio/game",
    capabilities: { builds: true, domains: false, github: true }
  }
  expect(applyCloudState(base, state).previewsEnabled).toBe(true)
  expect(applyCloudState(base, { ...state, repository: null }).previewsEnabled).toBe(false)
  expect(
    applyCloudState({ ...base, configuration: { ...base.configuration!, previews: false } }, state).previewsEnabled
  ).toBe(false)
})

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

it("preserves the served preview release when its newer build fails and keeps stable navigation separate from event actions", () => {
  const base = { production: { regions: [] }, sandbox: null } as unknown as ProjectModel
  const state: ProjectState = {
    environments: [
      { name: "production", enabled: 1, currentReleaseId: null, hostname: null },
      { name: "preview-18427", enabled: 1, currentReleaseId: "serving", hostname: "pr-18427.example.com" }
    ],
    releases: [
      {
        id: "failed",
        buildId: "build-new",
        status: "failed",
        environment: "preview-18427",
        createdAt: "2026-10-14T12:00:00Z",
        artifactDigest: null,
        url: null,
        versionNumber: 12,
        commitSha: "new-sha",
        branch: "feature/queues",
        sourceTitle: "New queues"
      },
      {
        id: "serving",
        buildId: "build-old",
        status: "ready",
        environment: "preview-18427",
        createdAt: "2026-10-13T12:00:00Z",
        artifactDigest: "digest",
        url: null,
        versionNumber: 11,
        commitSha: "old-sha",
        branch: "feature/queues",
        sourceTitle: "Queues"
      }
    ],
    deployments: [],
    logs: [],
    domains: [],
    repository: "studio/game",
    capabilities: { builds: false, domains: false, github: true },
    previews: [
      {
        id: "github-event-new",
        number: 18427,
        title: "Queues",
        branch: "feature/queues",
        commitSha: "new-sha",
        updated: "now",
        currentVersionId: "serving",
        versionId: "failed",
        status: "failed",
        hostname: "pr-18427.example.com"
      }
    ]
  }
  const project = applyCloudState(base, state)
  expect(project.previews[0]).toMatchObject({
    id: "github-event-new",
    environmentId: "preview-18427",
    currentVersionId: "serving",
    versionId: "failed",
    state: "failed"
  })
  expect(project.releases.find((release) => release.id === project.previews[0]?.currentVersionId)).toMatchObject({
    status: "ready",
    retained: true,
    environment: "preview"
  })
  expect(project.capabilities).toEqual({ builds: false, domains: false, github: true })

  const next = applyCloudState(base, {
    ...state,
    previews: [{ ...state.previews[0]!, id: "github-event-retry", status: "building" }]
  })
  expect(next.previews[0]?.environmentId).toBe(project.previews[0]?.environmentId)
  expect(next.previews[0]?.id).not.toBe(project.previews[0]?.id)
  expect(next.previews[0]?.currentVersionId).toBe("serving")
})
