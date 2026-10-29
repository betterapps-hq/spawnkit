import type { Meta, StoryObj } from "@storybook/react-vite"
import { NotificationsPreview } from "./notifications-preview"

const meta = {
  title: "Dashboard/Notifications",
  id: "administration-notifications",
  component: NotificationsPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Novu notification interaction design. Fixture data and state stay inside Storybook; delivery is not connected."
      }
    }
  }
} satisfies Meta<typeof NotificationsPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Inbox: Story = {}
export const Escalation: Story = { args: { showDetail: true } }
export const Unread: Story = { args: { initialFilter: "unread" } }
export const Archived: Story = { args: { initialFilter: "archived" } }
export const HeaderPreview: Story = { args: { showBell: true } }
export const Preferences: Story = { args: { initialTab: "preferences" } }
export const Creator: Story = { args: { role: "Creator" } }
export const CreatorPreferences: Story = { args: { role: "Creator", initialTab: "preferences" } }
export const Moderator: Story = { args: { role: "Moderator" } }
export const Empty: Story = { args: { scenario: "empty" } }
export const Loading: Story = { args: { scenario: "loading" } }
export const Failed: Story = { args: { scenario: "error" } }
export const SaveFailed: Story = { args: { scenario: "save-error", initialTab: "preferences" } }
export const ReportUnavailable: Story = { args: { scenario: "unavailable", showDetail: true } }
