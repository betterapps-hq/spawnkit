import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import {
  buildingProject,
  demoProjects,
  emptySandboxProject,
  freshProject,
  previewProject,
  drainingProject
} from "./fixtures"
import { InteractiveStudio as ProjectStudio } from "./story-fixture"
const meta = {
  title: "Project dashboard/Deployments",
  component: ProjectStudio,
  parameters: { layout: "fullscreen" },
  args: {
    project: previewProject,
    projects: demoProjects,
    initialPage: "deployments",
    onAction: fn(async () => {})
  }
} satisfies Meta<typeof ProjectStudio>
export default meta
type Story = StoryObj<typeof meta>
export const History: Story = {}
export const VersionDetails: Story = { args: { initialVersion: "rel-24" } }
export const FailedVersion: Story = { args: { initialVersion: "rel-25" } }
export const BuildingVersion: Story = { args: { initialVersion: "rel-27" } }
export const Environments: Story = { args: { initialSection: "environments" } }
export const Activity: Story = { args: { initialSection: "activity" } }
export const DrainingSessions: Story = { args: { project: drainingProject, initialSection: "activity" } }
export const Building: Story = { args: { project: buildingProject } }
export const Empty: Story = { args: { project: freshProject } }
export const Deploy: Story = { args: { initialPanel: "deploy" } }
export const Promote: Story = { args: { initialPanel: "promote" } }
export const PromotionBlocked: Story = { args: { project: emptySandboxProject, initialPanel: "promote" } }
export const Rollback: Story = { args: { initialPanel: "rollback" } }
export const RollbackUnavailable: Story = { args: { project: freshProject, initialPanel: "rollback" } }
export const DeployFromCli: Story = { args: { project: freshProject, initialPanel: "deploy" } }
export const Submitting: Story = { args: { initialPanel: "promote", operationState: "pending" } }
export const Submitted: Story = { args: { initialPanel: "promote", operationState: "success" } }
export const Conflict: Story = { args: { initialPanel: "promote", operationState: "error" } }
export const RequestFailed: Story = {
  args: {
    initialPanel: "promote",
    onAction: fn(async () => {
      throw new Error("Simulated request failure")
    })
  }
}
export const ReadOnly: Story = { args: { initialPanel: "rollback", canEdit: false } }
