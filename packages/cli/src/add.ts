import { createHash } from "node:crypto"
import { lstat, mkdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import type { ProjectOptions } from "@spawn/templates"
import { planAddition } from "@spawn/templates"

export async function readSafe(root: string, path: string): Promise<string | undefined> {
  const target = resolve(root, path)
  const inside = relative(root, target)
  if (!inside || inside.startsWith("..") || path.includes("\\")) throw new Error(`Unsafe project path: ${path}`)
  const parts = inside.split(sep)
  for (let i = 1; i <= parts.length; i++) {
    try {
      const info = await lstat(join(root, ...parts.slice(0, i)))
      if (info.isSymbolicLink() || (i === parts.length && (!info.isFile() || info.nlink > 1)))
        throw new Error(`Refusing linked or non-file path: ${path}`)
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined
      throw error
    }
  }
  return readFile(target, "utf8")
}

export async function addModules(
  root: string,
  modules: string[],
  apply: boolean,
  targetOptions?: ProjectOptions,
  approvedFingerprint?: string
) {
  root = resolve(root)
  const state = await readSafe(root, ".spawn/state.json")
  if (!state) throw new Error("No SpawnKit ownership record found. Run add from a SpawnKit-generated project root.")
  const paths = planAddition(state, {}, modules, targetOptions).files
  const current: Record<string, string | undefined> = {}
  for (const path of paths) current[path] = await readSafe(root, path)
  const plan = planAddition(state, current, modules, targetOptions)
  const fingerprint = createHash("sha256").update(JSON.stringify({ state, current, plan })).digest("hex")
  if (approvedFingerprint && approvedFingerprint !== fingerprint)
    throw new Error("Project changed after review. Preview the changes again.")
  const status = plan.conflicts.length ? "conflict" : !plan.changes.length ? "unchanged" : apply ? "updated" : "planned"
  if (apply && status === "updated") {
    const lock = join(root, ".spawn/add.lock")
    await writeFile(lock, "SpawnKit module update\n", { flag: "wx" })
    const written: typeof plan.changes = []
    const directories: string[] = []
    const recoveryPath = join(root, ".spawn/recovery.json")
    let journalCreated = false
    try {
      await writeFile(recoveryPath, JSON.stringify({ changes: plan.changes }, null, 2) + "\n", {
        flag: "wx",
        mode: 0o600
      })
      journalCreated = true
      for (const change of plan.changes) {
        if ((await readSafe(root, change.path)) !== change.before)
          throw new Error(`Project changed during planning: ${change.path}. Run add again.`)
      }
      for (const change of plan.changes) {
        const target = join(root, change.path)
        const parents: string[] = []
        for (let parent = dirname(target); parent !== root; parent = dirname(parent)) parents.unshift(parent)
        for (const parent of parents) {
          try {
            await mkdir(parent)
            directories.push(parent)
          } catch (error) {
            if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error
          }
        }
        if ((await readSafe(root, change.path)) !== change.before)
          throw new Error(`Project changed during update: ${change.path}`)
        // Record before writing so a partial write can be reported and recovered.
        written.push(change)
        if (change.after === undefined) await unlink(target)
        else await writeFile(target, change.after, { flag: change.before === undefined ? "wx" : "w" })
      }
      await unlink(recoveryPath)
      journalCreated = false
    } catch (error) {
      const recovery: string[] = []
      for (const change of written.reverse()) {
        try {
          const content = await readSafe(root, change.path)
          if (content === change.before) continue
          if (content !== change.after) {
            recovery.push(change.path)
            continue
          }
          if (change.before === undefined) await unlink(join(root, change.path))
          else await writeFile(join(root, change.path), change.before)
        } catch {
          recovery.push(change.path)
        }
      }
      for (const directory of directories.reverse()) await rmdir(directory).catch(() => undefined)
      if (recovery.length)
        throw new Error(
          `Update interrupted. Original contents are in .spawn/recovery.json. Review these files before retrying: ${recovery.join(", ")}`,
          {
            cause: error
          }
        )
      if (journalCreated) await unlink(recoveryPath)
      throw error
    } finally {
      await unlink(lock)
    }
  }
  return {
    status,
    fingerprint,
    destination: root,
    added: plan.added,
    packageChanges: plan.packageChanges,
    changes: plan.changes.map(({ path, before, after }) => ({
      path,
      action: after === undefined ? "remove" : before === undefined ? "create" : "update"
    })),
    conflicts: plan.conflicts
  }
}

export function formatAddition(result: Awaited<ReturnType<typeof addModules>>, includeInstructions = true) {
  const heading = {
    planned: "Ready to add",
    updated: "Modules added",
    unchanged: "Already configured",
    conflict: "Changes need your attention"
  }[result.status]
  return (
    [
      ...(includeInstructions ? [heading, result.destination] : []),
      ...(result.status === "unchanged"
        ? ["No changes needed."]
        : [
            "",
            ...["dependencies", "devDependencies", "scripts"].flatMap((section) => {
              const entries = result.packageChanges.filter((entry) => entry.section === section)
              return entries.length
                ? [
                    section === "scripts"
                      ? "Scripts"
                      : section === "dependencies"
                        ? "Dependencies"
                        : "Development tools",
                    ...entries.map((entry) => `  ${entry.name}  ${entry.value}`),
                    ""
                  ]
                : []
            }),
            "Files  (+ new, ~ updated, - removed)",
            "",
            ...result.changes
              .filter((change) => change.path !== ".spawn/state.json")
              .map(
                (change) =>
                  `  ${change.action === "create" ? "+" : change.action === "remove" ? "-" : "~"} ${change.path}`
              ),
            "",
            ...(result.conflicts.length
              ? [
                  "Conflicts:",
                  ...result.conflicts.map((path) => `  ! ${path}`),
                  "Your changes were preserved. Resolve the conflicts and preview again."
                ]
              : includeInstructions
                ? [`Modules: ${result.added.join(", ")}`]
                : [])
          ]),
      "",
      !includeInstructions
        ? ""
        : result.status === "updated"
          ? `Next steps\n  cd "${result.destination}"\n  pnpm install\n  pnpm dev`
          : result.status === "planned"
            ? "No files changed. Run again with --yes to apply."
            : "No files changed.",
      ""
    ]
      .join("\n")
      .trim() + "\n"
  )
}
