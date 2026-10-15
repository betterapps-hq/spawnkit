import type { Meta, StoryObj } from "@storybook/react-vite"
import { DeploymentMap } from "./deployment-map/map"
import { demoProjects, multiplayerProject } from "./fixtures"
import { InteractiveStudio } from "./story-fixture"
const meta = {
  title: "Project dashboard/Deployment map",
  component: DeploymentMap,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Storybook-only environment graph. Release, build, and resource changes are simulated in memory; no cloud APIs are called."
      }
    }
  },
  args: { initialView: "Environments", scenario: "healthy", canEdit: true },
  render: (args) => (
    <InteractiveStudio
      project={multiplayerProject}
      projects={demoProjects}
      initialPage="deployments"
      initialSidebarOpen={false}
      deploymentsPreview={
        <DeploymentMap
          key={`${args.initialView}-${args.scenario}-${args.canEdit}-${args.preset}-${args.previewCount}`}
          {...args}
        />
      }
    />
  )
} satisfies Meta<typeof DeploymentMap>
export default meta
type Story = StoryObj<typeof meta>
export const Infrastructure: Story = { name: "Environments" }
export const Pipeline: Story = { args: { initialView: "Pipeline" } }
export const Releases: Story = { args: { initialView: "Releases" } }
export const FailedPipeline: Story = { args: { initialView: "Pipeline", scenario: "failed" } }
export const ReadOnly: Story = { args: { canEdit: false } }
export const ManyPreviews: Story = { args: { previewCount: 12 } }
export const FrontendOnly: Story = { args: { preset: "frontend" } }
export const FrontendWithAssets: Story = { args: { preset: "frontend-assets" } }
export const NeonDatabase: Story = { name: "Frontend + Neon", args: { preset: "neon" } }
export const MultiplayerNeon: Story = { name: "Multiplayer + Neon", args: { preset: "multiplayer-neon" } }
export const GlobalInfrastructure: Story = { args: { preset: "global" } }
