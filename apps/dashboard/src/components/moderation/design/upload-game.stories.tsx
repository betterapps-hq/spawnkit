import type { Meta, StoryObj } from "@storybook/react-vite"
import { UploadGamePreview } from "./upload-game-preview"

const meta = {
  title: "Publishing/Upload game",
  component: UploadGamePreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Browser build upload and listing design. ZIP metadata and referenced media are read locally; configuration downloads use the shared CLI listing contract. Transfers, draft persistence and deployment responses are simulated. No production projects are changed."
      }
    }
  }
} satisfies Meta<typeof UploadGamePreview>
export default meta
type Story = StoryObj<typeof meta>
export const Upload: Story = {}
export const Uploading: Story = { args: { scenario: "uploading" } }
export const UploadFailed: Story = { args: { scenario: "failed" } }
export const InvalidArchive: Story = { args: { scenario: "invalid" } }
export const Details: Story = { args: { scenario: "ready", initialStep: 1 } }
export const ImportedConfig: Story = { args: { scenario: "config", initialStep: 1 } }
export const Media: Story = { args: { scenario: "ready", initialStep: 2 } }
export const ExistingGame: Story = { args: { scenario: "existing", initialStep: 1 } }
export const Complete: Story = { args: { scenario: "complete" } }

export const Publishing: Story = { args: { initialStep: 2, scenario: "publishing" } }
export const PublishFailed: Story = { args: { initialStep: 2, scenario: "publish-failed" } }
