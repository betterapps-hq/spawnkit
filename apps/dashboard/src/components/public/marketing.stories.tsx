import type { Meta, StoryObj } from "@storybook/react-vite"
import { CloudPage } from "./cloud-page"
import { CloudScene } from "./cloud-scene"
import { CreatePage } from "./create-page"
import { CloudPricing } from "./pricing-page"
import { ReleaseWalkthrough } from "./release-walkthrough"
import { PublicShell } from "./shell"

const meta = {
  title: "Public site/Marketing",
  parameters: { layout: "fullscreen" }
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Creators: Story = { render: () => <CreatePage /> }
export const Cloud: Story = { render: () => <CloudPage /> }
export const ReleaseFlow: Story = {
  render: () => (
    <PublicShell active="/cloud">
      <div className="mk-page mk-cloud">
        <div className="mk-container mk-cloud-section">
          <ReleaseWalkthrough />
        </div>
      </div>
    </PublicShell>
  )
}
export const Pricing: Story = {
  render: () => (
    <PublicShell active="/cloud">
      <div className="mk-page mk-cloud">
        <div className="mk-container">
          <CloudPricing />
        </div>
      </div>
    </PublicShell>
  )
}
export const EnvironmentStudy: Story = {
  name: "Environment scene · concept",
  render: () => (
    <PublicShell active="/cloud">
      <div className="mk-container mk-cloud-section">
        <p>Environment illustration study. Customer PR previews are planned.</p>
        <CloudScene />
      </div>
    </PublicShell>
  )
}
