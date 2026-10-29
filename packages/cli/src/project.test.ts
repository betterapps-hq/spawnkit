import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, it } from "vitest"
import { projectSelection } from "./project"

it("persists a selection, refuses accidental replacement, and clears without changing the game", async () => {
  const folder = await mkdtemp(join(tmpdir(), "spawn-selection-"))
  try {
    await expect(projectSelection("set", "demo", folder)).rejects.toThrow("game.config.json")
    await writeFile(join(folder, "game.config.json"), "{}")
    expect((await projectSelection("show", undefined, folder)).projectId).toBeNull()
    await projectSelection("set", "project_one", folder)
    await writeFile(join(folder, ".env"), "SPAWN_LOCAL_NAME=my-checkout\n")
    await projectSelection("set", "project_one", folder, "orchard.spawnkit.games")
    expect((await projectSelection("show", undefined, folder)).hostname).toBe("orchard.spawnkit.games")
    await projectSelection("set", "project_one", folder)
    expect((await projectSelection("show", undefined, folder)).hostname).toBe("orchard.spawnkit.games")
    expect(await readFile(join(folder, ".env"), "utf8")).toBe("SPAWN_LOCAL_NAME=my-checkout\n")
    await expect(projectSelection("set", "project_one", folder, "untrusted.example")).rejects.toThrow("hostname")
    expect((await projectSelection("show", undefined, folder)).projectId).toBe("project_one")
    await expect(projectSelection("set", "project_two", folder)).rejects.toThrow("already selects")
    await projectSelection("set", "project_one", folder)
    await projectSelection("clear", undefined, folder)
    expect((await projectSelection("show", undefined, folder)).projectId).toBeNull()
    expect(await readFile(join(folder, "game.config.json"), "utf8")).toBe("{}")
    await expect(projectSelection("set", "../bad", folder)).rejects.toThrow("project ID")
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
})
