import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { demoProjects, multiplayerProject } from "./fixtures"
import { InteractiveStudio as ProjectStudio } from "./story-fixture"
const meta = {
  title: "Project dashboard/Create project",
  component: ProjectStudio,
  parameters: { layout: "fullscreen" },
  args: { project: multiplayerProject, projects: demoProjects, initialPage: "create", onAction: fn(async () => {}) }
} satisfies Meta<typeof ProjectStudio>
export default meta
type Story = StoryObj<typeof meta>
export const StarterKits: Story = {}
export const Configure: Story = { args: { initialCreationStep: 1, initialDraft: { name: "Emberfall" } } }
export const Hosting: Story = { args: { initialCreationStep: 2, initialDraft: { name: "Emberfall" } } }
export const Multiplayer: Story = {
  args: {
    initialCreationStep: 2,
    initialDraft: { name: "Iron Frontier", template: "babylon", mode: "multiplayer", sandbox: true }
  }
}
export const Review: Story = {
  args: { initialCreationStep: 3, initialDraft: { name: "Emberfall", template: "phaser", physics: "arcade" } }
}
export const ServicesAndSandbox: Story = {
  args: {
    initialCreationStep: 3,
    initialDraft: { name: "Orchard Trail", services: ["auth", "saves"], sandbox: true, database: "postgresql" }
  }
}
export const CreationFailed: Story = {
  args: {
    initialCreationStep: 3,
    initialDraft: { name: "Emberfall" },
    onAction: fn(async () => {
      throw new Error("Simulated creation failure")
    })
  }
}
export const ReadOnly: Story = { args: { canEdit: false } }
