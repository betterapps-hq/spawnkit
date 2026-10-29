import { gameDimensions, gameGenres } from "./listing"

/** Kept local to generated projects: no private workspace packages are required. */
export const listingConfigSource = `const genres = ${JSON.stringify(gameGenres)} as const
const dimensions = ${JSON.stringify(gameDimensions)} as const

export interface SpawnKitConfig {
  title: string
  description: string
  genre: typeof genres[number]
  dimension: typeof dimensions[number]
  /** Release-relative path. Place the source file under public/. Maximum 1 MiB. */
  coverPath: string
  /** Optional MP4/WebM, at most 2 MiB and 60 seconds. Start on gameplay. */
  trailerPath?: string
  /** Optional public gameplay details. Source links require permission and a license. */
  details?: { objective?: string; controls?: string; devices?: string; creator?: string; sourceUrl?: string; sourceLicense?: string; sourcePermission?: boolean; kitId?: string }
}

export function defineConfig(config: SpawnKitConfig): SpawnKitConfig {
  const allowed = ["title", "description", "genre", "dimension", "coverPath", "trailerPath", "details"]
  if (!config || typeof config !== "object" || Object.keys(config).some(key => !allowed.includes(key)))
    throw new Error("Unknown SpawnKit listing field.")
  for (const [name, min, max] of [["title", 1, 64], ["description", 10, 500]] as const) {
    const value = config[name]
    if (typeof value !== "string" || value.trim().length < min || value.length > max)
      throw new Error(name + " must contain " + min + "–" + max + " characters.")
  }
  if (!genres.includes(config.genre) || !dimensions.includes(config.dimension))
    throw new Error("Choose a supported genre and dimension (2D or 3D).")
  for (const key of ["coverPath", "trailerPath"] as const) {
    const value = config[key]
    if (key === "trailerPath" && value === undefined) continue
    const extension = key === "coverPath" ? /\\.(png|jpe?g|webp|svg)$/ : /\\.(mp4|webm)$/
    if (typeof value !== "string" || value.length > 200 || !/^[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(value) ||
        !extension.test(value) || value.split("/").some(part => !part || part === "." || part === ".."))
      throw new Error(key + " must be a relative supported media path, without public/ or a leading slash.")
  }
  return { ...config }
}
`

export const listingPluginSource = String.raw`import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { loadConfigFromFile, type Plugin } from "vite"
import { defineConfig, type SpawnKitConfig } from "./config"

export function spawnkitListing(): Plugin {
  let source = ""
  let schema: string | undefined
  return {
    name: "spawnkit-listing",
    async configResolved(vite) {
      const typed = resolve(vite.root, "spawnkit.config.ts")
      const json = resolve(vite.root, "spawnkit.config.json")
      if (vite.publicDir && existsSync(resolve(vite.publicDir, "spawnkit.config.json")))
        throw new Error("Keep spawnkit.config.json at the project root, outside public/.")
      const sources = [typed, json].filter(path => existsSync(path))
      if (sources.length > 1)
        throw new Error("Multiple game configurations found. Keep only spawnkit.config.ts or spawnkit.config.json. No files were overwritten.")
      const path = sources[0]
      if (!path) throw new Error("Add spawnkit.config.ts or spawnkit.config.json at the project root.")
      let value: unknown
      if (path === typed) {
        const loaded = await loadConfigFromFile({ command: vite.command, mode: vite.mode }, typed, vite.root)
        value = loaded?.config
        if (loaded) vite.configFileDependencies.push(...loaded.dependencies)
      } else value = JSON.parse(readFileSync(path, "utf8"))
      vite.configFileDependencies.push(path)
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Game configuration must be an object.")
      const { schemaVersion, $schema, ...fields } = value as Record<string, unknown>
      if (schemaVersion !== undefined && schemaVersion !== 1) throw new Error("Use schemaVersion 1 in spawnkit.config.json.")
      if ($schema !== undefined && typeof $schema !== "string") throw new Error("$schema must be an editor schema path.")
      source = JSON.stringify({ schemaVersion: 1, ...defineConfig(fields as unknown as SpawnKitConfig) }, null, 2) + "\n"
      const schemaPath = resolve(vite.root, "spawnkit.config.schema.json")
      if (existsSync(schemaPath)) schema = readFileSync(schemaPath, "utf8")
    },
    configureServer(server) {
      server.middlewares.use("/spawnkit.config.json", (_request, response) => {
        response.setHeader("Content-Type", "application/json")
        response.end(source)
      })
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "spawnkit.config.json", source })
      if (schema) this.emitFile({ type: "asset", fileName: "spawnkit.config.schema.json", source: schema })
    }
  }
}
`
