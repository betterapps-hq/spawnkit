import { basename, resolve } from "node:path"
import { parseArgs } from "node:util"
import { componentCatalog, createProjectPlan, planAddition, resolveComposition } from "@spawn/templates"
import type { ProjectOptions, ResolutionIssue } from "@spawn/templates"
import { addModules, formatAddition, readSafe } from "./add"
import { scaffoldProject, validateDestination } from "./scaffold"
import { validateSentryDsn } from "./sentry"
import { findGameRoot } from "./source"

export type CompositionPrompts = {
  choose: (issue: ResolutionIssue) => Promise<number | undefined>
  confirm: (summary: string) => Promise<boolean>
}

const help = `SPAWNKIT / Compose your game

  spawn addons [--json]
  spawn init <directory> --add <names> [--name <name>] [--yes]
  spawn add <names...> [--directory <path>] [--replace <names>] [--yes]

--add accepts comma-separated names and can be repeated.
--replace explicitly approves replacing selected add-ons in an existing game.
--dry-run shows changes and unresolved choices without writing files.
--yes accepts a resolved plan; it never chooses replacements or overwrites edits.
--json returns structured output without prompts. Combine with --yes to apply.

Interactive commands ask you to review the complete plan before applying it.
Without a terminal, preview is the default. Use --yes to apply.
Dependencies are listed in the plan. Run pnpm install after applying.
The renderer cannot be changed with add.

  spawn init my-game --add pixi,rapier2d,pixi-ui --add vitest
  spawn add koota --replace bitecs --dry-run
`

const names = (values: string[]) => values.flatMap((value) => value.split(",").map((id) => id.trim())).filter(Boolean)

export async function runComposition(
  args: string[],
  cwd: string,
  write: (text: string) => void,
  setup: { composition?: CompositionPrompts; sentryDsn?: string } = {}
) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      add: { type: "string", multiple: true },
      replace: { type: "string", multiple: true },
      directory: { type: "string" },
      name: { type: "string" },
      yes: { type: "boolean", short: "y" },
      "dry-run": { type: "boolean" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" }
    }
  })
  const [command, ...operands] = positionals
  const emit = (result: unknown, text: string) =>
    write(values.json ? JSON.stringify(result, null, 2) + "\n" : text + "\n")
  if (values.help) {
    emit({ status: "help", content: help }, help)
    return
  }
  if (command === "addons") {
    if (operands.length || Object.keys(values).some((key) => key !== "json"))
      throw new Error("addons accepts only --json or --help.")
    emit(
      { addons: componentCatalog },
      [
        "Available add-ons",
        "",
        ...componentCatalog.map(
          (entry) =>
            `${entry.id.padEnd(20)} ${entry.name}${entry.requires.length ? ` · requires ${entry.requires.join(", ")}` : ""}`
        )
      ].join("\n")
    )
    return
  }
  if (command !== "init" && command !== "add") throw new Error("Use spawn init or spawn add.")
  if (command === "init" && (operands.length !== 1 || values.directory || values.replace))
    throw new Error("Use spawn init <directory> --add <names>.")
  if (command === "add" && values.name) throw new Error("--name is only supported by init.")
  let requested = names([...(command === "add" ? operands : []), ...(values.add ?? [])])
  if (!requested.length) throw new Error("Choose add-ons with --add <names>. Run spawn addons to see available names.")
  let replace = names(values.replace ?? [])
  const destination =
    command === "init" ? resolve(cwd, operands[0]!) : await findGameRoot(resolve(cwd, values.directory ?? "."))
  let current: ProjectOptions | undefined
  if (command === "init") await validateDestination(destination)
  else {
    const state = await readSafe(destination, ".spawn/state.json")
    if (!state) throw new Error("No ownership record found. Run add from a SpawnKit-generated project root.")
    planAddition(state, {}, [])
    current = (JSON.parse(state) as { options: ProjectOptions }).options
  }
  const name = current?.name ?? values.name ?? basename(destination)
  const prompts = !values.json && !values["dry-run"] && !values.yes ? setup.composition : undefined
  let resolution = resolveComposition(name, requested, current, replace)
  while ("issue" in resolution) {
    const issue = resolution.issue
    if (!prompts || !issue.choices.length) {
      emit(
        { status: "needs-decision", destination, issue },
        [
          "Choose how to continue",
          issue.message,
          ...issue.choices.map(
            (choice) => `  ${choice.label}${choice.replace.length ? ` · --replace ${choice.replace.join(",")}` : ""}`
          ),
          "No files changed. Run interactively to choose, or revise the requested add-ons."
        ].join("\n")
      )
      process.exitCode = 1
      return
    }
    const selected = await prompts.choose(issue)
    if (selected === undefined) {
      emit({ status: "cancelled" }, "Cancelled. No files changed.")
      return
    }
    const choice = issue.choices[selected]
    if (!choice) throw new Error("Invalid add-on selection.")
    requested = choice.requested
    replace = choice.replace
    resolution = resolveComposition(name, requested, current, replace)
  }
  const composition = resolution.plan
  const generated = command === "init" ? createProjectPlan(composition.options) : undefined
  if (setup.sentryDsn?.trim()) {
    if (!generated || composition.options.telemetry !== "sentry")
      throw new Error("A Sentry DSN requires Sentry during game creation.")
    const error = validateSentryDsn(setup.sentryDsn)
    if (error) throw new Error(error)
    generated.files[".env"] = `VITE_SENTRY_DSN=${JSON.stringify(setup.sentryDsn.trim())}\n`
  }
  const addition = generated ? undefined : await addModules(destination, [], false, composition.options)
  const summary = [
    `Plan for ${name}`,
    destination,
    "",
    `Add      ${composition.added.join(", ") || "nothing"}`,
    ...composition.required.map((entry) => `Required ${entry.id} (needed by ${entry.by})`),
    `Replace  ${composition.removed.join(", ") || "nothing"}`,
    "",
    ...(generated
      ? [
          "Files",
          ...Object.keys(generated.files)
            .filter((path) => path !== ".spawn/state.json")
            .map((path) => `  + ${path}`),
          "",
          "Packages and scripts",
          ...Object.entries(JSON.parse(generated.files["package.json"]!) as Record<string, unknown>)
            .filter(([key]) => ["dependencies", "devDependencies", "scripts"].includes(key))
            .flatMap(([key, value]) => [
              key,
              ...Object.entries(value as Record<string, string>).map(([id, version]) => `  ${id}  ${version}`)
            ])
        ]
      : [formatAddition(addition!, false).trim(), ""]),
    ...(addition?.status === "conflict" || addition?.status === "unchanged"
      ? []
      : ["After applying: pnpm install, then pnpm dev."])
  ].join("\n")
  const preview = {
    status: addition?.status ?? "planned",
    destination,
    composition,
    files: generated ? Object.keys(generated.files) : undefined,
    addition
  }
  if (
    addition?.status === "conflict" ||
    addition?.status === "unchanged" ||
    values["dry-run"] ||
    (!values.yes && !prompts)
  ) {
    emit(preview, summary + "\nNo files changed.")
    if (addition?.status === "conflict") process.exitCode = 1
    return
  }
  if (!values.yes && !(await prompts!.confirm(summary))) {
    emit({ status: "cancelled" }, "Cancelled. No files changed.")
    return
  }
  if (generated) await scaffoldProject(generated, destination)
  const applied = generated
    ? undefined
    : await addModules(destination, [], true, composition.options, addition!.fingerprint)
  emit(
    { status: generated ? "created" : applied!.status, destination, composition, addition: applied },
    `${generated ? "Game created" : "Add-ons updated"}\n${destination}\nSelected: ${composition.selected.join(", ")}\n\nNext steps\n  cd "${destination}"\n  pnpm install\n  pnpm dev`
  )
}
