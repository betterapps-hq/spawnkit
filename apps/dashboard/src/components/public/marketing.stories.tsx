import type { Meta, StoryObj } from "@storybook/react-vite"
import { CloudPage } from "./cloud-page"
import { CloudScene } from "./cloud-scene"
import { CreatePage } from "./create-page"
import { CreatorTools } from "./creator-tools"
import { ManagedPlatform } from "./managed-platform"
import { PlatformShowcase } from "./platform-showcase"
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
export const CreatorWorkbench: Story = {
  name: "Creator tools and regression checks",
  render: () => (
    <PublicShell active="/create">
      <div className="mk-page mk-creators">
        <div className="mk-container">
          <CreatorTools />
        </div>
      </div>
    </PublicShell>
  )
}
export const BrowserDevices: Story = {
  name: "Browser device showcase",
  render: () => (
    <PublicShell active="/create">
      <div className="mk-page mk-creators">
        <div className="mk-container">
          <PlatformShowcase />
        </div>
      </div>
    </PublicShell>
  )
}
export const Cloud: Story = { render: () => <CloudPage /> }
export const ReleaseFlow: Story = {
  name: "Development workflow",
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
const workflowStory = (step: "test" | "deploy" | "monitor"): Story => ({
  render: () => (
    <PublicShell active="/cloud">
      <div className="mk-page mk-cloud">
        <div className="mk-container mk-cloud-section">
          <ReleaseWalkthrough defaultStep={step} />
        </div>
      </div>
    </PublicShell>
  )
})
export const BuildChecks: Story = { ...workflowStory("test"), name: "Animated build checks" }
export const DeploymentWorkflow: Story = { ...workflowStory("deploy"), name: "Promotion and rollback" }
export const Monitoring: Story = { ...workflowStory("monitor"), name: "Game monitoring" }
export const ManagedServices: Story = {
  render: () => (
    <PublicShell active="/cloud">
      <div className="mk-page mk-cloud">
        <div className="mk-container">
          <ManagedPlatform />
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
  name: "Environment scene concept",
  render: () => (
    <PublicShell active="/cloud">
      <div className="mk-container mk-cloud-section">
        <p>Earlier environment illustration concept.</p>
        <CloudScene />
      </div>
    </PublicShell>
  )
}
