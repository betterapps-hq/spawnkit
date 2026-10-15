import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { demoProjects, multiplayerProject } from "./fixtures"
import { InteractiveStudio } from "./story-fixture"

const meta = {
  title: "Project dashboard/Navigation",
  component: InteractiveStudio,
  parameters: { layout: "fullscreen" },
  args: {
    project: multiplayerProject,
    projects: demoProjects,
    initialPage: "overview",
    onAction: fn(async () => {}),
    account: { name: "Alex Morgan", email: "alex@example.test", onManage: fn(), onSignOut: fn() }
  }
} satisfies Meta<typeof InteractiveStudio>
export default meta
type Story = StoryObj<typeof meta>
export const Expanded: Story = {}
export const Collapsed: Story = { args: { initialSidebarOpen: false } }
export const Notifications: Story = {
  args: {
    notifications: [
      {
        id: "failed",
        kind: "error",
        title: "Version build failed",
        description: "Forest Party's latest build needs your attention.",
        time: "2 minutes ago",
        target: { page: "deployments", projectId: multiplayerProject.id }
      },
      {
        id: "preview",
        kind: "preview",
        title: "PR preview is ready",
        description: "Review the new lobby before merging.",
        time: "18 minutes ago",
        target: { page: "deployments", projectId: multiplayerProject.id }
      },
      {
        id: "live",
        kind: "success",
        title: "Production updated",
        description: "Your version is live in all production regions.",
        time: "1 hour ago",
        read: true,
        target: { page: "overview", projectId: multiplayerProject.id }
      }
    ]
  }
}
