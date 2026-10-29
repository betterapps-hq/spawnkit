import { clackPrompter } from "@buildkitgg/scaffolder/cli"
import * as p from "@clack/prompts"
import color from "picocolors"
import { runCli } from "./cli"
import type { LinkPrompts } from "./link"
import { platformCommands } from "./platform"
import { isProjectCommand } from "./project-commands"

const brand = `${color.bgMagenta(color.white(" SPAWNKIT "))} ${color.dim("/  Build your next world")}`

const linkPrompts: LinkPrompts = {
  action: async () => {
    const choice = await p.select({
      message: "Link this game to a SpawnKit project?",
      options: [
        { value: "new" as const, label: "New project" },
        { value: "existing" as const, label: "Existing project" },
        { value: "skip" as const, label: "Skip", hint: "link later with spawn link" }
      ]
    })
    return p.isCancel(choice) ? "skip" : choice
  },
  name: async (defaultName) => {
    const value = await p.text({
      message: "Project name",
      defaultValue: defaultName,
      placeholder: defaultName,
      validate: (value) =>
        value &&
        (value.trim().length > 64 ||
          [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))
          ? "Use 1–64 characters without control characters."
          : undefined
    })
    return p.isCancel(value) ? undefined : value
  },
  project: async (projects) => {
    const value = await p.select({
      message: "Which project should this game use?",
      options: projects.map((project) => ({ value: project.id, label: project.name, hint: project.id }))
    })
    return p.isCancel(value) ? undefined : value
  },
  confirm: async (name) => {
    const value = await p.confirm({
      message: `Create “${name}” with production only? Sandbox can be configured later.`,
      initialValue: true
    })
    return !p.isCancel(value) && value
  }
}

// What to say after a project command, by the engine's exit code.
const outcomes: Record<number, string> = {
  0: "Ready for your next step.",
  1: "Choose an answer above, then run the command again.",
  130: "Cancelled. Nothing was changed."
}

export async function runTerminal(
  args: string[],
  mode = {
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI),
    tty: Boolean(process.stdout.isTTY)
  }
) {
  const interactive = mode.interactive
  if (args.includes("--json") || !mode.tty) {
    await runCli(args, process.cwd(), (text) => process.stdout.write(text))
    return
  }
  p.intro(brand)
  if (args[0] && platformCommands.includes(args[0]) && !isProjectCommand(args, process.cwd())) {
    await runCli(args, process.cwd(), (text) => p.log.info(text.trim()), {
      platform: {
        ...(interactive
          ? {
              confirm: async (summary: string) => {
                p.note(summary, "Review operation")
                const decision = await p.confirm({ message: "Submit this operation?", initialValue: false })
                return !p.isCancel(decision) && decision
              }
            }
          : {}),
        progress: (message) => p.log.step(message)
      }
    })
    p.outro("SpawnKit")
    return
  }
  if (
    (args[0] === "login" ||
      args[0] === "logout" ||
      args[0] === "project" ||
      args[0] === "link" ||
      args[0] === "unlink") &&
    !args.includes("--help") &&
    !args.includes("-h")
  ) {
    await runCli(
      args,
      process.cwd(),
      (text) => {
        p.log.info(text.trim())
      },
      interactive ? { linkPrompts } : {}
    )
    p.outro("Create locally. Build something worth playing.")
    return
  }
  // A bare `spawn` in an interactive terminal starts the guided setup, which is init's wizard.
  const effective = interactive && args.length === 0 ? ["init"] : args
  const isHelp = effective.length === 0 || effective.includes("--help") || effective.includes("-h")
  if (isHelp || effective.includes("--version") || effective.includes("-v")) {
    let output = ""
    await runCli(effective, process.cwd(), (text) => {
      output += text
    })
    p.note(output.replace(/^SPAWN.*\n\n/, "").trim(), isHelp ? "Command reference" : "Version")
    p.outro(color.dim("Create locally. Build something worth playing."))
    return
  }
  if (isProjectCommand(effective, process.cwd())) {
    await runCli(effective, process.cwd(), (text) => p.log.message(text.trimEnd()), {
      project: {
        isTTY: interactive,
        prompter: clackPrompter,
        stderr: (text) => p.log.error(text.trimEnd())
      }
    })
    const code = Number(process.exitCode ?? 0)
    p.outro(outcomes[code] ?? "Review the message above.")
    return
  }
  await runCli(effective, process.cwd(), (text) => p.log.info(text.trim()))
}
