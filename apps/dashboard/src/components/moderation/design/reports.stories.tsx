import type { Meta, StoryObj } from "@storybook/react-vite"
import { ReportsPreview } from "./reports-preview"

const meta = {
  title: "Administration/Reports",
  component: ReportsPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Interactive design proposal. All reports, people, notes and decisions are fictional and stay in memory. No production requests are made."
      }
    }
  }
} satisfies Meta<typeof ReportsPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Inbox: Story = {}
export const Investigation: Story = { args: { showDetail: true } }
export const Escalated: Story = { args: { initialCase: "RPT-1041", showDetail: true } }
export const EditedComment: Story = { args: { initialCase: "RPT-1039", showDetail: true } }
export const AssignedToYou: Story = { args: { initialCase: "RPT-1038", showDetail: true } }
export const Moderator: Story = { args: { initialCase: "RPT-1041", role: "Moderator", showDetail: true } }
export const Observer: Story = { args: { role: "Observer", showDetail: true } }
export const Empty: Story = { args: { scenario: "empty" } }
export const Loading: Story = { args: { scenario: "loading" } }
export const Failed: Story = { args: { scenario: "error" } }
export const SaveFailed: Story = { args: { scenario: "save-error", showDetail: true } }
export const UpdatedElsewhere: Story = { args: { scenario: "conflict", showDetail: true } }
