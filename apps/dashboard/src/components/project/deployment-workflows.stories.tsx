import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, useCallback, useRef } from "react"
import { applyCloudState, type ProjectState } from "@/lib/cloud-project-model"
import { projectRecordModel } from "@/lib/project-records"
import type { LoadReleaseChanges } from "@/lib/release-changes"
import { defaultProjectDraft } from "./creation-model"
import { compareReleases, issues, pullRequests, releases } from "./deployment-map/release-data"
import type { ActionHandler, ProjectModel } from "./model"
import { ProjectStudio } from "./studio"

function projectFixture(mode: "single" | "multiplayer", empty: boolean): ProjectModel {
  const configuration = {
    ...defaultProjectDraft,
    name: "Thornwatch",
    mode,
    sandbox: !empty,
    previews: !empty,
    database: mode === "multiplayer" ? ("postgresql" as const) : ("none" as const),
    github: {
      mode: "connect" as const,
      name: "thornwatch",
      visibility: "private" as const,
      url: "https://github.com/studio/thornwatch"
    }
  }
  const state: ProjectState = {
    capabilities: { builds: true, github: true, domains: true },
    repository: empty ? null : "studio/thornwatch",
    environments: [
      {
        name: "production",
        enabled: 1,
        currentReleaseId: empty ? null : "v1.7.2",
        hostname: "thornwatch.spawnkit.cloud"
      },
      ...(!empty
        ? [
            {
              name: "sandbox" as const,
              enabled: 1,
              currentReleaseId: "v1.8.0",
              hostname: "staging.thornwatch.spawnkit.cloud"
            }
          ]
        : [])
    ],
    releases: empty
      ? []
      : releases.map((release, index) => ({
          id: release.version,
          versionNumber: 3 - index,
          buildId: `build-${index}`,
          status: "ready",
          environment: index === 0 ? "sandbox" : "production",
          artifactDigest: `sha256:${release.sha.padEnd(64, "0")}`,
          url: null,
          commitSha: release.sha.padEnd(40, "0"),
          branch: "main",
          sourceTitle: release.commits[0]?.message ?? "Release",
          createdAt: "2026-10-14T10:00:00Z"
        })),
    previews: empty
      ? []
      : [
          {
            id: "github-event-18427",
            number: 18427,
            title: "Add skill-based matchmaking",
            branch: "feat/ranked-queues",
            commitSha: "b".repeat(40),
            versionId: "v1.8.0",
            currentVersionId: "v1.8.0",
            status: "succeeded",
            hostname: "pr-18427.thornwatch.spawnkit.cloud",
            updated: "2026-10-14T10:00:00Z"
          }
        ],
    deployments: [],
    logs: [],
    domains: []
  }
  const project = applyCloudState(
    projectRecordModel({ id: "connected-project", name: "Thornwatch", configuration }),
    state
  )
  project.releases = project.releases.map((release) => ({ ...release, label: release.id }))
  project.production.release = project.releases.find((release) => release.id === "v1.7.2") ?? null
  if (project.sandbox) project.sandbox.release = project.releases[0] ?? null
  return project
}
const fixtureChanges: LoadReleaseChanges = async (_project, from, to) => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return { ...compareReleases(from ?? "v1.7.1", to), pullRequests, issues }
}

function ConnectedDeploymentDemo({
  mode = "single",
  empty = false,
  readOnly = false,
  requestFails = false,
  useApi = false,
  productionChanges = false,
  previewBuilding = false
}: {
  mode?: "single" | "multiplayer"
  empty?: boolean
  readOnly?: boolean
  requestFails?: boolean
  useApi?: boolean
  productionChanges?: boolean
  previewBuilding?: boolean
}) {
  const [project, setProject] = useState(() => {
    const project = projectFixture(mode, empty)
    if (previewBuilding) {
      // Build origin stays immutable after the same artifact reaches Staging or Production.
      project.releases[0]!.environment = "preview"
      project.releases[2]!.environment = "preview"
      project.previews[0]!.state = "building"
      project.releases.unshift({
        ...project.releases[0]!,
        id: "v1.9.0",
        label: "v1.9.0",
        number: 4,
        environment: "sandbox",
        status: "failed",
        retained: false,
        build: { ...project.releases[0]!.build, artifact: null }
      })
      project.deployments.push({
        id: "preview-build",
        versionId: "pending-preview",
        previousVersionId: "v1.8.0",
        environment: "preview",
        kind: "deploy",
        state: "rolling-out",
        actor: "Alexandra Morgan-Sutherland",
        time: "2026-10-14T12:00:00Z",
        regions: []
      })
    }
    return project
  })
  const [lastAction, setLastAction] = useState("")
  const refreshed = useRef(false)
  const loadChanges = useCallback<LoadReleaseChanges>(
    async (...args) => {
      const result = await fixtureChanges(...args)
      if (productionChanges && !refreshed.current) {
        refreshed.current = true
        setProject((current) => ({
          ...current,
          production: { ...current.production, release: current.releases.find((release) => release.id === "v1.7.1")! }
        }))
      }
      return result
    },
    [productionChanges]
  )
  const onAction: ActionHandler = async (action) => {
    setLastAction(JSON.stringify(action))
    if (requestFails) throw new Error("The environment changed. Review its current release and retry.")
    if (action.kind === "promote" || action.kind === "rollback") {
      if ((project.production.release?.id ?? null) !== action.values.expectedVersionId)
        throw new Error("Production changed.")
      const target = project.releases.find((release) => release.id === action.values.versionId)!
      setProject((current) => ({ ...current, production: { ...current.production, release: target } }))
    } else if (action.kind === "close-preview")
      setProject((current) => ({
        ...current,
        previews: current.previews.filter((preview) => preview.id !== action.values.previewId)
      }))
    else if (action.kind === "retry-preview")
      setProject((current) => ({
        ...current,
        previews: current.previews.map((preview) =>
          preview.id === action.values.previewId ? { ...preview, state: "building" } : preview
        )
      }))
  }
  return (
    <>
      <ProjectStudio
        project={project}
        projects={[project]}
        initialPage="deployments"
        initialSidebarOpen={false}
        deploymentMapEnabled
        canEdit={!readOnly}
        onAction={onAction}
        loadReleaseChanges={useApi ? undefined : loadChanges}
      />
      <output hidden data-testid="deployment-action">
        {lastAction}
      </output>
    </>
  )
}
const meta = {
  title: "Project dashboard/Connected deployments",
  component: ConnectedDeploymentDemo,
  parameters: { layout: "fullscreen" },
  args: { mode: "single", empty: false, readOnly: false, requestFails: false, useApi: false },
  argTypes: { useApi: { control: false, table: { disable: true } } }
} satisfies Meta<typeof ConnectedDeploymentDemo>
export default meta
type Story = StoryObj<typeof meta>
export const Frontend: Story = {}
export const ConfiguredInfrastructure: Story = { args: { mode: "multiplayer" } }
export const EmptyProject: Story = { args: { empty: true } }
export const ReadOnly: Story = { args: { readOnly: true } }
export const RequestConflict: Story = { args: { requestFails: true } }

export const ProductionChanges: Story = { args: { productionChanges: true } }
export const ConcurrentPreview: Story = { args: { previewBuilding: true } }
