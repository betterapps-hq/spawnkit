import { resolve } from "node:path"
import { parseArgs } from "node:util"
import type { CliIo } from "@buildkitgg/scaffolder/cli"
import { version } from "../package.json"
import { authenticationStatus, login, logout, readCredentials } from "./auth"
import { remoteLogin } from "./auth-remote"
import { openBrowser } from "./browser"
import { guidedLink } from "./link"
import type { LinkPrompts } from "./link"
import { platformCommands, runPlatform } from "./platform"
import type { PlatformOptions } from "./platform"
import { createPlatformApi, identifier } from "./platform-api"
import { projectSelection } from "./project"
import { isProjectCommand, projectCommandHelp, projectHelp, runProjectCommand } from "./project-commands"
import { findGameRoot } from "./source"

const help = `SPAWNKIT  /  Build your next world

${projectHelp()}

Publish a game:
  spawn login --site <website-url>
  spawn login --remote --email <account-email> --project <id>
  spawn logout [--json]
  spawn auth status [--json]
  spawn link [--project <id>] [--directory <path>] [--json]
  spawn unlink [--directory <path>] [--json]
  spawn deploy [--env sandbox|production] [--dry-run] [--yes]
  spawn releases | status <deployment-id> | logs <deployment-id>
  spawn promote <release-id> [--yes]
  spawn rollback <release-id> --env <environment> [--yes]

Options:
  --dry-run           Show the plan without writing files
  --yes               Apply a plan without asking; it never makes a decision for you
  --directory <path>  Game folder for login, link and unlink (defaults to current directory)
  --site <url>        SpawnKit website for login (or SPAWN_SITE_URL)
  --no-browser        Print the login link without opening a browser
  --json             Machine-readable output
  --help             Show help
  --version          Show CLI version

Examples:
  spawn create pixi my-game --physics rapier2d --ui pixi-ui --with vitest
  spawn create --preset three-rapier my-world
  spawn add sentry

Run pnpm install in the new game, then pnpm dev.
`

export async function runCli(
  args: string[],
  cwd: string,
  write: (text: string) => void,
  setup: {
    platform?: PlatformOptions
    linkPrompts?: LinkPrompts
    /** Prompts and terminal detection for project commands. Without them, project commands never prompt. */
    project?: Partial<CliIo>
  } = {}
): Promise<void> {
  if (isProjectCommand(args, cwd)) {
    if (args.includes("--help") || args.includes("-h")) {
      const content = projectCommandHelp(args[0]!)
      write(args.includes("--json") ? JSON.stringify({ status: "help", content }) + "\n" : content)
      return
    }
    const code = await runProjectCommand(args, { cwd, stdout: write, stderr: write, isTTY: false, ...setup.project })
    if (code !== 0) process.exitCode = code
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
      version: { type: "boolean", short: "v" },
      "dry-run": { type: "boolean" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      directory: { type: "string" },
      yes: { type: "boolean", short: "y" },
      site: { type: "string" },
      "no-browser": { type: "boolean" },
      remote: { type: "boolean" },
      email: { type: "string" },
      project: { type: "string" }
    }
  })
  const [command, directory, ...extra] = positionals
  if (command === "auth") {
    if (values.help) {
      write(
        values.json
          ? JSON.stringify({
              status: "help",
              content: "spawn auth status [--json]: checks local credentials only; does not verify server access."
            }) + "\n"
          : "spawn auth status [--json]: checks local credentials only; does not verify server access.\n"
      )
      return
    }
    if (directory !== "status" || extra.length || Object.keys(values).some((key) => key !== "json"))
      throw new Error("Use spawn auth status [--json].")
    const status = await authenticationStatus()
    write(
      values.json
        ? JSON.stringify(status) + "\n"
        : `${status.status === "signed-in" ? `Local credentials available for ${status.site}.` : "Sign in with spawn login; credentials are missing, expired or unreadable."}\nServer access has not been checked.\n`
    )
    return
  }
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
      const result = await projectSelection("set", id, root, project.hostname)
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
  if (values.project && !(command === "login" && values.remote))
    throw new Error("--project is supported by link, remote login and platform commands only.")
  if ((values.remote || values.email) && command !== "login")
    throw new Error("--remote and --email are supported by login only.")
  if (values.version) {
    write(values.json ? JSON.stringify({ version }) + "\n" : `SpawnKit ${version}\n`)
    return
  }
  if (values.help || !command) {
    const content =
      command === "login"
        ? "SPAWNKIT  /  Connect your CLI\n\nUsage:\n  spawn login [--site <website-url>] [--directory <game-folder>] [--no-browser] [--json]\n\nOpens your browser to sign in and review access. The link is also printed as a fallback.\nUse --no-browser to open the link yourself. JSON mode never opens a browser.\nAfter sign-in inside a game, choose New project, Existing project, or Skip.\nUse --directory to link a game from elsewhere.\nFor a remote agent: spawn login --remote --email <account-email> --project <id>.\nThe owner approves a six-digit code in their browser. Access is limited to that project for one hour.\nSPAWN_SITE_URL can supply the website. No browser password is entered in the CLI.\n"
        : command === "logout"
          ? "SPAWNKIT  /  Sign out\n\nUsage:\n  spawn logout [--json]\n\nRevokes remote-agent access on the server, then removes credentials on this computer. Local OAuth and browser sessions are unchanged. If revocation fails, credentials are kept so you can retry.\n"
          : help
    write(values.json ? JSON.stringify({ status: "help", content }) + "\n" : content)
    return
  }
  if (command === "login" || command === "logout") {
    if (
      directory ||
      extra.length ||
      Object.keys(values).some(
        (key) => !["site", "json", "no-browser", "directory", "remote", "email", "project"].includes(key)
      )
    )
      throw new Error(
        `${command} accepts ${command === "login" ? "--site, --directory, --no-browser and --json" : "--json"} only`
      )
    if (command === "logout") {
      if (values.site || values["no-browser"] || values.directory) throw new Error("logout accepts only --json")
      const status = await logout()
      write(
        values.json
          ? JSON.stringify({ status }) + "\n"
          : `${status === "signed-out" ? "Signed out of this CLI." : "Already signed out."}\nRemote-agent grants are revoked on the server. Browser and local OAuth sessions are unchanged.\n`
      )
    } else {
      const requestedRoot = values.directory ? await findGameRoot(resolve(cwd, values.directory)) : undefined
      const site = values.site ?? process.env.SPAWN_SITE_URL ?? "https://spawnkit.cloud"
      if (values.remote) {
        if (!values.email || !values.project)
          throw new Error("Use spawn login --remote --email <account-email> --project <id>.")
        const result = await remoteLogin(site, values.email, values.project, ({ url, code, expiresIn }) => {
          write(
            values.json
              ? JSON.stringify({ status: "awaiting-authorization", url, code, expiresIn }) + "\n"
              : `Ask the account owner to open:\n${url}\n\nEnter code: ${code}\nReview the project and approve access. Expires in ${expiresIn / 60} minutes.\n`
          )
        })
        write(
          values.json
            ? JSON.stringify(result) + "\n"
            : `Connected to project ${result.projectId} until ${result.expiresAt}.\nNext: spawn link --project ${result.projectId}\n`
        )
        return
      }
      if (values.email) throw new Error("--email requires --remote.")
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
  throw new Error(`Unknown command: ${command}. Run spawn --help.`)
}
