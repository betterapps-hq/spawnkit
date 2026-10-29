import type { Meta, StoryObj } from "@storybook/react-vite"
import { MediaStoragePreview } from "./media-storage-preview"

const meta = {
  title: "Project dashboard/Media and storage",
  component: MediaStoragePreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Creator media and storage proposal. Sizes, retention rules and the 1 GiB allowance are sample design data, not live usage or settled product policy. Media limits reflect the existing listing contract. Cleanup never reaches production."
      }
    }
  }
} satisfies Meta<typeof MediaStoragePreview>
export default meta
type Story = StoryObj<typeof meta>
export const Overview: Story = {}
export const Processing: Story = { args: { scenario: "processing" } }
export const Queued: Story = { args: { scenario: "queued" } }
export const Failed: Story = { args: { scenario: "failed" } }
export const NearLimit: Story = { args: { scenario: "near-limit" } }
export const LimitReached: Story = { args: { scenario: "limit" } }
export const CleanupFailed: Story = { args: { scenario: "cleanup-error" } }
export const Empty: Story = { args: { scenario: "empty" } }
