import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { readCredentials } from "./auth"
import { createPlatformApi, identifier } from "./platform-api"
import type { PlatformApi } from "./platform-api"
import { projectSelection } from "./project"
import { findGameRoot } from "./source"

export type LinkPrompts = {
  action(): Promise<"new" | "existing" | "skip">
  name(defaultName: string): Promise<string | undefined>
  project(projects: { id: string; name: string }[]): Promise<string | undefined>
  confirm(name: string): Promise<boolean>
}

export async function guidedLink(
  directory: string,
  prompts: LinkPrompts,
  write: (text: string) => void,
  suppliedApi?: PlatformApi
) {
  const root = await findGameRoot(directory)
  const current = await projectSelection("show", undefined, root)
  if (current.projectId) {
    write(`Already linked to ${current.projectId}. Run spawn unlink before switching.\n`)
    return
  }
  const action = await prompts.action()
  if (action === "skip") {
    write("Project linking skipped. Run spawn link when you’re ready.\n")
    return
  }
  const api = suppliedApi ?? createPlatformApi(await readCredentials())
  let id: string | undefined
  if (action === "existing") {
    const { projects } = await api.projects()
    if (
      !Array.isArray(projects) ||
      projects.some(
        (project) =>
          !project || typeof project.id !== "string" || typeof project.name !== "string" || !identifier(project.id)
      )
    )
      throw new Error("Invalid project list from SpawnKit.")
    if (!projects.length) {
      write("No hosted projects yet. Run spawn link and choose New project.\n")
      return
    }
    id = await prompts.project(projects)
    if (id && !projects.some((project) => project.id === id)) throw new Error("Choose a project from your account.")
  } else {
    const manifest = JSON.parse(await readFile(join(root, "game.config.json"), "utf8"))
    const name = (await prompts.name(typeof manifest.name === "string" ? manifest.name : basename(root)))?.trim()
    if (name === undefined) return
    if (
      !name ||
      name.length > 64 ||
      [...name].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    )
      throw new Error("Enter a project name between 1 and 64 characters without control characters.")
    if (!(await prompts.confirm(name))) {
      write("Project linking cancelled. Nothing was created.\n")
      return
    }
    id = randomUUID()
    try {
      const created = await api.createProject({ id, name, configuration: { sandbox: false } })
      if (created.id !== id) throw new Error("Unexpected project ID.")
    } catch {
      throw new Error(
        `Could not confirm project creation. Check your dashboard before retrying. Project ID: ${id}. If it exists, run spawn link --project ${id}.`
      )
    }
  }
  if (!id) {
    write("Project linking cancelled.\n")
    return
  }
  try {
    const project = await api.project(identifier(id))
    if (project.id !== id) throw new Error("Unexpected project ID.")
    await projectSelection("set", id, root, project.hostname)
    write(`Linked to ${project.name} (${id})\nFolder: ${root}\nNext: spawn deploy --dry-run\n`)
  } catch {
    throw new Error(`Could not link this folder. The hosted project was preserved. Retry: spawn link --project ${id}`)
  }
}
