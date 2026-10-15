import type { Meta, StoryObj } from "@storybook/react-vite"
import { useEffect, useState } from "react"
import { fn } from "storybook/test"
import {
  degradedProject,
  demoProjects,
  frontendProject,
  freshProject,
  multiRegionProject,
  multiplayerProject,
  servicesProject
} from "./fixtures"
import { InteractiveStudio as ProjectStudio } from "./story-fixture"
const meta = {
  title: "Project dashboard/Management",
  component: ProjectStudio,
  parameters: { layout: "fullscreen" },
  args: { project: multiplayerProject, projects: demoProjects, onAction: fn(async () => {}) }
} satisfies Meta<typeof ProjectStudio>
export default meta
type Story = StoryObj<typeof meta>
export const Logs: Story = { args: { initialPage: "logs" } }
export const TelemetryConnected: Story = { args: { initialPage: "analytics", telemetryEnabled: true } }
const largeLogProject = {
  ...multiplayerProject,
  logs: Array.from({ length: 10_000 }, (_, index) => ({
    ...multiplayerProject.logs[index % multiplayerProject.logs.length]!,
    id: `log-volume-${index + 1}`,
    time: new Date(Date.UTC(2026, 9, 14, 10) + index * 120).toISOString().slice(11, 23),
    message:
      index === 9999
        ? "Runtime event 10000: Save request timed out after 3000ms. Retrying (1/3).\nTimeoutError: persistence request exceeded deadline\n    at savePlayer (src/services/saves.ts:42:11)\n    at ForestRoom.onMessage (src/rooms/forest.ts:128:5)"
        : `Runtime event ${index + 1}: ${multiplayerProject.logs[index % multiplayerProject.logs.length]!.message}`
  }))
}
export const LogsLargeVolume: Story = { args: { initialPage: "logs", project: largeLogProject } }
export const LogsLiveTraffic: Story = {
  args: { initialPage: "logs" },
  render: function LiveTraffic(args) {
    const [logs, setLogs] = useState(largeLogProject.logs.slice(0, 100))
    useEffect(() => {
      const timer = setInterval(
        () =>
          setLogs((previous) => [
            ...previous.slice(-1999),
            {
              ...multiplayerProject.logs[0]!,
              id: `live-${Date.now()}`,
              time: new Date().toISOString().slice(11, 23),
              message: `Room heartbeat received. Sequence ${previous.at(-1)?.id ?? "start"}.`
            }
          ]),
        1000
      )
      return () => clearInterval(timer)
    }, [])
    return <ProjectStudio {...args} project={{ ...multiplayerProject, logs }} />
  }
}
export const LogsDisconnected: Story = { args: { initialPage: "logs", disconnected: true } }
export const LogsEmpty: Story = { args: { initialPage: "logs", project: freshProject } }
export const Users: Story = { args: { initialPage: "users" } }
export const UsersEmpty: Story = { args: { initialPage: "users", project: { ...multiplayerProject, players: [] } } }
export const UsersNotEnabled: Story = { args: { initialPage: "users", project: frontendProject } }
export const UsersReadOnly: Story = { args: { initialPage: "users", canEdit: false } }
export const Settings: Story = { args: { initialPage: "settings" } }
export const SettingsWithoutRepository: Story = { args: { initialPage: "settings", project: frontendProject } }
export const SettingsReadOnly: Story = { args: { initialPage: "settings", canEdit: false } }
export const SettingsSaveFailed: Story = {
  args: {
    initialPage: "settings",
    onAction: fn(async () => {
      throw new Error("Simulated save failure")
    })
  }
}
export const Backend: Story = { args: { initialPage: "backend" } }
export const BackendMultipleRegions: Story = { args: { initialPage: "backend", project: multiRegionProject } }
export const BackendNeedsAttention: Story = { args: { initialPage: "backend", project: degradedProject } }
export const BackendManagedServices: Story = { args: { initialPage: "backend", project: servicesProject } }
export const BackendFrontendOnly: Story = { args: { initialPage: "backend", project: frontendProject } }
export const BackendSqlite: Story = {
  args: { initialPage: "backend", project: { ...servicesProject, database: "sqlite" } }
}
export const BackendPostgresql: Story = {
  args: { initialPage: "backend", project: { ...servicesProject, database: "postgresql" } }
}
export const BackendReadOnly: Story = { args: { initialPage: "backend", canEdit: false } }
export const BackendSaveFailed: Story = {
  args: {
    initialPage: "backend",
    onAction: fn(async () => {
      throw new Error("Simulated save failure")
    })
  }
}
export const Restart: Story = { args: { initialPage: "backend", initialPanel: "restart" } }
