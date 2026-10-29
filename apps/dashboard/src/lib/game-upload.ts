import { parseListingConfig, type GameListingConfig } from "@spawn/templates/listing"
import { gzipSync, strToU8, unzipSync } from "fflate"
import { defaultProjectDraft } from "../components/project/creation-model"
import { readUploadListing } from "./upload-listing"

export interface UploadInput {
  archive: File
  config: GameListingConfig
  cover: { name: string; url: string; blob?: Blob }
  video: { name: string; url: string; blob?: Blob } | null
}
export interface UploadResult {
  url: string
  dashboardUrl: string
}
const limit = 20 * 1024 * 1024
function base64(bytes: Uint8Array) {
  let text = ""
  for (let offset = 0; offset < bytes.length; offset += 8192)
    text += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  return btoa(text)
}
/** Adapt a browser build to the existing, server-validated source deployment protocol. */
export async function prepareGameUpload(input: UploadInput) {
  const bytes = new Uint8Array(await input.archive.arrayBuffer())
  readUploadListing(bytes)
  let expanded = 0
  const files = unzipSync(bytes, {
    filter(entry) {
      expanded += entry.originalSize
      if (expanded > limit || entry.originalSize > limit) throw new Error("The expanded game must be under 20 MB.")
      return !entry.name.endsWith("/")
    }
  })
  const config = parseListingConfig(input.config)
  for (const [asset, path, max] of [
    [input.cover, config.coverPath, 1024 * 1024],
    [input.video, config.trailerPath, 2 * 1024 * 1024]
  ] as const) {
    if (!asset || !path) continue
    let blob = asset.blob
    if (!blob) {
      const response = await fetch(asset.url)
      if (response.status === 401) throw new UploadSignInRequired("Sign in to continue.")
      if (!response.ok) throw new Error("Couldn't read the selected media. Select it again.")
      blob = await response.blob()
    }
    const data = new Uint8Array(await blob.arrayBuffer())
    if (data.length > max) throw new Error("The selected media exceeds its size limit.")
    files[path] = data
  }
  files["spawnkit.config.json"] = strToU8(JSON.stringify(config))
  const entries = Object.entries(files).map(([path, data]) => ({ path: `game/${path}`, content: base64(data) }))
  const scaffolding = {
    "package.json": JSON.stringify({
      name: "uploaded-game",
      version: "1.0.0",
      private: true,
      scripts: { build: "node publish.mjs" }
    }),
    "pnpm-lock.yaml":
      "lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n",
    "game.config.json": JSON.stringify({ schemaVersion: 1, mode: "single", template: "pixi" }),
    "publish.mjs":
      'import { cp } from "node:fs/promises"; await cp("game", "dist", { recursive: true, errorOnExist: true });'
  }
  for (const [path, value] of Object.entries(scaffolding)) entries.push({ path, content: base64(strToU8(value)) })
  if (entries.length > 2000 || Object.values(files).reduce((total, value) => total + value.length, 0) > limit - 4096)
    throw new Error("The game must be under 20 MB with fewer than 1,996 files.")
  const source = gzipSync(strToU8(JSON.stringify({ version: 1, files: entries })))
  if (source.length > limit) throw new Error("The upload exceeds the 20 MB deployment limit.")
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(source))))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
  return { source, digest }
}
export type UploadStage = "preparing" | "uploading" | "queued" | "processing" | "publishing"

export class UploadSignInRequired extends Error {}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/platform/v1${path}`, {
      ...init,
      signal: AbortSignal.timeout(init?.method === "PUT" ? 120_000 : 30_000)
    })
  } catch {
    throw new Error("Connection interrupted. Check your connection and try again.")
  }
  if (response.status === 401) throw new UploadSignInRequired("Sign in to continue.")
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error("The upload service isn't responding. Please try again.")
  }
  if (!response.ok) {
    if (response.status === 403) throw new Error("You don't have permission to publish this game.")
    if (response.status === 413) throw new Error("This game exceeds the upload size limit.")
    if (response.status >= 500) throw new Error("Publishing is temporarily unavailable. Please try again.")
    throw new Error(result.error?.message ?? "Couldn't complete the upload. Please try again.")
  }
  return result as T
}
export function checkGameName(name: string) {
  return api<{ available: boolean; slug: string }>(`/projects/name-availability?name=${encodeURIComponent(name)}`)
}

/** Retain operation identifiers across retries so a lost response cannot create duplicate projects. */
export function gamePublisher(onProjectCreated: () => void = () => {}) {
  const projectId = crypto.randomUUID()
  let deploymentId: string | undefined
  let requestKey = crypto.randomUUID()
  let preparedDigest = ""
  let projectCreated = false
  const publish = async (input: UploadInput, report: (stage: UploadStage) => void): Promise<UploadResult> => {
    const json = (body: unknown, key: string = requestKey): RequestInit => ({
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(body)
    })
    if (!deploymentId) {
      report("preparing")
      const { source, digest } = await prepareGameUpload(input)
      if (preparedDigest && preparedDigest !== digest) requestKey = crypto.randomUUID()
      preparedDigest = digest
      report("preparing")
      await api(
        "/projects",
        json({
          id: projectId,
          requireUniqueName: true,
          name: input.config.title.slice(0, 64),
          configuration: { ...defaultProjectDraft, name: input.config.title.slice(0, 64), addons: [] }
        })
      )
      projectCreated = true
      onProjectCreated()
      const state = await api<{ capabilities: { builds: boolean } }>(`/projects/${projectId}/state`)
      if (!state.capabilities.builds)
        throw new Error("Deployments are unavailable. Your project is saved; try again later.")
      report("uploading")
      const upload = await api<{ id: string }>(
        `/projects/${projectId}/uploads`,
        json({ format: "spawn-source-v1", sha256: digest, sizeBytes: source.length }, digest)
      )
      await api(`/projects/${projectId}/uploads/${upload.id}`, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream", "x-content-sha256": digest },
        body: new Uint8Array(source)
      })
      const deployment = await api<{ id: string }>(
        `/projects/${projectId}/deployments`,
        json({ environment: "production", expectedReleaseId: null, uploadId: upload.id })
      )
      deploymentId = deployment.id
    }
    for (let attempt = 0; attempt < 600; attempt++) {
      const deployment = await api<{ status: string; url?: string; dashboardUrl: string }>(
        `/projects/${projectId}/deployments/${deploymentId}`
      )
      if (deployment.status === "succeeded" && deployment.url)
        return { url: deployment.url, dashboardUrl: `/dashboard/projects/${projectId}` }
      if (["failed", "superseded"].includes(deployment.status)) {
        deploymentId = undefined
        requestKey = crypto.randomUUID()
        throw new Error("Your game couldn't be published. Try again, or open the project to review the build logs.")
      }
      report(
        deployment.status === "queued"
          ? "queued"
          : deployment.status === "activating" || deployment.status === "succeeded"
            ? "publishing"
            : "processing"
      )
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    throw new Error("Your game is taking longer than expected. Try again to check its progress, or open the project.")
  }
  return Object.assign(publish, { projectUrl: () => (projectCreated ? `/dashboard/projects/${projectId}` : null) })
}
