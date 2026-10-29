import { lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { findGameRoot } from "./source"

export async function projectSelection(action: string, id: string | undefined, directory: string, hostname?: string) {
  if (hostname !== undefined && !/^[a-z0-9-]+(?:\.staging)?\.spawnkit\.games$/.test(hostname))
    throw new Error("Invalid project hostname from SpawnKit.")
  if (!["set", "show", "clear"].includes(action)) throw new Error("Use spawn project set <id>, show, or clear.")
  if (action === "set" ? !id || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id) : id !== undefined)
    throw new Error("Set requires a project ID (letters, numbers, hyphens, underscores); show and clear take no ID.")
  const root = await findGameRoot(directory)
  const manifest = join(root, "game.config.json")
  const info = await lstat(manifest).catch(() => null)
  if (!info?.isFile() || info.isSymbolicLink())
    throw new Error("Run this command in a generated game folder, or pass --directory <game-folder>.")
  const folder = join(root, ".spawn")
  if (action === "set") await mkdir(folder, { recursive: true })
  const folderInfo = await lstat(folder).catch(() => null)
  if (folderInfo && (!folderInfo.isDirectory() || folderInfo.isSymbolicLink()))
    throw new Error("Project selection directory must be a regular directory.")
  const file = join(folder, "project.json")
  let existing: { version: number; projectId: string; hostname?: string } | undefined
  try {
    const stat = await lstat(file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1) throw new Error("Refusing linked project selection.")
    existing = JSON.parse(await readFile(file, "utf8"))
    if (existing?.version !== 1 || typeof existing.projectId !== "string")
      throw new Error("Invalid project selection file.")
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
  }
  if (action === "set") {
    if (existing && existing.projectId !== id)
      throw new Error(`This folder already selects ${existing.projectId}. Run spawn unlink before switching.`)
    const next = { ...existing, version: 1, projectId: id!, ...(hostname ? { hostname } : {}) }
    if (!existing || (hostname && existing.hostname !== hostname))
      await writeFile(file, JSON.stringify(next, null, 2) + "\n", { flag: existing ? "w" : "wx" })
    existing = next
  }
  if (action === "clear" && existing) {
    await unlink(file)
    existing = undefined
  }
  return {
    status: existing ? "selected" : "unselected",
    projectId: existing?.projectId ?? null,
    ...(existing?.hostname ? { hostname: existing.hostname } : {}),
    directory: root,
    verified: false
  }
}
