import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { domainProject, exampleDomain } from "./domain-fixtures"
import { demoProjects, frontendProject, frontendSandboxProject } from "./fixtures"
import { InteractiveStudio as ProjectStudio } from "./story-fixture"
const meta = {
  title: "Project dashboard/Domains",
  component: ProjectStudio,
  parameters: { layout: "fullscreen" },
  args: { project: domainProject, projects: demoProjects, initialPage: "domains", onAction: fn(async () => {}) }
} satisfies Meta<typeof ProjectStudio>
export default meta
type Story = StoryObj<typeof meta>
export const Connected: Story = {}
export const FirstDomain: Story = { args: { project: frontendProject } }
export const BeforeFirstDeployment: Story = {
  args: {
    project: {
      ...frontendSandboxProject,
      releases: [],
      deployments: [],
      production: { ...frontendSandboxProject.production, release: null, url: "", status: "empty" },
      sandbox: { ...frontendSandboxProject.sandbox!, release: null, url: "", status: "empty" }
    }
  }
}
export const ConnectDomain: Story = { args: { project: frontendSandboxProject, initialDomain: "connect" } }
export const DnsInstructions: Story = { args: { initialDomain: "www.clockwork.example.com" } }
export const CertificateIssuing: Story = { args: { initialDomain: "test.clockwork.example.com" } }
export const CertificateFailed: Story = {
  args: {
    project: {
      ...domainProject,
      domains: [
        {
          ...exampleDomain("play.clockwork.example.com", "production", "error"),
          certificate: "error",
          issue:
            "Your domain's CAA records do not allow the required certificate issuer. Update the records listed by your DNS provider, then check again."
        }
      ]
    },
    initialDomain: "play.clockwork.example.com"
  }
}
export const DnsMismatch: Story = {
  args: {
    project: {
      ...domainProject,
      domains: [
        {
          ...exampleDomain("play.clockwork.example.com", "production", "error"),
          issue: "The CNAME points to another service. Update it to the value below, then check again."
        }
      ]
    },
    initialDomain: "play.clockwork.example.com"
  }
}
export const ReadOnly: Story = { args: { canEdit: false, initialDomain: "play.clockwork.example.com" } }
export const RequestFailed: Story = {
  args: {
    initialDomain: "connect",
    onAction: fn(async () => {
      throw new Error("Simulated domain request failure")
    })
  }
}
