import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { frontendProject } from "./fixtures"
import type { ProjectPage } from "./model"
import { SettingsPreview } from "./settings-preview"
import { InteractiveStudio } from "./story-fixture"

const project = {
  ...frontendProject,
  name: "Orchard Snake",
  slug: "orchard-snake",
  artwork: "/examples/snake.webp",
  production: { ...frontendProject.production, url: "spawn-snake.spawnkit.games" }
}
const meta = {
  title: "Project dashboard/Settings",
  component: SettingsPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The shared project Settings form with simulated save and deletion states. Live Settings uses the same controls with owner-authorized APIs."
      }
    }
  },
  args: { scenario: "default", connected: false },
  render: function SettingsStory(args) {
    const [page, setPage] = useState<ProjectPage>("settings")
    const [deleted, setDeleted] = useState(false)
    return (
      <InteractiveStudio
        project={project}
        projects={deleted ? [] : [project]}
        initialPage="settings"
        initialSidebarOpen
        location={{ page, projectId: project.id }}
        onNavigate={(next) => setPage(next.page)}
        settingsPreview={
          <SettingsPreview
            key={`${args.scenario}-${args.connected}`}
            {...args}
            onExit={() => {
              setDeleted(true)
              setPage("projects")
            }}
          />
        }
      />
    )
  }
} satisfies Meta<typeof SettingsPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Game: Story = {}
export const UnsavedChanges: Story = { args: { scenario: "unsaved" } }
export const Saved: Story = { args: { scenario: "saved" } }
export const SaveFailed: Story = { args: { scenario: "save-failed" } }
export const ConnectedRepository: Story = { args: { connected: true } }
export const DeleteConfirmation: Story = { args: { scenario: "delete" } }
export const Deleting: Story = { args: { scenario: "deleting" } }
export const DeleteFailed: Story = { args: { scenario: "delete-failed" } }
