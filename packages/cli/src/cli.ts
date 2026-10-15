import { basename, resolve } from "node:path"
import { parseArgs } from "node:util"
import { createProjectPlan, describeProjectPlan } from "@spawn/templates"
import {
  addons,
  isAddonId,
  isTemplateId,
  templates,
  physicsOptions,
  uiOptions,
  telemetryOptions
} from "@spawn/templates/catalog"
import type { AddonId, PhysicsId, UiId, TelemetryId } from "@spawn/templates/catalog"
import { login, logout, readCredentials } from "./auth"
import { openBrowser } from "./browser"
import { runComposition, type CompositionPrompts } from "./composition"
import { guidedLink } from "./link"
import type { LinkPrompts } from "./link"
import { platformCommands, runPlatform } from "./platform"
import type { PlatformOptions } from "./platform"
import { createPlatformApi, identifier } from "./platform-api"
import { projectSelection } from "./project"
import { scaffoldProject, validateDestination } from "./scaffold"
import { validateSentryDsn } from "./sentry"
import { findGameRoot } from "./source"

const help = `SPAWNKIT  /  Build your next world

Usage:
  spawn addons [--json]
  spawn templates [--json]
  spawn init [directory] [options]
  spawn add <module...> [--directory <path>] [--yes] [--dry-run] [--json]
  spawn login --site <website-url>
  spawn logout [--json]
  spawn project set <id> | show | clear [--directory <path>] [--json]
  spawn link [--project <id>] [--directory <path>] [--json]
  spawn unlink [--directory <path>] [--json]
  spawn deploy [--env sandbox|production] [--dry-run] [--yes]
  spawn releases | status <deployment-id> | logs <deployment-id>
  spawn promote <release-id> [--yes]
  spawn rollback <release-id> --env <environment> [--yes]

Options:
  --add <names>       Add-ons, comma-separated; repeatable (see spawn addons)
  --name <name>       Package name (defaults to directory name)
  --replace <names>   Explicitly replace incompatible add-ons in an existing game
  --dry-run           Show the plan and unresolved decisions without writing files
  --directory <path>  Existing project for add (defaults to current directory)
  --yes              Accept a resolved plan; never overwrite edits
  --site <url>        SpawnKit website for login (or SPAWN_SITE_URL)
  --no-browser        Print the login link without opening a browser
  --json             Machine-readable output
  --help             Show help
  --version          Show CLI version

Examples:
  spawn init my-game --add pixi
  spawn init my-world --add babylon,bitecs,vitest

Legacy --template, --with, --physics, --ui and --telemetry remain supported.
Run pnpm install in the generated project, then pnpm dev.
Run spawn init with no directory for guided setup in a terminal.
`

export async function runCli(
  args: string[],
  cwd: string,
  write: (text: string) => void,
  setup: {
    sentryDsn?: string
    platform?: PlatformOptions
    linkPrompts?: LinkPrompts
    composition?: CompositionPrompts
  } = {}
): Promise<void> {
  if (
    args[0] === "add" ||
    args[0] === "addons" ||
    (args[0] === "init" && args.some((arg) => arg === "--add" || arg.startsWith("--add=")))
  ) {
    await runComposition(args, cwd, write, setup)
    return
  }
  if (args[0] && platformCommands.includes(args[0])) {
    await runPlatform(args, cwd, write, setup.platform)
    return
  }
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      template: { type: "string" },
      name: { type: "string" },
      with: { type: "string" },
      physics: { type: "string" },
      ui: { type: "string" },
      telemetry: { type: "string" },
      version: { type: "boolean", short: "v" },
      "dry-run": { type: "boolean" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      directory: { type: "string" },
      yes: { type: "boolean", short: "y" },
      site: { type: "string" },
      "no-browser": { type: "boolean" },
      project: { type: "string" }
    }
  })
  const [command, directory, ...extra] = positionals
  if (command === "link" || command === "unlink") {
    if (values.help) {
      const content = `SPAWNKIT / ${command === "link" ? "Link your game" : "Unlink your game"}\n\nspawn ${command}${command === "link" ? " [--project <id>]" : ""} [--directory <game-folder>] [--json]\n\n${command === "link" ? "Verifies account access, then saves the project for this game folder. Omit --project for New project, Existing project, or Skip in an interactive terminal." : "Removes the local association only. Hosted projects and releases are preserved."}\n`
      write(values.json ? JSON.stringify({ status: "help", content }) + "\n" : content)
      return
    }
    if (
      directory ||
      extra.length ||
      Object.keys(values).some((key) => !["project", "directory", "json"].includes(key)) ||
      (command === "unlink" && values.project)
    )
      throw new Error(
        `Use spawn ${command}${command === "link" ? " [--project <id>]" : ""} [--directory <game-folder>].`
      )
    if (command === "link" && !values.project) {
      if (!setup.linkPrompts || values.json)
        throw new Error("Choose a project: spawn link --project <id>, or run spawn link in an interactive terminal.")
      await guidedLink(resolve(cwd, values.directory ?? "."), setup.linkPrompts, write, setup.platform?.api)
      return
    }
    const root = await findGameRoot(resolve(cwd, values.directory ?? "."))
    if (command === "link") {
      const id = identifier(values.project!)
      const existing = await projectSelection("show", undefined, root)
      if (existing.projectId && existing.projectId !== id)
        throw new Error(`Already linked to ${existing.projectId}. Run spawn unlink before switching.`)
      const api = setup.platform?.api ?? createPlatformApi(await readCredentials())
      const project = await api.project(id)
      if (project.id !== id) throw new Error("Platform returned a different project. Nothing was linked.")
      const result = await projectSelection("set", id, root)
      write(
        values.json
          ? JSON.stringify({ ...result, verified: true }) + "\n"
          : `Linked to ${id}\nFolder: ${root}\nAccount access verified.\nNext: spawn deploy --dry-run\n`
      )
    } else {
      const result = await projectSelection("clear", undefined, root)
      write(
        values.json
          ? JSON.stringify(result) + "\n"
          : `Game folder unlinked.\nFolder: ${root}\nHosted projects and releases were not changed.\n`
      )
    }
    return
  }
  if (values.project) throw new Error("--project is supported by link and platform commands only.")
  if (command === "project") {
    if (values.help || !directory) {
      const content =
        "SPAWNKIT  /  Your project\n\n  spawn project set <id>\n  spawn project show\n  spawn project clear\n\nUse --directory <game-folder> from elsewhere. Selection is local; account access is not verified yet.\n"
      write(values.json ? JSON.stringify({ status: "help", content }) + "\n" : content)
      return
    }
    if (extra.length > 1 || Object.keys(values).some((key) => !["directory", "json"].includes(key)))
      throw new Error("project accepts set <id>, show, or clear with --directory and --json only.")
    const result = await projectSelection(directory, extra[0], resolve(cwd, values.directory ?? "."))
    write(
      values.json
        ? JSON.stringify(result) + "\n"
        : `Your project\n\n${result.projectId ? `Selected: ${result.projectId}` : "No project selected."}\nFolder: ${result.directory}\n\n${result.projectId ? "Saved locally. Account access has not been verified.\nChange selection: spawn project clear, then spawn project set <id>" : "Select a project: spawn project set <id>"}\n`
    )
    return
  }
  if (values.version) {
    write(values.json ? JSON.stringify({ version: "0.0.0" }) + "\n" : "SpawnKit 0.0.0\n")
    return
  }
  if (values.help || !command) {
    const content =
      command === "login"
        ? "SPAWNKIT  /  Connect your CLI\n\nUsage:\n  spawn login [--site <website-url>] [--directory <game-folder>] [--no-browser] [--json]\n\nOpens your browser to sign in and review access. The link is also printed as a fallback.\nUse --no-browser to open the link yourself. JSON mode never opens a browser.\nAfter sign-in inside a game, choose New project, Existing project, or Skip.\nUse --directory to link a game from elsewhere.\nSPAWN_SITE_URL can supply the website. No browser password is entered in the CLI.\n"
        : command === "logout"
          ? "SPAWNKIT  /  Sign out\n\nUsage:\n  spawn logout [--json]\n\nRemoves credentials on this computer. Browser sessions and server-side grants are unchanged.\n"
          : command === "add"
            ? "SPAWNKIT  /  Grow your project\n\nUsage:\n  spawn add <module...> [--directory <path>] [--yes] [--dry-run] [--json]\n\nModules: vitest, playwright, storybook, bitecs, koota\n\nPreview by default. Use --yes to apply; --dry-run always prevents writes.\nEdited files are preserved and conflicts are reported.\n\nExample:\n  spawn add vitest playwright\n  spawn add vitest playwright --yes\n"
            : command === "templates"
              ? "SPAWNKIT  /  Template catalog\n\nUsage:\n  spawn templates [--json]\n\nLists supported renderers, add-ons, and option compatibility.\n\nNext:\n  spawn init\n"
              : help
    write(values.json ? JSON.stringify({ status: "help", content }) + "\n" : content)
    return
  }
  if (command === "login" || command === "logout") {
    if (
      directory ||
      extra.length ||
      Object.keys(values).some((key) => !["site", "json", "no-browser", "directory"].includes(key))
    )
      throw new Error(
        `${command} accepts ${command === "login" ? "--site, --directory, --no-browser and --json" : "--json"} only`
      )
    if (command === "logout") {
      if (values.site || values["no-browser"] || values.directory) throw new Error("logout accepts only --json")
      const status = await logout()
      write(
        values.json
          ? JSON.stringify({ status, scope: "local" }) + "\n"
          : `${status === "signed-out" ? "Signed out of this CLI." : "Already signed out."}\nLocal credentials removed. Your browser session and server-side grants are unchanged.\n`
      )
    } else {
      const requestedRoot = values.directory ? await findGameRoot(resolve(cwd, values.directory)) : undefined
      const site = values.site ?? process.env.SPAWN_SITE_URL ?? "https://spawnkit.cloud"
      const result = await login(site, (url) => {
        write(
          values.json
            ? JSON.stringify({ status: "awaiting-authorization", url }) + "\n"
            : `Connect to SpawnKit\n\n${values["no-browser"] ? "Open this link in your browser:" : "Opening your browser…\nIf it doesn’t open, use this link:"}\n${url}\n\nWaiting for authorization · expires in 5 minutes\nPress Ctrl+C to cancel.\n`
        )
        if (!values["no-browser"] && !values.json)
          void openBrowser(url).catch(() => write("Could not open your browser. Open the link above to continue.\n"))
      })
      write(
        values.json ? JSON.stringify(result) + "\n" : "\nSigned in to SpawnKit.\nCredentials saved for this computer.\n"
      )
      if (setup.linkPrompts && !values.json) {
        let root: string
        try {
          root = requestedRoot ?? (await findGameRoot(cwd))
        } catch {
          write("To link a game, enter its folder and run spawn link.\n")
          return
        }
        try {
          await guidedLink(root, setup.linkPrompts, write, setup.platform?.api)
        } catch (error) {
          write(
            `You are signed in, but project linking did not finish. ${error instanceof Error ? error.message : "Run spawn link to retry."}\n`
          )
        }
      }
    }
    return
  }
  if (values.site) throw new Error("--site is only supported by login")
  if (values["no-browser"]) throw new Error("--no-browser is only supported by login")
  if (command === "templates") {
    if (
      directory ||
      values.template ||
      values.name ||
      values.with ||
      values.physics ||
      values.ui ||
      values.telemetry ||
      values["dry-run"] ||
      values.directory ||
      values.yes
    )
      throw new Error("templates accepts only --json")
    write(
      values.json
        ? JSON.stringify({ templates, addons, physicsOptions, uiOptions, telemetryOptions }, null, 2) + "\n"
        : templates
            .map((entry) => `${entry.id.padEnd(10)} ${entry.dimension.toUpperCase()} single-player / ${entry.name}`)
            .join("\n") +
            "\nAdd-ons: " +
            addons.map((entry) => entry.id).join(", ") +
            "\n"
    )
    return
  }
  if (command !== "init") throw new Error(`Unknown command: ${command}. Run spawn --help.`)
  if (values.directory || values.yes) throw new Error("--directory and --yes are only supported by add")
  if (!directory || extra.length)
    throw new Error("Provide exactly one destination: spawn init <directory> [--template <id>]")
  const template = values.template ?? "pixi"
  if (!isTemplateId(template)) throw new Error("Choose a supported template: pixi, phaser, babylon, or three")
  const selectedAddons: AddonId[] = []
  for (const id of values.with?.split(",") ?? []) {
    if (!isAddonId(id))
      throw new Error(`Unknown add-on: ${id}. Available: ${addons.map((entry) => entry.id).join(", ")}`)
    selectedAddons.push(id)
  }
  const destination = resolve(cwd, directory)
  const physics = values.physics ?? "none"
  const ui = values.ui ?? "html"
  const telemetry = values.telemetry ?? "none"
  if (!physicsOptions.some((entry) => entry.id === physics)) throw new Error(`Unknown physics: ${physics}`)
  if (!uiOptions.some((entry) => entry.id === ui)) throw new Error(`Unknown UI: ${ui}`)
  if (!telemetryOptions.some((entry) => entry.id === telemetry)) throw new Error(`Unknown telemetry: ${telemetry}`)
  const plan = createProjectPlan({
    name: values.name ?? basename(destination),
    template,
    addons: selectedAddons,
    physics: physics as PhysicsId,
    ui: ui as UiId,
    telemetry: telemetry as TelemetryId
  })
  if (setup.sentryDsn?.trim()) {
    if (telemetry !== "sentry") throw new Error("A Sentry DSN requires Sentry telemetry.")
    const error = validateSentryDsn(setup.sentryDsn)
    if (error) throw new Error(error)
    // Local configuration is deliberately excluded from the shared generator baseline.
    plan.files[".env"] = `VITE_SENTRY_DSN=${JSON.stringify(setup.sentryDsn.trim())}\n`
  }
  await validateDestination(destination)
  if (!values["dry-run"]) {
    try {
      await scaffoldProject(plan, destination)
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST")
        throw new Error(`Destination already exists: ${destination}. Choose a new directory.`)
      throw error
    }
  }
  const result = {
    status: values["dry-run"] ? "planned" : "created",
    destination,
    name: plan.name,
    template: plan.template,
    modules: plan.modules,
    files: Object.keys(plan.files),
    setup: describeProjectPlan(plan),
    nextSteps: [`cd "${destination}"`, "pnpm install", "pnpm dev"]
  }
  write(
    values.json
      ? JSON.stringify(result, null, 2) + "\n"
      : `${values["dry-run"] ? "Plan for" : "Created"} ${plan.name}\n${destination}\nModules: ${plan.modules.join(", ")}\nFiles: ${result.files.length}\n${values["dry-run"] ? JSON.stringify({ files: result.files, setup: result.setup }, null, 2) + "\n" : ""}\n${result.nextSteps.join("\n")}\n`
  )
}
