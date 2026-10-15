import type { Meta, StoryObj } from "@storybook/react-vite"
import { LiveTelemetry } from "./telemetry"
const meta = {
  title: "Project dashboard/Telemetry",
  component: LiveTelemetry,
  args: { projectId: "telemetry-demo", sandbox: false, canEdit: true },
  parameters: { layout: "padded" }
} satisfies Meta<typeof LiveTelemetry>
export default meta
export const Live: StoryObj<typeof meta> = {}
