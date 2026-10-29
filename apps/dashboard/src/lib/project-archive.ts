import { createProjectPlan, type ProjectOptions } from "@spawn/templates"
import { strToU8, zipSync } from "fflate"

export function projectArchive(options: ProjectOptions) {
  const plan = createProjectPlan(options)
  return zipSync(
    Object.fromEntries(
      Object.entries(plan.files).map(([path, source]) => [`${options.name}/${path}`, strToU8(source)])
    ),
    { level: 6 }
  )
}
