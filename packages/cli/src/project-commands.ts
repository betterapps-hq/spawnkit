import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { createCli, runCli, type CliIo, type CliOptions } from "@buildkitgg/scaffolder/cli"
import { catalog, settings } from "@spawn/templates/scaffold"
import { version } from "../package.json"

/** Commands that create or change a game. The scaffolding engine runs them from SpawnKit's catalog. */
const projectCommands = [
  "init",
  "add",
  "config",
  "upgrade",
  "sync",
  "check",
  "status",
  "explain",
  "plan",
  "catalog",
  "schema",
  "recover"
]
// Earlier names for `spawn catalog`.
const aliases: Record<string, string> = { addons: "catalog", templates: "catalog" }

function options(io: Partial<CliIo> = {}): CliOptions {
  return {
    name: "spawn",
    version,
    description: "Create, extend and upgrade standalone browser games",
    catalog,
    settings,
    io
  }
}

/**
 * Whether the engine runs this command. `spawn status <deployment-id>` stays a deploy command: an argument that could be
 * a deployment ID and isn't a file in the folder goes to the platform, and `spawn status [path]` goes to the engine.
 */
export function isProjectCommand(args: readonly string[], cwd: string): boolean {
  const [command, target] = args
  if (command === undefined || !(projectCommands.includes(command) || command in aliases)) return false
  return !(
    command === "status" &&
    target !== undefined &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(target) &&
    !existsSync(resolve(cwd, target))
  )
}

/** Runs a project command and returns its exit code: 0 done, 1 needs a decision, 2 usage, 3 conflict, 4 drift, 5 locked. */
export function runProjectCommand(args: readonly string[], io: Partial<CliIo> = {}): Promise<number> {
  const [command = "", ...rest] = args
  return runCli([aliases[command] ?? command, ...rest], options(io))
}

// The engine describes each command's arguments in its command tree. These are the parts help reads.
type Argument = { type: string; description?: string; alias?: string }
type Command = { meta?: { description?: string }; args?: Record<string, Argument> }

/** `spawn <command> --help`, from the engine's own description of the command and its arguments. */
export function projectCommandHelp(command: string): string {
  const name = aliases[command] ?? command
  const tree = createCli(options()) as unknown as { subCommands: Record<string, Command> }
  const definition = tree.subCommands[name]!
  const args = Object.entries(definition.args ?? {})
  const positionals = args.filter(([, arg]) => arg.type === "positional").map(([id]) => ` [${id}]`)
  const flags = args
    .filter(([, arg]) => arg.type !== "positional")
    .map(([id, arg]) => [`--${id}${arg.type === "boolean" ? "" : " <value>"}`, arg.description ?? ""] as const)
  const width = Math.max(...flags.map(([flag]) => flag.length))
  return [
    `SPAWNKIT  /  spawn ${name}`,
    "",
    `Usage: spawn ${name}${positionals.join("")} [options]`,
    "",
    definition.meta?.description ?? "",
    "",
    "Options:",
    ...flags.map(([flag, description]) => `  ${flag.padEnd(width)}  ${description}`),
    ""
  ].join("\n")
}

const short = (id: string) => id.slice(id.lastIndexOf("/") + 1)

/** The project section of `spawn --help`: templates, slots, tools and kits, read from the catalog. */
export function projectHelp(): string {
  const tools = [...new Set(catalog.templates.flatMap((template) => Object.keys(template.optional ?? {})))].map(short)
  return [
    "Create and change a game:",
    "  spawn init [template] [folder]  Create a game. With no arguments in a terminal, it asks",
    "  spawn add <add-on...>           Add an add-on, or swap one with --replace <add-on>",
    "  spawn catalog [--json]          Every template, add-on and question",
    "  spawn upgrade | sync | check | status [path] | config | explain | plan | schema | recover",
    "  Run spawn <command> --help for a command's options.",
    "",
    `Templates: ${catalog.templates.map((template) => template.id).join(", ")}`,
    ...catalog.slots.map(
      (slot) =>
        `--${slot.id.padEnd(10)} ${catalog.addons
          .filter((addon) => addon.slot === slot.id)
          .map((addon) => short(addon.id))
          .join(", ")}`
    ),
    `--with       ${tools.join(", ")}`,
    `--preset     ${(catalog.presets ?? []).map((preset) => preset.id).join(", ")}`
  ].join("\n")
}
