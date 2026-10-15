import { isAddonId, type AddonId } from "./catalog"
import { selectedComponents } from "./composition"
import { createProjectPlan, type ProjectOptions } from "./index"

type JsonObject = Record<string, unknown>
const object = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Only keys changed by the generator are candidates for an update.
function merge(before: unknown, after: unknown, current: unknown, path: string, conflicts: string[]): unknown {
  if (equal(before, after)) return current
  if (equal(current, before) || equal(current, after)) return after
  if (object(before) && object(after) && object(current)) {
    const result = { ...current }
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error(`Unsafe JSON key: ${path}.${key}`)
      const value = merge(before[key], after[key], current[key], `${path}.${key}`, conflicts)
      if (value === undefined) delete result[key]
      else result[key] = value
    }
    return result
  }
  conflicts.push(path)
  return current
}

export function planAddition(
  stateText: string,
  current: Record<string, string | undefined>,
  requested: string[],
  targetOptions?: ProjectOptions
) {
  const state: unknown = JSON.parse(stateText)
  if (
    !object(state) ||
    state.schemaVersion !== 1 ||
    state.generatorVersion !== "0.0.0" ||
    !object(state.options) ||
    !object(state.files)
  )
    throw new Error("Unsupported SpawnKit ownership record. A versioned migration is required.")
  const options = state.options as unknown as ProjectOptions
  const before = createProjectPlan(options)
  const expectedState = JSON.parse(before.files[".spawn/state.json"]!) as JsonObject
  if (!equal(state.moduleVersions, expectedState.moduleVersions))
    throw new Error("Unsupported module versions. A versioned migration is required.")
  delete before.files[".spawn/state.json"]
  if (!equal(before.files, state.files))
    throw new Error("Template baseline changed. A versioned migration is required.")
  const selected: AddonId[] = [...(options.addons ?? [])]
  for (const id of requested) {
    if (!isAddonId(id))
      throw new Error(`Unknown add-on: ${id}. Available: vitest, playwright, storybook, bitecs, koota`)
    if (!selected.includes(id)) selected.push(id)
  }
  const next = targetOptions ?? { ...options, addons: selected }
  if (next.name !== options.name || next.template !== options.template)
    throw new Error("Project renaming and renderer migration are not supported by add.")
  const after = createProjectPlan(next)
  const conflicts: string[] = []
  const changes: { path: string; before: string | undefined; after: string | undefined }[] = []
  for (const path of new Set([...Object.keys(before.files), ...Object.keys(after.files)])) {
    const target = after.files[path]
    if (path === ".spawn/state.json" || before.files[path] === target) continue
    const existing = current[path]
    let content = target
    if (existing !== before.files[path] && existing !== target) {
      if (
        path.endsWith(".json") &&
        target !== undefined &&
        existing !== undefined &&
        before.files[path] !== undefined
      ) {
        try {
          content =
            JSON.stringify(
              merge(JSON.parse(before.files[path]), JSON.parse(target), JSON.parse(existing), path, conflicts),
              null,
              2
            ) + "\n"
        } catch {
          conflicts.push(path)
        }
      } else conflicts.push(path)
    }
    if (existing !== content) changes.push({ path, before: existing, after: content })
  }
  const added = targetOptions
    ? selectedComponents(next).filter((id) => !selectedComponents(options).includes(id))
    : selected.filter((id) => !options.addons?.includes(id))
  if (!equal(options, next))
    changes.push({ path: ".spawn/state.json", before: stateText, after: after.files[".spawn/state.json"]! })
  const packageChanges: { section: string; name: string; value: string }[] = []
  const oldPackage = JSON.parse(before.files["package.json"]!) as Record<string, Record<string, string>>
  const newPackage = JSON.parse(after.files["package.json"]!) as Record<string, Record<string, string>>
  try {
    const actualPackage = JSON.parse(current["package.json"] ?? "{}") as Record<string, Record<string, unknown>>
    for (const section of ["dependencies", "devDependencies"]) {
      const other = section === "dependencies" ? "devDependencies" : "dependencies"
      for (const name of Object.keys(newPackage[section]!)) {
        if (oldPackage[section]?.[name] === undefined && actualPackage[other]?.[name] !== undefined)
          conflicts.push(`package.json.${other}.${name}`)
      }
    }
  } catch {
    conflicts.push("package.json")
  }
  for (const section of ["dependencies", "devDependencies", "scripts"]) {
    for (const key of new Set([...Object.keys(oldPackage[section] ?? {}), ...Object.keys(newPackage[section] ?? {})])) {
      const value = newPackage[section]?.[key]
      if (oldPackage[section]?.[key] !== value) packageChanges.push({ section, name: key, value: value ?? "(remove)" })
    }
  }
  return {
    added,
    changes,
    packageChanges,
    conflicts: [...new Set(conflicts)],
    files: [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])]
  }
}
