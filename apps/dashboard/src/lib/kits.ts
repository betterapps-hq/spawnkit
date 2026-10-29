import { findStarterKit } from "@spawn/templates/kits"
import { createServerFn } from "@tanstack/react-start"

export const getStarterKitDetails = createServerFn({ method: "GET" })
  .validator((id: string) => {
    if (!findStarterKit(id)) throw new Error("Unknown starter kit")
    return id
  })
  .handler(async ({ data }) => {
    const { starterKitPlan, projectSetup } = await import("./kit-plan")
    const plan = await starterKitPlan(data)
    return {
      files: Object.keys(plan.files),
      setup: projectSetup(plan.files),
      source: plan.files["src/main.ts"] ?? "",
      command: `pnpm dlx @spawnkit/cli ${plan.argv.join(" ")}`
    }
  })
