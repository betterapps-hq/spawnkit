import type { Meta, StoryObj } from "@storybook/react-vite"
import { PlayerReportPreview } from "./player-report-preview"

const meta = {
  title: "Public site/Report content",
  component: PlayerReportPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Private game and comment reporting proposal. This page is a static player design, without a game iframe or view counter. All reports stay in this preview."
      }
    }
  }
} satisfies Meta<typeof PlayerReportPreview>
export default meta
type Story = StoryObj<typeof meta>
export const EntryPoints: Story = {}
export const ReportGame: Story = { args: { scenario: "game" } }
export const ReportComment: Story = { args: { scenario: "comment" } }
export const SignedOut: Story = { args: { scenario: "signed-out" } }
export const AlreadyReported: Story = { args: { scenario: "duplicate" } }
export const RateLimited: Story = { args: { scenario: "rate-limit" } }
export const Failed: Story = { args: { scenario: "error" } }
export const Received: Story = { args: { scenario: "received" } }
