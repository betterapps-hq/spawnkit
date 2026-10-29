import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { Miniflare, convertV4MiniflareOptions } from "miniflare"
import { build } from "rolldown"

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

/** Test-only authentication replacement. The production bundle never imports this module. */
export async function startTelemetryRuntime() {
  const directory = await mkdtemp(resolve(repo, "work/telemetry-acceptance-"))
  try {
    await build({
      input: resolve(repo, "apps/telemetry/src/index.ts"),
      external: (id) => id.startsWith("cloudflare:"),
      output: { file: resolve(directory, "telemetry.mjs"), format: "es" }
    })
    await build({
      input: resolve(repo, "apps/control-api/src/index.ts"),
      platform: "node",
      external: (id) => id.startsWith("cloudflare:") || id.startsWith("node:"),
      plugins: [
        {
          name: "test-identity-only",
          resolveId(id) {
            if (id === "@cloudflare/sandbox") return "\0test-sandbox"
          },
          load(id) {
            const path = id.replaceAll("\\", "/")
            if (id === "\0test-sandbox")
              return `import { DurableObject, WorkerEntrypoint } from "cloudflare:workers"; export class Sandbox extends DurableObject {}; export class ContainerProxy extends WorkerEntrypoint {}`
            if (path.endsWith("/control-api/src/build-job.ts"))
              return `import { DurableObject } from "cloudflare:workers"; export class BuildJob extends DurableObject {}`
            if (path.endsWith("/control-api/src/deployments.ts"))
              return `export function deploymentRoute() { throw Error("Not in telemetry test scope") }`
            if (path.endsWith("/control-api/src/domains.ts"))
              return `export function domainRoute() { throw Error("Not in telemetry test scope") }`
            if (path.endsWith("/control-api/src/github-source.ts"))
              return `export const githubSource = () => { throw Error("Not in telemetry test scope") }; export const convertGitHubArchive = githubSource;`
            if (id.replaceAll("\\", "/").endsWith("/control-api/src/auth.ts"))
              return `import { HttpError } from "./http"; export async function authenticate(request) { const value = request.headers.get("authorization"); if (value === "Bearer telemetry-test-owner") return "user_telemetry_test"; if (value === "Bearer telemetry-test-other") return "user_other"; throw new HttpError(401, "unauthorized", "Sign in to continue.") }`
          }
        }
      ],
      output: { file: resolve(directory, "control.mjs"), format: "es", codeSplitting: false }
    })
    const mf = new Miniflare({
      ...convertV4MiniflareOptions({
        workers: [
          {
            name: "telemetry",
            script: await readFile(resolve(directory, "telemetry.mjs"), "utf8"),
            modules: true,
            compatibilityDate: "2026-10-13",
            durableObjects: { TENANTS: { className: "TelemetryStore", useSQLite: true } },
            bindings: {
              SIGNING_KEY: "test-only-signing-material-never-deployed",
              PUBLIC_ENDPOINT: "http://localhost/v1/logs"
            },
            ratelimits: { EDGE_LIMIT: { namespace_id: "7210", simple: { limit: 120, period: 60 } } }
          },
          {
            name: "control",
            script: await readFile(resolve(directory, "control.mjs"), "utf8"),
            modules: true,
            compatibilityDate: "2026-10-13",
            compatibilityFlags: ["nodejs_compat"],
            d1Databases: { DATABASE: "test-control-db" },
            serviceBindings: { TELEMETRY: { name: "telemetry", entrypoint: "TelemetryAdmin" } },
            durableObjects: {
              SANDBOX: { className: "Sandbox", useSQLite: true },
              BUILD_JOBS: { className: "BuildJob", useSQLite: true }
            },
            r2Buckets: ["ARTIFACTS"],
            bindings: { BUILDS_ENABLED: "false", CLERK_SECRET_KEY: "test-only" }
          }
        ]
      }),
      unsafeInspectDurableObjects: true
    })
    try {
      const endpoint = `${(await mf.ready).origin}/v1/logs`
      const database = await mf.getD1Database("DATABASE", "control")
      for (const migration of (await readdir(resolve(repo, "apps/control-api/migrations")))
        .filter((name) => name.endsWith(".sql"))
        .sort()) {
        const sql = await readFile(resolve(repo, "apps/control-api/migrations", migration), "utf8")
        // Let SQLite parse complete trigger bodies; splitting at semicolons cuts BEGIN/END apart.
        await database.prepare(sql).run()
      }
      const control = await mf.getWorker("control")
      async function request(path: string, method = "GET", body?: unknown, identity = "telemetry-test-owner") {
        return control.fetch(`http://control/api/platform/v1${path}`, {
          method,
          headers: { authorization: `Bearer ${identity}`, "content-type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) })
        })
      }
      return {
        mf,
        endpoint,
        directory,
        request,
        async dispose() {
          await mf.dispose()
          if (directory.startsWith(resolve(repo, "work/telemetry-acceptance-")))
            await rm(directory, { recursive: true, force: true })
        }
      }
    } catch (error) {
      await mf.dispose()
      throw error
    }
  } catch (error) {
    if (directory.startsWith(resolve(repo, "work/telemetry-acceptance-")))
      await rm(directory, { recursive: true, force: true })
    throw error
  }
}
