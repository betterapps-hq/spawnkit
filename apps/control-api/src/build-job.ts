import { createHash } from "node:crypto"
import { getSandbox } from "@cloudflare/sandbox"
import { DurableObject } from "cloudflare:workers"
import { activate, type DeploymentRow } from "./activation"
import { readArtifactManifest } from "./artifact-manifest"
import { parseArtifacts } from "./build-artifacts"
import { claimBuildBudget } from "./build-budget"
import { processListingMedia } from "./build-media"
import { streamBuildOutput } from "./build-output"
import { buildReservation, buildRetryDelay, finishBuildAttempt } from "./build-queue"
import { attributeRelease } from "./creator-metrics"
import { requireValue, HttpError } from "./http"
import { putProjectArtifact, requireActiveProject } from "./project-lifecycle"
import { decodeSource } from "./source"

export class BuildJob extends DurableObject<Env> {
  private running = false

  async start(id: string) {
    const project = await this.env.DATABASE.prepare(
      "SELECT p.id FROM deployments d JOIN projects p ON p.id=d.project_id WHERE d.id=? AND p.lifecycle='active'"
    )
      .bind(id)
      .first()
    if (!project) return
    // RPCs may arrive during an alarm. Do not restart a live build or shorten
    // an existing cleanup/HTTPS retry delay. Durable state survives eviction.
    if (this.running || (await this.ctx.storage.getAlarm()) !== null) return
    await this.ctx.storage.put("deployment", id)
    await this.ctx.storage.setAlarm(Date.now() + 100)
  }

  /** Acknowledge only after all running work and both isolated containers stop. */
  async cancel(id: string) {
    const project = await this.env.DATABASE.prepare(
      "SELECT p.lifecycle FROM deployments d JOIN projects p ON p.id=d.project_id WHERE d.id=?"
    )
      .bind(id)
      .first<{ lifecycle: string }>()
    if (project?.lifecycle === "active") throw new Error("Project is not being deleted.")
    await this.ctx.storage.deleteAlarm()
    await getSandbox(this.env.SANDBOX, `build-${id}`).destroy()
    await getSandbox(this.env.SANDBOX, `media-${id}`).destroy()
    if (this.running) return false
    await this.ctx.storage.deleteAll()
    return true
  }

  async alarm() {
    this.running = true
    try {
      await this.run()
    } catch (error) {
      // D1/R2/cleanup failures must not silently strand a reservation after the
      // platform's finite automatic alarm retries. Cron also recovers delivery.
      console.error(
        JSON.stringify({ event: "build_recovery_pending", errorType: error instanceof Error ? error.name : "Unknown" })
      )
      await this.ctx.storage.setAlarm(Date.now() + 30_000)
    } finally {
      this.running = false
    }
  }

  private async log(id: string, message: string) {
    await this.env.DATABASE.prepare("INSERT INTO logs(deployment_id,message,created_at) VALUES(?,?,?)")
      .bind(id, message.slice(0, 8192), new Date().toISOString())
      .run()
  }

  private async run() {
    const id = await this.ctx.storage.get<string>("deployment")
    if (!id) return
    const deployment = await this.env.DATABASE.prepare("SELECT * FROM deployments WHERE id=?")
      .bind(id)
      .first<DeploymentRow>()
    if (!deployment) return
    const project = await this.env.DATABASE.prepare("SELECT lifecycle FROM projects WHERE id=?")
      .bind(deployment.project_id)
      .first<{ lifecycle: string }>()
    if (project?.lifecycle !== "active") return
    let reservation = await buildReservation(this.env, id)
    const terminal = ["succeeded", "failed", "superseded"].includes(deployment.status)
    if (reservation?.reserved) {
      if (!reservation.outcome) {
        const ready = await this.env.DATABASE.prepare("SELECT status FROM releases WHERE id=?")
          .bind(deployment.release_id)
          .first<{ status: string }>()
        if (terminal || ready?.status === "ready") {
          await this.env.DATABASE.prepare("UPDATE build_queue SET outcome=? WHERE deployment_id=?")
            .bind(terminal ? "failed" : "activate", id)
            .run()
        } else {
          try {
            await this.build(deployment)
          } catch (error) {
            const delay = buildRetryDelay(error, reservation.attempts)
            const message = error instanceof Error ? error.message : "Build failed."
            await this.env.DATABASE.prepare("UPDATE build_queue SET outcome=?,available_at=? WHERE deployment_id=?")
              .bind(delay === null ? "failed" : "retry", delay === null ? 0 : Date.now() + delay, id)
              .run()
            await this.log(
              id,
              delay === null
                ? message
                : `${message}\nTemporary infrastructure failure. Queued for retry in at least ${delay / 1000} seconds (attempt ${reservation.attempts}).`
            )
          }
        }
        reservation = await buildReservation(this.env, id)
      }
      if (!reservation?.outcome) throw new Error("Build outcome was not saved.")
      // Never release a slot on a timer: a container may still be running.
      // Failed destruction leaves the durable outcome intact for cleanup retry.
      await getSandbox(this.env.SANDBOX, `build-${id}`).destroy()
      await getSandbox(this.env.SANDBOX, `media-${id}`).destroy()
      await finishBuildAttempt(this.env, reservation, deployment.release_id)
      if (terminal || reservation.outcome !== "activate") return
    } else if (terminal || deployment.status !== "activating") {
      // Waiting jobs must be admitted by the shared queue before touching a container.
      return
    }

    try {
      await activate(this.env, deployment)
      await this.log(id, "Build completed. Immutable artifacts saved.")
      await this.ctx.storage.put("done", true)
    } catch (error) {
      await this.log(id, error instanceof Error ? error.message : "Activation failed.")
      if ((error instanceof HttpError && error.code === "hosting_pending") || buildRetryDelay(error, 1) !== null) {
        await this.ctx.storage.setAlarm(
          Date.now() + (error instanceof HttpError && error.code === "hosting_pending" ? 10_000 : 60_000)
        )
        return
      }
      await this.env.DATABASE.prepare(
        "UPDATE deployments SET status='failed',updated_at=? WHERE id=? AND status='activating'"
      )
        .bind(new Date().toISOString(), id)
        .run()
      await this.ctx.storage.put("done", true)
    }
  }

  private async build(deployment: DeploymentRow) {
    await requireActiveProject(this.env, deployment.project_id)
    const id = deployment.id
    await claimBuildBudget(this.env, id, deployment.project_id)
    const sandbox = getSandbox(this.env.SANDBOX, `build-${id}`)
    // A retry always starts a fresh filesystem; no source from another build is reused.
    await sandbox.destroy()
    await getSandbox(this.env.SANDBOX, `media-${id}`).destroy()
    await this.env.DATABASE.batch([
      this.env.DATABASE.prepare("UPDATE deployments SET status='building',updated_at=? WHERE id=?").bind(
        new Date().toISOString(),
        id
      ),
      this.env.DATABASE.prepare("UPDATE releases SET status='building' WHERE id=? AND status != 'ready'").bind(
        deployment.release_id
      )
    ])
    await this.log(id, "Starting isolated build with Node.js 24 and pnpm 12.")
    const upload = await this.env.DATABASE.prepare("SELECT sha256 FROM uploads WHERE id=? AND project_id=?")
      .bind(deployment.upload_id, deployment.project_id)
      .first<{ sha256: string }>()
    const source = await this.env.ARTIFACTS.get(`sources/${deployment.project_id}/${deployment.upload_id}.gz`)
    if (!source || !upload) throw new Error("Source archive is unavailable.")
    const sourceFiles = decodeSource(new Uint8Array(await source.arrayBuffer()), upload.sha256)
    // Optional measurement must never prevent a game build.
    try {
      await attributeRelease(this.env, deployment.release_id, sourceFiles)
    } catch {
      console.warn("creator_attribution_unavailable")
    }
    await sandbox.writeFile(
      "/tmp/spawn-source.json",
      JSON.stringify({
        files: sourceFiles.map((file) => ({ path: file.path, content: file.content.toString("base64") }))
      })
    )
    const log = async (lines: string[]) => {
      if (lines.length === 0) return
      await this.env.DATABASE.batch(
        lines.map((line) =>
          this.env.DATABASE.prepare("INSERT INTO logs(deployment_id,message,created_at) VALUES(?,?,?)").bind(
            id,
            line,
            new Date().toISOString()
          )
        )
      )
    }
    for (const phase of ["install", "build"] as const) {
      await requireActiveProject(this.env, deployment.project_id)
      await sandbox.setOutboundHandler(phase === "install" ? "dependencies" : "blocked")
      await log([
        phase === "install"
          ? "Installing dependencies through the package registry proxy."
          : "Building with external network access disabled."
      ])
      const process = await sandbox.exec(
        ["runuser", "-u", "spawn-build", "--", "node", "/opt/spawn/build-runner.mjs", phase],
        { timeout: 300_000 }
      )
      const output = await streamBuildOutput(process, log)
      if (!output.timedOut && (output.signal === 15 || output.code === 143))
        throw new HttpError(503, "build_interrupted", "Build process was interrupted by a termination signal.")
      if (output.code !== 0 || output.timedOut)
        throw new Error(
          `Build ${phase} failed (exit ${output.code}${output.signal ? `, signal ${output.signal}` : ""}${output.timedOut ? ", timed out" : ""}). Review the build output.`
        )
    }
    const artifact = await sandbox.readFile("/workspace/spawn-artifacts.json", { encoding: "none" })
    const bytes = await readArtifactManifest(artifact)
    const files = parseArtifacts(bytes)
    requireValue(
      files.some((file) => file.path === "index.html"),
      "Build must include index.html."
    )
    // Terminate every creator process before starting a separate trusted processor.
    await sandbox.destroy()
    await requireActiveProject(this.env, deployment.project_id)
    await log(["Processing listing artwork in an isolated offline media job."])
    const media = await processListingMedia(this.env, id, files, log)
    if (sourceFiles.some((file) => file.path === "listing-update.json") && media.warnings.length)
      throw new Error("The selected media could not be processed. Your current game is unchanged.")
    for (const file of media.files) {
      const content = Buffer.from(file.content, "base64")
      await putProjectArtifact(
        this.env,
        deployment.project_id,
        `releases/${deployment.project_id}/${deployment.release_id}/${file.path}`,
        content
      )
    }
    const digest = createHash("sha256").update(JSON.stringify(media.files)).digest("hex")
    await this.env.DATABASE.batch([
      this.env.DATABASE.prepare(
        "UPDATE releases SET status='ready',artifact_digest=?,media_warnings=? WHERE id=?"
      ).bind(digest, JSON.stringify(media.warnings), deployment.release_id),
      this.env.DATABASE.prepare("UPDATE build_queue SET outcome='activate' WHERE deployment_id=?").bind(id)
    ])
  }
}
