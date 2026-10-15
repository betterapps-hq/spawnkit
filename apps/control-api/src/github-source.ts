import { createHash } from "node:crypto"
import { gunzipSync, gzipSync } from "node:zlib"
import { extract } from "tar-stream"
import { installationToken } from "./github"
import { boundedBody, requireValue } from "./http"
import { decodeSource, MAX_SOURCE_BYTES, validateSourcePath } from "./source"

export async function convertGitHubArchive(bytes: Uint8Array) {
  const tar = gunzipSync(bytes, { maxOutputLength: 30 * 1024 * 1024 })
  const parser = extract()
  const files: { path: string; content: string }[] = []
  let total = 0
  const done = new Promise<void>((resolve, reject) => {
    parser.on("error", reject)
    parser.on("finish", resolve)
    parser.on("entry", (header, stream, next) => {
      const collect = async () => {
        if (header.type === "directory") {
          stream.resume()
          stream.on("end", next)
          return
        }
        requireValue(header.type === "file", "Repository archives cannot contain links or special files.")
        const path = header.name.split("/").slice(1).join("/")
        // Match CLI exclusions for generated metadata and credential-bearing local configuration.
        if (
          path.split("/")[0]?.toLowerCase() === ".spawn" ||
          /^(?:\.env(?:\.|$)|\.npmrc$)/i.test(path.split("/").at(-1)!)
        ) {
          stream.resume()
          stream.on("end", next)
          return
        }
        validateSourcePath(path)
        total += header.size ?? 0
        requireValue(total <= MAX_SOURCE_BYTES && files.length < 2000, "Repository exceeds source limits.")
        const chunks: Buffer[] = []
        for await (const chunk of stream) chunks.push(Buffer.from(chunk))
        files.push({ path, content: Buffer.concat(chunks).toString("base64") })
        next()
      }
      void collect().catch((error: Error) => parser.destroy(error))
    })
  })
  parser.end(tar)
  await done
  files.sort((a, b) => a.path.localeCompare(b.path))
  const source = gzipSync(JSON.stringify({ version: 1, files }))
  const sha256 = createHash("sha256").update(source).digest("hex")
  decodeSource(source, sha256)
  return { bytes: source, sha256 }
}

export async function githubSource(
  env: Env,
  connection: { installation_id: number; repository_id: number; repository: string },
  commit: string
) {
  requireValue(
    /^[a-f0-9]{40}$/.test(commit) && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(connection.repository),
    "Invalid repository source."
  )
  const token = await installationToken(env, connection.installation_id, connection.repository_id)
  const response = await fetch(`https://api.github.com/repos/${connection.repository}/tarball/${commit}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "SpawnKit" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000)
  })
  requireValue(response.status === 302 && response.headers.has("location"), "GitHub source download could not start.")
  const location = new URL(response.headers.get("location")!)
  requireValue(
    location.protocol === "https:" &&
      location.hostname === "codeload.github.com" &&
      !location.username &&
      !location.password,
    "Invalid GitHub archive origin."
  )
  // Never forward installation credentials to a redirect destination.
  const archive = await fetch(location, { redirect: "manual", signal: AbortSignal.timeout(30_000) })
  requireValue(archive.ok && archive.body, "GitHub source download failed.")
  const bytes = await boundedBody(
    new Request("https://internal.invalid", { method: "POST", body: archive.body }),
    MAX_SOURCE_BYTES
  )
  return convertGitHubArchive(bytes)
}
