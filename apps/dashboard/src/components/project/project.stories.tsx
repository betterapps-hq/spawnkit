import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { domainProject } from "./domain-fixtures"
import {
  buildingProject,
  degradedProject,
  demoProjects,
  emptySandboxProject,
  frontendProject,
  frontendSandboxProject,
  freshProject,
  multiRegionProject,
  multiplayerProject,
  multiplayerProductionProject,
  pausedProject,
  servicesProject
} from "./fixtures"
import { InteractiveStudio as ProjectStudio } from "./story-fixture"

const meta = {
  title: "Project dashboard/Overview",
  component: ProjectStudio,
  parameters: { layout: "fullscreen" },
  args: { project: multiplayerProject, projects: demoProjects, onAction: fn(async () => {}) }
} satisfies Meta<typeof ProjectStudio>
export default meta
type Story = StoryObj<typeof meta>
export const Multiplayer: Story = {}
export const FrontendOnly: Story = { args: { project: frontendProject } }
export const FrontendWithSandbox: Story = { args: { project: frontendSandboxProject } }
export const CustomDomains: Story = { args: { project: domainProject } }
export const MultiplayerProductionOnly: Story = { args: { project: multiplayerProductionProject } }
export const PausedRuntime: Story = { args: { project: pausedProject } }
export const SinglePlayerServices: Story = { args: { project: servicesProject } }
export const MultipleRegions: Story = { args: { project: multiRegionProject } }
export const NeedsAttention: Story = { args: { project: degradedProject } }
export const BuildInProgress: Story = { args: { project: buildingProject } }
export const FirstDeployment: Story = { args: { project: freshProject } }
export const EmptySandbox: Story = { args: { project: emptySandboxProject } }
export const ReadOnly: Story = { args: { canEdit: false } }
export const Loading: Story = { args: { viewState: "loading" } }
export const ConnectionError: Story = { args: { viewState: "error" } }
