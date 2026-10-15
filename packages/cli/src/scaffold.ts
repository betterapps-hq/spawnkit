import { lstat, mkdir, rmdir, unlink, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import type { ProjectPlan } from "@spawn/templates"

export async function validateDestination(destination: string): Promise<void> {
  try {
    await lstat(destination)
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
    const parent = dirname(destination)
    try {
      if ((await lstat(parent)).isDirectory()) return
    } catch (parentError) {
      if (!(parentError instanceof Error && "code" in parentError && parentError.code === "ENOENT")) throw parentError
    }
    throw new Error(`Destination parent must be an existing directory: ${parent}`)
  }
  throw new Error(`Destination already exists: ${destination}. Choose a new directory.`)
}

export async function scaffoldProject(plan: ProjectPlan, destination: string): Promise<void> {
  const root = resolve(destination)
  const entries = Object.entries(plan.files).map(([path, content]) => {
    const target = resolve(root, path)
    const inside = relative(root, target)
    if (
      !inside ||
      isAbsolute(path) ||
      isAbsolute(inside) ||
      inside === ".." ||
      inside.startsWith(`..${sep}`) ||
      path.includes("\\")
    ) {
      throw new Error(`Unsafe template path: ${path}`)
    }
    return { target, content }
  })
  // Creating exclusively is the overwrite boundary, including empty existing directories.
  await mkdir(root)
  const files: string[] = []
  const directories = new Set<string>()
  try {
    for (const { target, content } of entries) {
      const parents: string[] = []
      for (let parent = dirname(target); parent !== root; parent = dirname(parent)) parents.unshift(parent)
      for (const parent of parents) {
        if (!directories.has(parent)) {
          await mkdir(parent)
          directories.add(parent)
        }
      }
      await writeFile(target, content, { encoding: "utf8", flag: "wx" })
      files.push(target)
    }
  } catch (error) {
    // Only remove files created by this operation; never recursively delete the destination.
    for (const file of files.reverse()) await unlink(file).catch(() => undefined)
    for (const directory of [...directories].reverse()) await rmdir(directory).catch(() => undefined)
    await rmdir(root).catch(() => undefined)
    throw error
  }
}
