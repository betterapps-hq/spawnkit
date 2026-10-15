import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { demoProjects, frontendProject, multiplayerProject, previewProject } from "./fixtures"
import { InteractiveStudio as ProjectStudio } from "./story-fixture"
const meta = {
  title: "Project dashboard/PR previews",
  component: ProjectStudio,
  parameters: { layout: "fullscreen" },
  args: {
    project: previewProject,
    projects: demoProjects,
    initialPage: "deployments",
    initialSection: "previews",
    onAction: fn(async () => {})
  }
} satisfies Meta<typeof ProjectStudio>
export default meta
type Story = StoryObj<typeof meta>
export const OpenPullRequests: Story = {}
export const NoOpenPullRequests: Story = { args: { project: multiplayerProject } }
export const GithubNotConnected: Story = { args: { project: frontendProject } }
export const Disabled: Story = { args: { project: { ...previewProject, previewsEnabled: false } } }
export const FrontendPreview: Story = {
  args: {
    project: {
      ...frontendProject,
      repository: "studio/clockwork-courier",
      previewsEnabled: true,
      releases: previewProject.releases,
      previews: [{ ...previewProject.previews[1]!, isolation: "Static hosting / no multiplayer runtime" }]
    }
  }
}
export const NewCommitPending: Story = {
  args: {
    project: { ...previewProject, previews: [{ ...previewProject.previews[1]!, state: "outdated", commit: "c718a92" }] }
  }
}
export const Cleanup: Story = {
  args: {
    project: {
      ...previewProject,
      previews: [
        { ...previewProject.previews[0]!, state: "closing" },
        { ...previewProject.previews[1]!, state: "cleanup-failed" }
      ]
    }
  }
}
export const ReadOnly: Story = { args: { canEdit: false } }
