import type { Meta, StoryObj } from "@storybook/react-vite"
import { ManagePreview } from "./manage-preview"

const meta = {
  title: "Administration/Manage",
  component: ManagePreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Sample games, comments and moderation history. Interactions remain local to this Storybook design."
      }
    }
  }
} satisfies Meta<typeof ManagePreview>
export default meta
type Story = StoryObj<typeof meta>
export const Games: Story = {}
export const Comments: Story = { args: { initialView: "Comments" } }
export const GameReview: Story = { args: { reviewGame: true } }
export const Activity: Story = { args: { initialView: "Activity" } }
export const Moderator: Story = { args: { role: "Moderator", reviewGame: true } }
export const ReadOnly: Story = { args: { role: "Viewer" } }
export const Empty: Story = { args: { empty: true } }
export const Loading: Story = { args: { state: "loading" } }
export const Failed: Story = { args: { state: "error" } }
