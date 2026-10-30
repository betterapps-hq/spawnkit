import { kitAnswers, kitArgv, kitProjectName, type Answers } from "@spawn/templates/answers"
import { findStarterKit } from "@spawn/templates/kits"
import { gameFiles } from "@spawn/templates/scaffold"

export interface KitPlan {
  name: string
  answers: Answers
  /** `spawn create --preset <kit> <name>`, without the CLI's name. */
  argv: string[]
  files: Record<string, string>
}

// Kits never change while the Worker runs, so each is planned once.
const plans = new Map<string, Promise<KitPlan>>()

/** A kit's project, planned on an empty tree from the preset `spawn create --preset <kit>` uses. */
export function starterKitPlan(id: string): Promise<KitPlan> {
  const kit = findStarterKit(id)
  if (!kit) throw new Error("Unknown starter kit")
  let planned = plans.get(kit.id)
  if (!planned) {
    const name = kitProjectName(kit)
    const answers = { ...kitAnswers(kit), name }
    planned = gameFiles(answers).then((files) => ({ name, answers, argv: kitArgv(kit), files }))
    plans.set(kit.id, planned)
  }
  // Callers add files, such as attribution, so each gets its own copy.
  return planned.then((plan) => ({ ...plan, files: { ...plan.files } }))
}

/** The package manager, engines, scripts and dependencies a planned project's `package.json` declares. */
export function projectSetup(files: Record<string, string>) {
  const pkg = JSON.parse(files["package.json"] ?? "{}") as {
    packageManager: string
    engines: Record<string, string>
    scripts: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  return {
    packageManager: pkg.packageManager,
    engines: pkg.engines,
    scripts: pkg.scripts,
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {}
  }
}
