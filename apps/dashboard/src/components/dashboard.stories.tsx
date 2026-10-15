import { templates, addons } from "@spawn/templates/catalog"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { DashboardFixture } from "./dashboard-fixture"
const meta = {
  title: "Dashboard/Dashboard",
  component: DashboardFixture,
  parameters: { layout: "fullscreen" },
  args: {
    catalog: { templates, addons },
    session: { user: { id: "storybook-user", email: "designer@example.test", firstName: "Designer" } },
    onSignOut: () => {}
  }
} satisfies Meta<typeof DashboardFixture>
export default meta
type Story = StoryObj<typeof meta>
export const Home: Story = { args: { initialView: "dashboard" } }
export const Composer: Story = { args: { initialView: "templates" } }
