import { createHash } from "node:crypto"
import { lstat, open, readFile, readdir, realpath } from "node:fs/promises"
import { basename, isAbsolute, join, matchesGlob, resolve } from "node:path"
import { gzipSync } from "node:zlib"

export const sourceLimits = { files: 2000, bytes: 20 * 1024 * 1024 }
const excluded =
  /^(?:\.env(?:\..*)?|\.envrc|\.netrc|\.git|\.hg|\.svn|\.spawn|\.ssh|\.aws|\.azure|\.npm|\.pnpm-store|\.npmrc|\.yarnrc.*|node_modules|dist|build|out|coverage|storybook-static|test-results|playwright-report|\.cache|\.turbo|\.vite|\.vitest|\.next|\.output|\.vercel|\.wrangler|\.DS_Store)$/i
const sensitiveName =
  /(?:\.(?:pem|key|p12|pfx|keystore|log)$|^(?:credentials(?:\..*)?|secrets?(?:\..*)?|id_rsa|id_ed25519)$)/i
const secretContent =
  /-----BEGIN (?:[A-Z ]*PRIVATE KEY)-----|\b(?:sk_(?:live|test)_[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/

export function validateSourcePath(path: string) {
  if (
    !path ||
    path.length > 240 ||
    isAbsolute(path) ||
    /[\\:]/.test(path) ||
    [...path].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
    path
      .split("/")
      .some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          /[. ]$/.test(part) ||
          /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
      )
  )
    throw new Error("Unsafe source archive path.")
}

export async function createSourceArchive(directory: string) {
  const root = await realpath(directory)
  const manifestStat = await lstat(join(root, "game.config.json"))
  if (
    !manifestStat.isFile() ||
    manifestStat.isSymbolicLink() ||
    manifestStat.nlink !== 1 ||
    manifestStat.size > 1024 * 1024
  )
    throw new Error("Unsafe game manifest.")
  const manifest = JSON.parse(await readFile(join(root, "game.config.json"), "utf8")) as {
    build?: { output?: unknown }
  }
  const output = manifest.build?.output
  if (output !== undefined && typeof output !== "string") throw new Error("Invalid build output path.")
  if (typeof output === "string") validateSourcePath(output)
  let rules: string[] = []
  try {
    const ignore = await lstat(join(root, ".spawnignore"))
    if (!ignore.isFile() || ignore.isSymbolicLink() || ignore.nlink !== 1 || ignore.size > 64 * 1024)
      throw new Error("Unsafe .spawnignore file.")
    rules = (await readFile(join(root, ".spawnignore"), "utf8"))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
    if (rules.some((rule) => rule.startsWith("!") || rule.includes("\\") || rule.includes("..")))
      throw new Error(".spawnignore supports additive relative globs only; negation is not supported.")
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
  }
  const files: { path: string; content: string }[] = []
  const names = new Set<string>()
  let sourceBytes = 0
  let omitted = 0
  let entries = 0
  async function visit(relative: string) {
    const path = join(root, relative)
    for (const name of (await readdir(path)).sort()) {
      if (++entries > 10_000)
        throw new Error("Source tree exceeds 10000 entries. Exclude unnecessary directories in .spawnignore.")
      const entry = relative ? `${relative}/${name}` : name
      validateSourcePath(entry)
      if (
        excluded.test(name) ||
        sensitiveName.test(name) ||
        entry === output ||
        (typeof output === "string" && entry.startsWith(`${output}/`)) ||
        rules.some(
          (rule) => matchesGlob(entry, rule.replace(/\/$/, "")) || (!rule.includes("/") && matchesGlob(name, rule))
        )
      ) {
        omitted++
        continue
      }
      const full = join(root, entry)
      const stat = await lstat(full)
      if (stat.isSymbolicLink()) throw new Error(`Source contains a symbolic link: ${entry}`)
      if (stat.isDirectory()) {
        await visit(entry)
        continue
      }
      if (!stat.isFile() || stat.nlink !== 1) throw new Error(`Source contains a linked or special file: ${entry}`)
      if (files.length >= sourceLimits.files || sourceBytes + stat.size > sourceLimits.bytes)
        throw new Error("Source exceeds the 2000-file / 20 MiB limit.")
      if (names.has(entry.toLowerCase())) throw new Error("Source contains case-colliding paths.")
      const handle = await open(full, "r")
      let content: Buffer
      try {
        const actual = await handle.stat()
        if (actual.ino !== stat.ino || actual.dev !== stat.dev || actual.nlink !== 1 || actual.size !== stat.size)
          throw new Error("Source changed during packaging; retry.")
        content = Buffer.alloc(stat.size)
        let offset = 0
        while (offset < content.length) {
          const { bytesRead } = await handle.read(content, offset, content.length - offset, offset)
          if (!bytesRead) throw new Error("Source changed during packaging; retry.")
          offset += bytesRead
        }
        const after = await handle.stat()
        if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs)
          throw new Error("Source changed during packaging; retry.")
      } finally {
        await handle.close()
      }
      if (secretContent.test(content.toString("utf8")))
        throw new Error(`Possible credential in ${entry}. Remove it from source before deploying.`)
      sourceBytes += content.length
      names.add(entry.toLowerCase())
      files.push({ path: entry, content: content.toString("base64") })
    }
  }
  await visit("")
  for (const required of ["game.config.json", "package.json", "pnpm-lock.yaml"])
    if (!files.some((file) => file.path === required)) throw new Error(`Missing required source file: ${required}`)
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const bytes = gzipSync(Buffer.from(JSON.stringify({ version: 1, files })))
  if (bytes.length > sourceLimits.bytes) throw new Error("Compressed source exceeds 20 MiB.")
  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.length,
    sourceBytes,
    fileCount: files.length,
    omitted
  }
}

export async function findGameRoot(directory: string) {
  let root = resolve(directory)
  while (true) {
    try {
      const stat = await lstat(join(root, "game.config.json"))
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error("Unsafe game manifest.")
      return root
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
    }
    const parent = resolve(root, "..")
    if (parent === root)
      throw new Error(`No game.config.json found above ${basename(directory)}. Use --directory <game-folder>.`)
    root = parent
  }
}
