import type { Meta, StoryObj } from "@storybook/react-vite"
import { TeamPreview } from "./team-preview"

const meta = {
  title: "Administration/Team",
  component: TeamPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Team access proposal, with fictional identities. Invitations, role changes and history are local previews; no email is sent."
      }
    }
  }
} satisfies Meta<typeof TeamPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Members: Story = {}
export const Invite: Story = { args: { scenario: "invite" } }
export const LastAdmin: Story = { args: { scenario: "last-admin" } }
export const Observer: Story = { args: { role: "Observer" } }
export const SmallTeam: Story = { args: { scenario: "empty" } }
export const Failed: Story = { args: { scenario: "error" } }
export const InviteFailed: Story = { args: { scenario: "invite-error" } }
