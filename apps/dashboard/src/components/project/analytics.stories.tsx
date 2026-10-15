import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { AnalyticsWorkspace } from "./analytics/analytics"
import { analyticsFixture, manyReleasesFixture } from "./analytics/fixtures"
import type { Investigator } from "./analytics/investigation"
import { investigateFixture, failedInvestigationFixture } from "./analytics/investigation.fixture"
import { demoProjects, multiplayerProject } from "./fixtures"
import { InteractiveStudio } from "./story-fixture"

const meta = {
  title: "Project dashboard/Analytics",
  component: AnalyticsWorkspace,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Interactive Analytics design using deterministic sample telemetry. AI investigation uses a story-only adapter; no model, repository writes, or notification delivery is connected. Player metrics use complete UTC days. Production must inject authenticated data and investigation services."
      }
    }
  },
  args: {
    investigator: investigateFixture as Investigator | null,
    data: analyticsFixture,
    canEdit: true,
    state: "ready",
    initialTab: "overview"
  },
  argTypes: {
    data: { control: false },
    investigator: { control: false },
    initialIssue: { control: "text" },
    initialTab: {
      control: "select",
      options: ["overview", "players", "issues", "performance", "sessions", "explore", "releases", "alerts"]
    },
    state: { control: "select", options: ["ready", "empty", "loading", "unavailable"] }
  },
  render: (args) => (
    <InteractiveStudio
      project={multiplayerProject}
      projects={demoProjects}
      initialPage="analytics"
      canEdit={args.canEdit ?? true}
      onAction={fn(async () => {})}
      analyticsPreview={
        <AnalyticsWorkspace
          key={`${args.initialTab}-${args.initialIssue}-${args.initialSession}-${args.initialTrace}-${args.state}-${args.canEdit}`}
          {...args}
        />
      }
    />
  )
} satisfies Meta<typeof AnalyticsWorkspace>
export default meta
type Story = StoryObj<typeof meta>
export const Overview: Story = {}
export const ManyReleases: Story = {
  args: { data: manyReleasesFixture },
  parameters: {
    docs: {
      description: {
        story:
          "500 releases, including 60 older versions still reporting. Search by version or commit, browse older pages, and select releases with no matching data."
      }
    }
  }
}
export const ManyReleasesComparison: Story = {
  name: "Many Releases Health",
  args: { data: manyReleasesFixture, initialTab: "releases" }
}
export const Players: Story = { args: { initialTab: "players" } }
export const AIUnavailable: Story = { args: { initialTab: "issues", initialIssue: "SPN-241", investigator: null } }
export const AIServiceError: Story = {
  args: { initialTab: "issues", initialIssue: "SPN-241", investigator: failedInvestigationFixture }
}
export const Issues: Story = { args: { initialTab: "issues" } }
export const IssueInvestigation: Story = { args: { initialTab: "issues", initialIssue: "SPN-241" } }
export const Performance: Story = { args: { initialTab: "performance" } }
export const Sessions: Story = { args: { initialTab: "sessions" } }
export const SessionInvestigation: Story = {
  args: {
    initialTab: "sessions",
    initialSession: analyticsFixture.sessions.find(
      (session) => session.issueId === "SPN-241" && session.environment === "production"
    )!.id
  }
}
export const TraceInvestigation: Story = {
  args: {
    initialTab: "performance",
    initialTrace: analyticsFixture.sessions.find(
      (session) => session.issueId === "SPN-241" && session.environment === "production"
    )!.id
  }
}
export const Explore: Story = { args: { initialTab: "explore" } }
export const ReleaseComparison: Story = { name: "Release Health", args: { initialTab: "releases" } }
export const Alerts: Story = { args: { initialTab: "alerts" } }
export const Empty: Story = { args: { state: "empty" } }
export const Loading: Story = { args: { state: "loading" } }
export const Unavailable: Story = { args: { state: "unavailable" } }
export const ReadOnly: Story = { args: { canEdit: false, initialTab: "issues", initialIssue: "SPN-241" } }

export const PlayersUnavailable: Story = {
  args: { initialTab: "players", data: { ...analyticsFixture, playerCoverage: [] } }
}
export const PlayersQuiet: Story = { args: { initialTab: "players", data: { ...analyticsFixture, playerDays: [] } } }
export const NewGame: Story = {
  args: {
    initialTab: "players",
    data: {
      ...analyticsFixture,
      playerCoverage: analyticsFixture.playerCoverage!.map((range) => ({ ...range, from: range.until - 86_400_000 }))
    }
  }
}
