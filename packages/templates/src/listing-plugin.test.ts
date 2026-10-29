import { execFileSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, it } from "vitest"
import { createProjectPlan } from "./index"

it("builds equivalent TypeScript and JSON configs and rejects ambiguous or invalid sources", async () => {
  const work = fileURLToPath(new URL("../../../work/", import.meta.url))
  await mkdir(work, { recursive: true })
  const root = await mkdtemp(join(work, "listing-config-"))
  const plan = createProjectPlan({ name: "config-check", template: "phaser" })
  const write = async (name: string, value: string) => {
    const path = join(root, name)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, value)
  }
  const build = () =>
    execFileSync(
      process.execPath,
      [
        fileURLToPath(new URL("../../../node_modules/vite/bin/vite.js", import.meta.url)),
        "build",
        root,
        "--logLevel",
        "error"
      ],
      { encoding: "utf8", stdio: "pipe", timeout: 20000 }
    )
  try {
    for (const name of [
      "spawnkit/config.ts",
      "spawnkit/vite.ts",
      "spawnkit.config.ts",
      "spawnkit.config.schema.json",
      "vite.config.ts"
    ])
      await write(name, plan.files[name]!)
    await write("package.json", '{"type":"module"}')
    await write("index.html", "<!doctype html><title>Config test</title>")
    build()
    const typed = JSON.parse(await readFile(join(root, "dist/spawnkit.config.json"), "utf8"))
    expect(typed).toMatchObject({ schemaVersion: 1, title: "config-check" })
    await write("spawnkit.config.json", JSON.stringify({ $schema: "./spawnkit.config.schema.json", ...typed }))
    expect(build).toThrow("Multiple game configurations")
    await rm(join(root, "spawnkit.config.ts"))
    build()
    expect(JSON.parse(await readFile(join(root, "dist/spawnkit.config.json"), "utf8"))).toEqual(typed)
    await write("spawnkit.config.json", JSON.stringify({ ...typed, genre: "Not a genre" }))
    expect(build).toThrow("Choose a supported genre")
    await rm(join(root, "spawnkit.config.json"))
    expect(build).toThrow("Add spawnkit.config.ts or spawnkit.config.json at the project root")
    await write("public/spawnkit.config.json", JSON.stringify(typed))
    expect(build).toThrow("Keep spawnkit.config.json at the project root, outside public/")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
