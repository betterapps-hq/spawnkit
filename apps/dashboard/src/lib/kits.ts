import { findStarterKit } from "@spawn/templates/kits"
import { createServerFn } from "@tanstack/react-start"

export const getStarterKitDetails = createServerFn({ method: "GET" })
  .validator((id: string) => {
    if (!findStarterKit(id)) throw new Error("Unknown starter kit")
    return id
  })
  .handler(async ({ data }) => {
    const [{ starterKitPlan }, { describeProjectPlan }] = await Promise.all([
      import("./kit-plan"),
      import("@spawn/templates")
    ])
    const plan = starterKitPlan(data)
    return {
      files: Object.keys(plan.files),
      setup: describeProjectPlan(plan),
      source: plan.files["src/main.ts"] ?? "",
      modules: plan.modules
    }
  })
