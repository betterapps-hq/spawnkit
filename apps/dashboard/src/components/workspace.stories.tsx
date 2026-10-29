import { physicsOptions, type PhysicsId } from "@spawn/templates/catalog"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { ModuleCards } from "./module-cards"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
const meta = { title: "Dashboard/Components", component: Button } satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>
export const Actions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>New project</Button>
      <Button variant="outline">View deployment</Button>
      <Button variant="secondary">Sandbox</Button>
      <Button disabled>Deploy</Button>
    </div>
  )
}
export const ProjectSetup: Story = {
  render: () => (
    <Card className="max-w-sm p-6">
      <h2 className="font-semibold">Project setup</h2>
      <Label htmlFor="story-name">Project name</Label>
      <Input id="story-name" defaultValue="my-game" />
      <div className="flex gap-2">
        <Badge>Production</Badge>
        <Badge variant="secondary">Sandbox</Badge>
      </div>
      <Button>Create project</Button>
    </Card>
  )
}

export const PhysicsCards: Story = {
  render: function PhysicsStory() {
    const [value, setValue] = useState<PhysicsId>("none")
    return (
      <div className="max-w-2xl">
        <ModuleCards
          title="Physics"
          kind="physics"
          value={value}
          options={physicsOptions.filter((entry) => (entry.renderers as readonly string[]).includes("phaser"))}
          onChange={setValue}
        />
      </div>
    )
  }
}
