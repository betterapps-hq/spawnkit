import { memoryTree, plan, type Answers, type Plan } from "@buildkitgg/scaffolder"
import { catalog, settings } from "./catalog"

export { catalog, settings } from "./catalog"
export { isRenderer } from "./target"
export type { Renderer } from "./game"

/**
 * Plans a new game on an empty tree: what `spawn init` writes, for the dashboard's previews and downloads. Throws when
 * the answers leave a question open.
 */
export async function planGame(answers: Answers): Promise<Plan> {
  const planned = await plan({
    catalog,
    settings,
    request: { intent: { command: "init", answers } },
    tree: memoryTree({})
  })
  if (planned.status !== "planned") {
    const reason = planned.error?.message ?? planned.decisions[0]?.message ?? planned.status
    throw new Error(`These answers don't make a game: ${reason}`)
  }
  return planned
}

/** The files `spawn init` writes for these answers, keyed by path. */
export async function gameFiles(answers: Answers): Promise<Record<string, string>> {
  const planned = await planGame(answers)
  return Object.fromEntries(
    planned.operations.flatMap((operation) =>
      operation.content === undefined ? [] : [[operation.path, operation.content]]
    )
  )
}
