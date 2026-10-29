import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { BuildOutput } from "./build-output"
import { frontendProject } from "./fixtures"
import { MediaWarnings } from "./media-warnings"
import type { Release } from "./model"

const version: Release = {
  ...frontendProject.releases[0]!,
  status: "building",
  build: { ...frontendProject.releases[0]!.build, logs: ["Installing dependencies…"] }
}
const meta = {
  title: "Project dashboard/Build output",
  component: BuildOutput,
  args: { version },
  parameters: { layout: "padded" }
} satisfies Meta<typeof BuildOutput>
export default meta
type Story = StoryObj<typeof meta>
export const Live: Story = {
  render: function Live() {
    const [step, setStep] = useState(0)
    const warnings: Release["build"]["mediaWarnings"] = [
      { kind: "cover", message: "Cover input must be between 1 byte and 1 MiB." },
      { kind: "trailer", message: "The configured trailer file was not found in the game output." }
    ]
    const current: Release = {
      ...version,
      status: step > 1 ? "ready" : "building",
      build: {
        ...version.build,
        logs: [
          ...version.build.logs,
          ...(step > 0 ? Array.from({ length: 80 }, (_, i) => `Building module ${i + 1}`) : []),
          ...(step > 1
            ? ["Listing cover omitted: Cover input must be between 1 byte and 1 MiB.", "Build completed."]
            : [])
        ],
        ...(step > 1 ? { mediaWarnings: warnings } : {})
      }
    }
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-2">
        <button className="rounded border px-3 py-2 text-sm" onClick={() => setStep(step + 1)} disabled={step > 1}>
          Emit next build event
        </button>
        <MediaWarnings warnings={current.build.mediaWarnings} />
        <BuildOutput version={current} />
      </div>
    )
  }
}
