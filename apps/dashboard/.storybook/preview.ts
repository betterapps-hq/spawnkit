import { definePreview } from "@spawn/storybook-config/preview"
import { createElement } from "react"
import { ThemeProvider } from "../src/components/theme-provider"
import "../src/style.css"
export default definePreview({
  decorators: [(Story) => createElement(ThemeProvider, null, createElement(Story))],
  parameters: {
    layout: "padded",
    a11y: { test: "error" },
    options: {
      storySort: {
        order: [
          "Project dashboard",
          [
            "Projects",
            "Create project",
            "Overview",
            "Deployments",
            "PR previews",
            "Domains",
            "Analytics",
            "Management"
          ],
          "Dashboard"
        ]
      }
    }
  }
})
