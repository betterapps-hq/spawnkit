import * as p from "@clack/prompts"
import { selectedComponents } from "@spawn/templates"
import {
  addons,
  templates,
  physicsOptions,
  uiOptions,
  telemetryOptions,
  validateProjectName
} from "@spawn/templates/catalog"
import type { AddonId, UiId } from "@spawn/templates/catalog"
import color from "picocolors"
import { runCli } from "./cli"
import type { CompositionPrompts } from "./composition"
import type { LinkPrompts } from "./link"
import { platformCommands } from "./platform"
import { validateSentryDsn } from "./sentry"

class Cancelled extends Error {}
function answer<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) throw new Cancelled()
  return value as Exclude<T, symbol>
}
const brand = `${color.bgMagenta(color.white(" SPAWNKIT "))} ${color.dim("/  Build your next world")}`

const compositionPrompts: CompositionPrompts = {
  choose: async (issue) => {
    const choice = await p.select({
      message: issue.message,
      options: [
        ...issue.choices.map((entry, index) => ({ value: index, label: entry.label })),
        { value: -1, label: "Cancel", hint: "keep the current game" }
      ]
    })
    return p.isCancel(choice) || choice === -1 ? undefined : choice
  },
  confirm: async (summary) => {
    p.note(summary, "Review changes")
    const choice = await p.confirm({ message: "Apply these changes?", initialValue: false })
    return !p.isCancel(choice) && choice
  }
}

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

async function guidedArgs() {
  const name = answer(
    await p.text({
      message: "What’s your project called?",
      placeholder: "my-game",
      defaultValue: "my-game",
      validate: (value) => validateProjectName(value ?? "")
    })
  )
  const renderer = answer(
    await p.select({
      message: "Choose your renderer",
      options: templates.map((entry) => ({
        value: entry.id,
        label: entry.name,
        hint: `${entry.dimension.toUpperCase()} · ${entry.id === "pixi" || entry.id === "babylon" ? "recommended" : "alternative"}`
      }))
    })
  )
  const physics = answer(
    await p.select({
      message: "Add a physics engine",
      options: physicsOptions
        .filter((entry) => (entry.renderers as readonly string[]).includes(renderer))
        .map((entry) => ({ value: entry.id, label: entry.name }))
    })
  )
  const ui = answer(
    await p.select({
      message: "Choose your game interface",
      initialValue: "html",
      options: uiOptions
        .filter((entry) => (entry.renderers as readonly string[]).includes(renderer))
        .map((entry) => ({ value: entry.id, label: entry.name }))
    })
  )
  const ecs = answer(
    await p.select({
      message: "Choose your entity component system",
      initialValue: "none",
      options: [
        { value: "none", label: "None", hint: "plain TypeScript simulation" },
        ...addons
          .filter((entry) => entry.id === "bitecs" || entry.id === "koota")
          .map((entry) => ({ value: entry.id, label: entry.name, hint: entry.description }))
      ]
    })
  )
  const modules: AddonId[] = answer(
    await p.multiselect({
      message: "Choose add-ons",
      required: false,
      initialValues: ["vitest"],
      options: addons
        .filter((entry) => entry.id !== "storybook" && entry.id !== "bitecs" && entry.id !== "koota")
        .map((entry) => ({ value: entry.id, label: entry.name, hint: entry.description }))
    })
  )
  if (ecs !== "none") modules.unshift(ecs as "bitecs" | "koota")
  const storybook = answer(await p.confirm({ message: "Add Storybook for game UI development?", initialValue: false }))
  if (storybook) modules.push("storybook")
  const telemetry = answer(
    await p.select({
      message: "Choose telemetry",
      options: telemetryOptions.map((entry) => ({
        value: entry.id,
        label: entry.name,
        hint:
          entry.id === "platform"
            ? "project telemetry · requires setup and consent"
            : entry.id === "sentry"
              ? "bring your own DSN"
              : "no integration"
      }))
    })
  )
  let sentryDsn = ""
  if (telemetry === "sentry") {
    p.note(
      "Find your public DSN in Sentry → Project Settings → Client Keys (DSN).\nIt will be saved as VITE_SENTRY_DSN in .env, which Git ignores.\nDo not paste an API/auth token. Leave blank to configure it later.",
      "Connect Sentry"
    )
    sentryDsn = answer(await p.password({ message: "Sentry DSN (optional)", validate: validateSentryDsn })).trim()
  }
  p.note(
    [
      `Project    ${name}`,
      `Renderer   ${renderer}`,
      `Physics    ${physics}`,
      `UI         ${ui}`,
      `Modules    ${modules.join(", ") || "none"}`,
      `Telemetry  ${telemetry}`,
      ...(telemetry === "sentry"
        ? [`Sentry DSN ${sentryDsn ? "save to .env (hidden)" : "configure later in .env"}`]
        : [])
    ].join("\n"),
    "Your project"
  )
  const args = [
    "init",
    name,
    "--add",
    selectedComponents({ name, template: renderer, physics, ui: ui as UiId, telemetry, addons: modules }).join(",")
  ]
  return { args, sentryDsn }
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
  try {
    if (args[0] && platformCommands.includes(args[0])) {
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
      p.outro("Use status and logs to follow platform operations.")
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
    const guided =
      interactive && (args.length === 0 || (args.length === 1 && args[0] === "init")) ? await guidedArgs() : undefined
    const effective = guided?.args ?? args
    if (
      effective[0] === "add" ||
      effective[0] === "addons" ||
      (effective[0] === "init" && effective.some((arg) => arg === "--add" || arg.startsWith("--add=")))
    ) {
      await runCli(effective, process.cwd(), (text) => p.log.info(text.trim()), {
        ...(interactive ? { composition: compositionPrompts } : {}),
        ...(guided?.sentryDsn ? { sentryDsn: guided.sentryDsn } : {})
      })
      p.outro(process.exitCode === 1 ? "Review the choices above, then try again." : "Ready for your next step.")
      return
    }
    const isHelp = effective.includes("--help") || effective.includes("-h") || effective.length === 0
    if (isHelp || effective.includes("--version") || effective.includes("-v")) {
      let output = ""
      await runCli(effective, process.cwd(), (text) => {
        output += text
      })
      p.note(output.replace(/^SPAWN.*\n\n/, "").trim(), isHelp ? "Command reference" : "Version")
      p.outro(color.dim("Create locally. Build something worth playing."))
      return
    }
    if (effective[0] === "templates") {
      // Validate flags through the same parser used by noninteractive commands.
      await runCli([...effective, "--json"], process.cwd(), () => {})
      p.note(
        templates
          .map(
            (entry) => `${color.bold(entry.name.padEnd(13))} ${entry.dimension.toUpperCase()}  ${color.dim(entry.id)}`
          )
          .join("\n"),
        "Game templates"
      )
      p.log.info("Add physics, UI, bitECS or Koota, tests, and telemetry during setup.")
      p.outro(`Start with ${color.magenta("spawn init")}`)
      return
    }
    let output = ""
    const progress = p.spinner()
    progress.start(effective.includes("--dry-run") ? "Resolving your project" : "Creating your project")
    try {
      const writeResult = (text: string) => {
        output += text
      }
      if (guided?.sentryDsn)
        await runCli([...effective, "--json"], process.cwd(), writeResult, { sentryDsn: guided.sentryDsn })
      else await runCli([...effective, "--json"], process.cwd(), writeResult)
    } catch (error) {
      progress.error("Project was not created")
      throw error
    }
    const result = JSON.parse(output) as {
      name: string
      status: string
      destination: string
      modules: string[]
      files: string[]
      setup: unknown
      nextSteps: string[]
    }
    progress.stop(`${result.status === "planned" ? "Plan ready" : "Project created"} · ${result.files.length} files`)
    if (guided?.sentryDsn) p.log.info("Sentry DSN saved to .env (value hidden).")
    if (result.status === "planned")
      p.note(JSON.stringify({ files: result.files, setup: result.setup }, null, 2), "Setup plan")
    p.note(
      `${color.bold(result.name)}\n${color.dim(result.destination)}\n\n${result.modules.join(" · ")}`,
      "Project details"
    )
    p.note(result.nextSteps.join("\n"), result.status === "planned" ? "After generation" : "Your next steps")
    p.outro(result.status === "planned" ? "Dry run complete. No files were written." : "Your next world starts here.")
  } catch (error) {
    if (error instanceof Cancelled) {
      p.cancel("Setup cancelled. No files were written.")
      process.exitCode = 130
      return
    }
    throw error
  }
}
