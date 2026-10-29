import { randomUUID } from "node:crypto"
import { resolve } from "node:path"
import { parseArgs, stripVTControlCharacters } from "node:util"
import { readCredentials } from "./auth"
import { terminalDeployment, watchDeployment } from "./deployment-watch"
import { createPlatformApi, identifier } from "./platform-api"
import type { Deployment, Environment, PlatformApi } from "./platform-api"
import { projectSelection } from "./project"
import { createSourceArchive, findGameRoot } from "./source"

export const platformCommands = ["deploy", "releases", "status", "logs", "promote", "rollback"]
export type PlatformOptions = {
  api?: PlatformApi
  confirm?: (summary: string) => Promise<boolean>
  progress?: (message: string) => void
  log?: (text: string) => void
  signal?: AbortSignal
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>
}
export async function runPlatform(
  args: string[],
  cwd: string,
  write: (text: string) => void,
  options: PlatformOptions = {}
) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      project: { type: "string" },
      directory: { type: "string" },
      env: { type: "string" },
      json: { type: "boolean" },
      yes: { type: "boolean", short: "y" },
      "dry-run": { type: "boolean" },
      "request-id": { type: "string" },
      cursor: { type: "string" },
      "no-wait": { type: "boolean" },
      follow: { type: "boolean", short: "f" },
      help: { type: "boolean", short: "h" }
    }
  })
  const [command, target, ...extra] = positionals
  const emit = (result: object, text: string) =>
    write(values.json ? JSON.stringify(result) + "\n" : stripVTControlCharacters(text) + "\n")
  if (values.help) {
    const usage: Record<string, string> = {
      deploy:
        "spawn deploy [--env sandbox|production] [--dry-run] [--yes] [--no-wait]\nUploads source, follows live build logs, and waits for the game and dashboard URLs. Use --no-wait to return after queuing. Defaults to enabled Sandbox, otherwise production.",
      releases: "spawn releases [--cursor <cursor>]\nLists retained releases, with a cursor for the next page.",
      status:
        "spawn status <deployment-id>\nShows deployment progress. Failed/cancelled/superseded operations return exit code 1.",
      logs: "spawn logs <deployment-id> [--cursor <cursor>] [--follow]\nShows build logs. --follow continues until deployment finishes; Ctrl+C stops watching without cancelling the deployment.",
      promote:
        "spawn promote <release-id> [--dry-run] [--yes]\nPromotes a successful Sandbox release to production without rebuilding.",
      rollback:
        "spawn rollback <release-id> --env sandbox|production [--dry-run] [--yes]\nActivates retained compatible artifacts. Does not undo database migrations."
    }
    const content = `SPAWNKIT / ${command}\n\n${usage[command!]}\n\nOptions: --project <id>, --directory <game-folder>, --json\n${["deploy", "promote", "rollback"].includes(command!) ? "Use --request-id <id> for safe retries. Noninteractive mutations require --yes.\n" : ""}Project is inferred from the nearest game folder. Link first with spawn link --project <id>.`
    emit({ status: "help", content }, content)
    return
  }
  if (
    !command ||
    !platformCommands.includes(command) ||
    extra.length ||
    (["deploy", "releases"].includes(command) ? target !== undefined : !target)
  )
    throw new Error("Invalid platform command arguments. Run spawn <command> --help.")
  const mutation = ["deploy", "promote", "rollback"].includes(command)
  if (!mutation && (values.env || values.yes || values["dry-run"] || values["request-id"]))
    throw new Error("Environment and mutation flags are only supported by deploy, promote and rollback.")
  if (values.cursor && !["releases", "logs"].includes(command))
    throw new Error("--cursor is only supported by releases and logs.")
  if (values["no-wait"] && command !== "deploy") throw new Error("--no-wait is only supported by deploy.")
  if (values.follow && command !== "logs") throw new Error("--follow is only supported by logs.")
  const requested = values.env
  if (requested !== undefined && requested !== "production" && requested !== "sandbox")
    throw new Error("Choose --env sandbox or production.")
  if (command === "rollback" && !requested)
    throw new Error("Rollback requires an explicit --env sandbox or production.")
  if (command === "promote" && requested && requested !== "production")
    throw new Error("Promotion targets production only.")
  if (target) identifier(target)
  if (values["request-id"]) identifier(values["request-id"])
  const start = resolve(cwd, values.directory ?? ".")
  const root = command === "deploy" || !values.project ? await findGameRoot(start) : start
  const selected = values.project ?? (await projectSelection("show", undefined, root)).projectId
  if (!selected)
    throw new Error("No project linked. Run spawn link --project <id>, or pass --project <id> for this command.")
  const projectId = identifier(selected)
  const api = options.api ?? createPlatformApi(await readCredentials())
  const live =
    options.log ??
    (values.json
      ? (text: string) => {
          process.stderr.write(text)
        }
      : write)
  const follow = async (initial: Deployment) => {
    const result = await watchDeployment(api, projectId, initial, live, {
      cursor: values.cursor,
      signal: options.signal,
      sleep: options.sleep
    })
    checkDeployment(result.deployment)
    if (result.interrupted) {
      process.exitCode = 130
      live(
        `Stopped watching. Deployment continues on SpawnKit.\nResume: spawn logs ${initial.id} --project ${projectId} --follow\n`
      )
    }
    return result.deployment
  }
  if (command === "releases") {
    const result = await api.releases(projectId, values.cursor)
    if (!Array.isArray(result.releases)) throw new Error("Invalid release listing response.")
    emit(
      result,
      `Releases · ${projectId}\n\n${result.releases.length ? result.releases.map((release) => `${release.id}  ${release.environment}  ${release.status}  ${release.createdAt}`).join("\n") : "No releases yet."}${result.nextCursor ? `\n\nNext page: --cursor ${result.nextCursor}` : ""}`
    )
    return
  }
  if (command === "status") {
    const result = await api.status(projectId, target!)
    checkDeployment(result)
    emit(result, formatDeployment(result))
    if (["failed", "cancelled", "superseded"].includes(result.status)) process.exitCode = 1
    return
  }
  if (command === "logs") {
    if (values.follow) {
      const result = await follow(await api.status(projectId, target!))
      emit(result, formatDeployment(result))
      if (["failed", "cancelled", "superseded"].includes(result.status)) process.exitCode = 1
      return
    }
    const result = await api.logs(projectId, target!, values.cursor)
    if (
      !Array.isArray(result.entries) ||
      result.entries.some((entry) => !Number.isSafeInteger(entry.sequence) || typeof entry.message !== "string")
    )
      throw new Error("Invalid log response.")
    const clean = {
      ...result,
      entries: result.entries.map((entry) => ({ ...entry, message: stripVTControlCharacters(entry.message) }))
    }
    emit(
      clean,
      `Logs · ${target}\n\n${clean.entries.length ? clean.entries.map((entry) => `${entry.sequence}  ${entry.message}`).join("\n") : values.cursor ? "No additional logs." : "No logs yet."}${clean.nextCursor ? `\n\nContinue: --cursor ${clean.nextCursor}` : ""}`
    )
    return
  }
  const project = await api.project(projectId)
  if (
    project.id !== projectId ||
    !project.environments ||
    !project.environments.production?.enabled ||
    typeof project.environments.sandbox?.enabled !== "boolean"
  )
    throw new Error("Invalid project environment response.")
  const environment: Environment =
    command === "promote"
      ? "production"
      : (requested ?? (project.environments.sandbox.enabled ? "sandbox" : "production"))
  const destination = project.environments[environment]
  if (!destination.enabled) throw new Error("Sandbox is not enabled for this project.")
  const expectedReleaseId = destination.currentReleaseId
  if (expectedReleaseId !== null && typeof expectedReleaseId !== "string")
    throw new Error("Invalid current release response.")
  if (expectedReleaseId) identifier(expectedReleaseId)
  const requestId = values["request-id"] ?? randomUUID()
  options.progress?.("Preparing the deployment plan")
  const archive = command === "deploy" ? await createSourceArchive(root) : undefined
  const plan = {
    command,
    projectId,
    environment,
    expectedReleaseId,
    requestId,
    ...(target ? { releaseId: target } : {}),
    ...(archive
      ? {
          source: {
            format: "spawn-source-v1",
            sha256: archive.sha256,
            sizeBytes: archive.sizeBytes,
            fileCount: archive.fileCount,
            omitted: archive.omitted,
            mediaNotices: archive.mediaNotices
          }
        }
      : {})
  }
  const summary = `${archive?.mediaNotices.length ? archive.mediaNotices.join("\n") + "\n\n" : ""}${command === "deploy" ? "Deploy source" : command === "promote" ? "Promote Sandbox release" : "Roll back release"}\n\nProject: ${project.name} (${projectId})\nTarget: ${environment === "sandbox" ? "Sandbox" : "Production"}\nCurrent release: ${expectedReleaseId ?? "none"}\n${archive ? `Source: ${archive.fileCount} files · ${archive.sizeBytes} bytes\nBuild: on SpawnKit` : `Release: ${target}\nBuild: reuse existing artifacts; no rebuild`}\nRequest: ${requestId}`
  if (values["dry-run"]) {
    emit({ status: "planned", ...plan }, `${summary}\n\nPreview only. Nothing was uploaded or changed.`)
    return
  }
  if (!values.yes) {
    if (values.json || !options.confirm)
      throw new Error("Review with --dry-run, then pass --yes to submit this operation.")
    if (!(await options.confirm(stripVTControlCharacters(summary)))) {
      emit({ status: "cancelled", ...plan }, "Cancelled. Nothing was uploaded or changed.")
      return
    }
  }
  if (!values.json) write(`${stripVTControlCharacters(summary)}\n\n`)
  let result: Deployment
  try {
    if (archive) {
      options.progress?.("Uploading source")
      const upload = await api.createUpload(
        projectId,
        { format: "spawn-source-v1", sha256: archive.sha256, sizeBytes: archive.sizeBytes },
        requestId
      )
      identifier(upload.id)
      const receipt = await api.upload(projectId, upload.id, archive.bytes, archive.sha256)
      if (receipt.id !== upload.id || receipt.sha256 !== archive.sha256 || receipt.sizeBytes !== archive.sizeBytes)
        throw new Error("Upload verification failed. No deployment was requested.")
      result = await api.deploy(projectId, { uploadId: upload.id, environment, expectedReleaseId }, requestId)
    } else if (command === "promote")
      result = await api.promote(
        projectId,
        { releaseId: target!, environment: "production", expectedReleaseId },
        requestId
      )
    else result = await api.rollback(projectId, { releaseId: target!, environment, expectedReleaseId }, requestId)
    checkDeployment(result)
    if (result.environment !== environment)
      throw new Error("Platform returned a different target environment. Check status before retrying.")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Platform operation failed."
    throw new Error(`${message}\nRetry identity: --request-id ${requestId}`)
  }
  if (command === "deploy" && !values["no-wait"]) result = await follow(result)
  emit(
    { ...result, requestId, projectId },
    `${formatDeployment(result)}\nRequest: ${requestId}${terminalDeployment(result.status) ? "" : `\n\nCheck progress: spawn status ${result.id} --project ${projectId}\nView logs: spawn logs ${result.id} --project ${projectId} --follow`}`
  )
  if (["failed", "cancelled", "superseded"].includes(result.status)) process.exitCode = 1
}
function checkDeployment(result: Deployment) {
  if (
    !result ||
    typeof result.id !== "string" ||
    typeof result.status !== "string" ||
    !["sandbox", "production"].includes(result.environment)
  )
    throw new Error("Invalid deployment response. Check project status before retrying.")
  identifier(result.id)
}
function formatDeployment(result: Deployment) {
  return `Deployment: ${result.id}\nEnvironment: ${result.environment === "sandbox" ? "Sandbox" : "Production"}\nStatus: ${result.status}${result.releaseId ? `\nRelease: ${result.releaseId}` : ""}${result.url ? `\nGame: ${result.url}` : ""}${result.dashboardUrl ? `\nDashboard: ${result.dashboardUrl}` : ""}${result.deploymentUrl ? `\nDeployment URL: ${result.deploymentUrl}` : ""}${result.mediaWarnings?.length ? `\n\nMedia warnings\n${result.mediaWarnings.map((warning) => `${warning.kind === "cover" ? "Cover image" : "Trailer"} omitted: ${warning.message}`).join("\n")}` : ""}`
}
