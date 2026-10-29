import { createHash } from "node:crypto"
import { trustedUrl } from "./auth"

export type Environment = "sandbox" | "production"
export type Project = {
  id: string
  name: string
  hostname?: string
  environments: Record<Environment, { enabled: boolean; currentReleaseId: string | null }>
}
export type Deployment = {
  id: string
  status: string
  environment: Environment
  releaseId?: string
  url?: string
  deploymentUrl?: string
  dashboardUrl?: string
  mediaWarnings?: { kind: "cover" | "trailer"; message: string }[]
}
type Release = {
  id: string
  buildId: string
  status: string
  environment: Environment
  createdAt: string
  url?: string
}
export interface PlatformApi {
  projects(): Promise<{ projects: { id: string; name: string }[] }>
  createProject(body: {
    id: string
    name: string
    configuration: { sandbox: boolean }
  }): Promise<{ id: string; name: string }>
  project(id: string): Promise<Project>
  createUpload(
    project: string,
    body: { format: "spawn-source-v1"; sha256: string; sizeBytes: number },
    requestId: string
  ): Promise<{ id: string }>
  upload(
    project: string,
    id: string,
    bytes: Uint8Array,
    sha256: string
  ): Promise<{ id: string; sha256: string; sizeBytes: number }>
  deploy(
    project: string,
    body: { uploadId: string; environment: Environment; expectedReleaseId: string | null },
    requestId: string
  ): Promise<Deployment>
  releases(project: string, cursor?: string): Promise<{ releases: Release[]; nextCursor?: string }>
  status(project: string, deployment: string, signal?: AbortSignal): Promise<Deployment>
  logs(
    project: string,
    deployment: string,
    cursor?: string,
    signal?: AbortSignal
  ): Promise<{ entries: { sequence: number; message: string }[]; nextCursor?: string }>
  promote(
    project: string,
    body: { releaseId: string; environment: "production"; expectedReleaseId: string | null },
    requestId: string
  ): Promise<Deployment>
  rollback(
    project: string,
    body: { releaseId: string; environment: Environment; expectedReleaseId: string | null },
    requestId: string
  ): Promise<Deployment>
}
export function identifier(value: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value))
    throw new Error("Invalid project, release, deployment, upload or request ID.")
  return value
}
export function createPlatformApi(
  credentials: { site: string; accessToken: string },
  transport: typeof fetch = fetch
): PlatformApi {
  const origin = trustedUrl(credentials.site, true).origin
  async function request<T>(
    path: string,
    method = "GET",
    body?: unknown,
    key?: string,
    binary?: Uint8Array,
    sha256?: string,
    signal?: AbortSignal
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: "application/json"
    }
    if (key) headers["Idempotency-Key"] = key
    if (body !== undefined) headers["Content-Type"] = "application/json"
    if (binary) {
      headers["Content-Type"] = "application/gzip"
      headers["X-Content-SHA256"] = sha256!
    }
    let response: Response
    try {
      response = await transport(`${origin}/api/platform/v1${path}`, {
        method,
        headers,
        redirect: "error",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
          : AbortSignal.timeout(binary ? 120_000 : 30_000),
        ...(binary ? { body: new Uint8Array(binary) } : body !== undefined ? { body: JSON.stringify(body) } : {})
      })
    } catch {
      throw new Error("Could not reach SpawnKit. Check your connection; reuse --request-id when retrying a mutation.")
    }
    if (!response.ok) {
      const reason =
        response.status === 401
          ? "Login expired. Run spawn logout, then spawn login."
          : response.status === 403
            ? "Your account cannot perform this operation."
            : response.status === 409
              ? "The environment changed or the request conflicts. Refresh status before retrying."
              : response.status === 404
                ? "Project or operation not found; the platform API may not be available yet."
                : "The platform rejected the request. Check project status before retrying."
      throw new Error(`SpawnKit API (${response.status}): ${reason}`)
    }
    const text = await response.text()
    if (text.length > 2 * 1024 * 1024) throw new Error("Platform response exceeds the supported size.")
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error("Invalid platform JSON response.")
    }
  }
  const base = (project: string) => `/projects/${identifier(project)}`
  const query = (cursor?: string) => (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "")
  return {
    projects: () => request("/projects"),
    createProject: (body) => request("/projects", "POST", body, body.id),
    project: (project) => request(base(project)),
    createUpload: (project, body, key) => {
      identifier(key)
      const uploadKey = key.length <= 121 ? `${key}-upload` : `upload-${createHash("sha256").update(key).digest("hex")}`
      return request(`${base(project)}/uploads`, "POST", body, uploadKey)
    },
    upload: (project, id, bytes, digest) =>
      request(`${base(project)}/uploads/${identifier(id)}`, "PUT", undefined, undefined, bytes, digest),
    deploy: (project, body, key) => request(`${base(project)}/deployments`, "POST", body, key),
    releases: (project, cursor) => request(`${base(project)}/releases${query(cursor)}`),
    status: (project, id, signal) =>
      request(
        `${base(project)}/deployments/${identifier(id)}`,
        "GET",
        undefined,
        undefined,
        undefined,
        undefined,
        signal
      ),
    logs: (project, id, cursor, signal) =>
      request(
        `${base(project)}/deployments/${identifier(id)}/logs${query(cursor)}`,
        "GET",
        undefined,
        undefined,
        undefined,
        undefined,
        signal
      ),
    promote: (project, body, key) => request(`${base(project)}/promotions`, "POST", body, key),
    rollback: (project, body, key) => request(`${base(project)}/rollbacks`, "POST", body, key)
  }
}
