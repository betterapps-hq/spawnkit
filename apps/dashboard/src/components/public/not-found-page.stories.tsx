import type { Meta, StoryObj } from "@storybook/react-vite"
import { NotFoundPage } from "./not-found-page"

const meta = {
  title: "Public site/Game not found",
  component: NotFoundPage,
  parameters: { layout: "fullscreen" }
} satisfies Meta<typeof NotFoundPage>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
