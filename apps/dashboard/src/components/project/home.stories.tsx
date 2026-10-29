import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { defaultProjectDraft } from "@/components/project/creation-model"
import { projectRecordModel } from "@/lib/project-records"
import { demoProjects, multiplayerProject, degradedProject } from "./fixtures"
import { InteractiveStudio as ProjectStudio } from "./story-fixture"
const meta = {
  title: "Project dashboard/Projects",
  component: ProjectStudio,
  parameters: { layout: "fullscreen" },
  args: { project: multiplayerProject, projects: demoProjects, initialPage: "projects", onAction: fn(async () => {}) }
} satisfies Meta<typeof ProjectStudio>
export default meta
type Story = StoryObj<typeof meta>
export const AllProjects: Story = {}
const savedProject = projectRecordModel({
  id: "saved-project",
  name: "Mosslight",
  configuration: { ...defaultProjectDraft, name: "Mosslight" }
})
export const SingleProject: Story = { args: { project: savedProject, projects: [savedProject], cloudEnabled: false } }
export const SingleLiveProject: Story = { args: { projects: [multiplayerProject] } }
export const Empty: Story = { args: { projects: [] } }
export const NeedsAttention: Story = { args: { projects: [demoProjects[0]!, degradedProject] } }
export const CreateProject: Story = { args: { initialPage: "create" } }
