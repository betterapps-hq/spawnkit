import { createHash } from "node:crypto"
import { getSandbox } from "@cloudflare/sandbox"
import { DurableObject } from "cloudflare:workers"
import { activate, type DeploymentRow } from "./activation"
import { boundedBody, record, requireValue, HttpError } from "./http"
import { decodeSource, validateSourcePath } from "./source"

export class BuildJob extends DurableObject<Env> {
  async start(id: string) {
    if (await this.ctx.storage.get("done")) return
    await this.ctx.storage.put("deployment", id)
    await this.ctx.storage.setAlarm(Date.now() + 100)
  }

  async alarm() {
    const id = await this.ctx.storage.get<string>("deployment")
    if (!id || (await this.ctx.storage.get("done"))) return
    const deployment = await this.env.DATABASE.prepare("SELECT * FROM deployments WHERE id=?")
      .bind(id)
      .first<DeploymentRow>()
    if (!deployment || ["succeeded", "failed", "superseded"].includes(deployment.status)) return
    const sandbox = (await this.ctx.storage.get("artifactsReady")) ? null : getSandbox(this.env.SANDBOX, `build-${id}`)
    const log = async (message: string) => {
      await this.env.DATABASE.prepare("INSERT INTO logs(deployment_id,message,created_at) VALUES(?,?,?)")
        .bind(id, message.slice(0, 8192), new Date().toISOString())
        .run()
    }
    try {
      if (sandbox) {
        // A retry always starts a fresh filesystem; no source from another build is reused.
        await sandbox.destroy()
        await this.env.DATABASE.prepare("UPDATE deployments SET status='building',updated_at=? WHERE id=?")
          .bind(new Date().toISOString(), id)
          .run()
        await log("Starting isolated build with Node.js 24 and pnpm 12.")
        const upload = await this.env.DATABASE.prepare("SELECT sha256 FROM uploads WHERE id=? AND project_id=?")
          .bind(deployment.upload_id, deployment.project_id)
          .first<{ sha256: string }>()
        const source = await this.env.ARTIFACTS.get(`sources/${deployment.project_id}/${deployment.upload_id}.gz`)
        if (!source || !upload) throw new Error("Source archive is unavailable.")
        const files = decodeSource(new Uint8Array(await source.arrayBuffer()), upload.sha256)
        await sandbox.writeFile(
          "/tmp/spawn-source.json",
          JSON.stringify({
            files: files.map((file) => ({ path: file.path, content: file.content.toString("base64") }))
          })
        )
        const process = await sandbox.exec(
          ["runuser", "-u", "spawn-build", "--", "node", "/opt/spawn/build-runner.mjs"],
          { timeout: 600_000 }
        )
        const output = await process.output({ encoding: "utf8", maxBytes: 256 * 1024, timeout: 620_000 })
        for (const line of `${output.stdout}\n${output.stderr}`.split("\n").slice(-500)) if (line) await log(line)
        if (output.exitCode !== 0 || output.timedOut) throw new Error("Build failed. Review the build output.")
        const artifact = await sandbox.readFile("/workspace/spawn-artifacts.json", { encoding: "none" })
        const bytes = await boundedBody(
          new Request("https://internal.invalid", { method: "POST", body: artifact.content }),
          30 * 1024 * 1024
        )
        const parsed = record(JSON.parse(new TextDecoder().decode(bytes)))
        requireValue(Array.isArray(parsed.files) && parsed.files.length <= 2000, "Invalid artifact manifest.")
        const paths = new Set<string>()
        let total = 0
        for (const entry of parsed.files) {
          const file = record(entry)
          requireValue(typeof file.path === "string" && typeof file.content === "string", "Invalid artifact.")
          validateSourcePath(file.path)
          requireValue(!paths.has(file.path.toLowerCase()), "Duplicate artifact path.")
          paths.add(file.path.toLowerCase())
          const content = Buffer.from(file.content, "base64")
          requireValue(content.toString("base64") === file.content, "Invalid artifact encoding.")
          total += content.byteLength
          requireValue(total <= 20 * 1024 * 1024, "Artifact is too large.")
          await this.env.ARTIFACTS.put(
            `releases/${deployment.project_id}/${deployment.release_id}/${file.path}`,
            content
          )
        }
        requireValue(paths.has("index.html"), "Build must include index.html.")
        const digest = createHash("sha256").update(bytes).digest("hex")
        await this.env.DATABASE.prepare("UPDATE releases SET status='ready',artifact_digest=? WHERE id=?")
          .bind(digest, deployment.release_id)
          .run()
        await this.ctx.storage.put("artifactsReady", true)
        await this.env.DATABASE.prepare("UPDATE deployments SET status='activating',updated_at=? WHERE id=?")
          .bind(new Date().toISOString(), id)
          .run()
      }
      await activate(this.env, deployment)
      await log("Build completed. Immutable artifacts saved.")
      await this.ctx.storage.put("done", true)
    } catch (error) {
      await log(error instanceof Error ? error.message : "Build failed.")
      if (error instanceof HttpError && error.code === "hosting_pending") {
        await this.ctx.storage.setAlarm(Date.now() + 60_000)
        return
      }
      await this.env.DATABASE.batch([
        this.env.DATABASE.prepare(
          "UPDATE deployments SET status='failed',updated_at=? WHERE id=? AND status NOT IN ('succeeded','superseded')"
        ).bind(new Date().toISOString(), id),
        this.env.DATABASE.prepare("UPDATE releases SET status='failed' WHERE id=? AND status != 'ready'").bind(
          deployment.release_id
        )
      ])
      await this.ctx.storage.put("done", true)
    } finally {
      await sandbox?.destroy()
    }
  }
}
