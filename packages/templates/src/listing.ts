import { starterKits } from "./kits"
/** Shared discovery vocabulary, used by generators, publishing, and search. */
export const gameGenres = [
  "Arcade",
  "Action",
  "Adventure",
  "Puzzle",
  "Strategy",
  "Simulation",
  "Sports",
  "Racing",
  "Role-playing",
  "Platformer",
  "Shooter",
  "Idle",
  "Casual"
] as const
export const gameDimensions = ["2D", "3D"] as const
export interface GameListingConfig {
  schemaVersion: 1
  title: string
  description: string
  genre: (typeof gameGenres)[number]
  dimension: (typeof gameDimensions)[number]
  coverPath: string
  trailerPath?: string
  details?: GameDetails
}
export const listingTemplate: GameListingConfig = {
  schemaVersion: 1,
  title: "Your game",
  description: "Describe your game and what makes it fun to play.",
  genre: "Arcade",
  dimension: "2D",
  coverPath: "cover.png"
}
export function parseListingConfig(value: unknown): GameListingConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The listing must be a JSON object.")
  const config = value as Record<string, unknown>
  if (config.schemaVersion !== 1) throw new Error("Use schemaVersion 1 in spawnkit.config.json.")
  const allowed = [
    "$schema",
    "schemaVersion",
    "title",
    "description",
    "genre",
    "dimension",
    "coverPath",
    "trailerPath",
    "details"
  ]
  if (Object.keys(config).some((key) => !allowed.includes(key)))
    throw new Error("The listing contains an unknown field.")
  for (const [field, min, max] of [
    ["title", 1, 64],
    ["description", 10, 500]
  ] as const) {
    const text = config[field]
    if (typeof text !== "string" || text.trim().length < min || text.length > max)
      throw new Error(`${field} must contain ${min}–${max} characters.`)
  }
  const { genre, dimension } = listingClassification(config)
  if (!genre || !dimension) throw new Error("Choose a supported genre and 2D or 3D.")
  for (const field of ["coverPath", "trailerPath"] as const) {
    const path = config[field]
    if (field === "trailerPath" && path === undefined) continue
    const extension = field === "coverPath" ? /\.(png|jpe?g|webp|svg)$/i : /\.(mp4|webm)$/i
    if (
      typeof path !== "string" ||
      path.length > 200 ||
      !/^[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(path) ||
      !extension.test(path) ||
      path.split("/").some((part) => !part || part === "." || part === "..")
    )
      throw new Error(`${field} must be a relative path to a supported media file.`)
  }
  return {
    schemaVersion: 1,
    title: (config.title as string).trim(),
    description: (config.description as string).trim(),
    genre,
    dimension,
    coverPath: config.coverPath as string,
    ...(config.trailerPath === undefined ? {} : { trailerPath: config.trailerPath as string }),
    ...(config.details === undefined ? {} : { details: listingDetails(config.details) })
  }
}
export const gameCategoryMinimum = 5
export const gameCategories = gameGenres.map((genre) => ({ genre, slug: genre.toLowerCase() }))
export interface GameDetails {
  objective?: string
  controls?: string
  devices?: string
  creator?: string
  sourceUrl?: string
  sourceLicense?: string
  sourcePermission?: boolean
  kitId?: string
}
/** Public, creator-authored facts only; never infer devices, authors or source permissions. */
export function listingDetails(value: unknown): GameDetails {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch {
      return {}
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const fields = value as Record<string, unknown>
  const result: GameDetails = {}
  for (const [key, limit] of [
    ["objective", 300],
    ["controls", 300],
    ["devices", 160],
    ["creator", 100]
  ] as const) {
    const text = fields[key]
    if (typeof text === "string" && text.trim() && text.length <= limit) result[key] = text.trim()
  }
  if (typeof fields.kitId === "string" && starterKits.some((kit) => kit.id === fields.kitId))
    result.kitId = fields.kitId
  if (
    fields.sourcePermission === true &&
    typeof fields.sourceLicense === "string" &&
    fields.sourceLicense.trim() &&
    fields.sourceLicense.length <= 100 &&
    typeof fields.sourceUrl === "string" &&
    fields.sourceUrl.length <= 300
  ) {
    try {
      const url = new URL(fields.sourceUrl)
      if (url.protocol === "https:" && !url.username && !url.password) {
        result.sourceUrl = url.href
        result.sourceLicense = fields.sourceLicense.trim()
        result.sourcePermission = true
      }
    } catch {
      /* Invalid optional links are never rendered. */
    }
  }
  return result
}
export function listingClassification(value: Record<string, unknown>) {
  return {
    genre: gameGenres.find((genre) => genre === value.genre) ?? null,
    dimension: gameDimensions.find((dimension) => dimension === value.dimension) ?? null
  }
}
export const listingSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "SpawnKit game listing",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "title", "description", "genre", "dimension", "coverPath"],
  properties: {
    $schema: { type: "string" },
    schemaVersion: { const: 1, description: "Listing format version. Must be 1." },
    title: { type: "string", minLength: 1, maxLength: 64 },
    description: { type: "string", minLength: 10, maxLength: 500 },
    genre: { enum: gameGenres },
    dimension: { enum: gameDimensions },
    details: {
      type: "object",
      additionalProperties: false,
      properties: {
        objective: { type: "string", maxLength: 300 },
        controls: { type: "string", maxLength: 300 },
        devices: {
          type: "string",
          maxLength: 160,
          description: "Free text describing supported devices, for example Desktop and mobile. No fixed enum."
        },
        creator: { type: "string", maxLength: 100 },
        sourceUrl: {
          type: "string",
          format: "uri",
          maxLength: 300,
          description:
            "HTTPS source repository URL without credentials. Requires sourceLicense and sourcePermission: true."
        },
        sourceLicense: {
          type: "string",
          maxLength: 100,
          description: "Free text license name, for example MIT. Requires sourceUrl and sourcePermission: true."
        },
        sourcePermission: {
          type: "boolean",
          description: "Set true only when you have permission to publish the source link with the specified license."
        },
        kitId: { type: "string", enum: starterKits.map((kit) => kit.id) }
      }
    },
    coverPath: {
      type: "string",
      description: "Release-relative PNG, JPEG, WebP, or SVG path. Input up to 1 MiB; SpawnKit optimizes it to WebP.",
      maxLength: 200
    },
    trailerPath: {
      type: "string",
      description:
        "Optional release-relative MP4 or WebM path, up to 2 MiB and 60 seconds. SpawnKit creates a silent preview from the first eight seconds; start on gameplay.",
      maxLength: 200
    }
  }
}
// Original vector artwork keeps generated projects portable and editable without a binary writer.
export const defaultCover = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#161324"/><stop offset="1" stop-color="#302047"/></linearGradient><linearGradient id="pad" x2="0" y2="1"><stop stop-color="#d5bfff"/><stop offset="1" stop-color="#9b79e0"/></linearGradient><radialGradient id="light"><stop stop-color="#b397ef" stop-opacity=".3"/><stop offset="1" stop-color="#b397ef" stop-opacity="0"/></radialGradient></defs>
<path fill="url(#bg)" d="M0 0h1280v720H0z"/><ellipse cx="640" cy="360" rx="520" ry="340" fill="url(#light)"/>
<g fill="none" stroke="#b397ef" opacity=".13"><path d="M0 120h1280M0 240h1280M0 360h1280M0 480h1280M0 600h1280M160 0v720M320 0v720M480 0v720M640 0v720M800 0v720M960 0v720M1120 0v720"/><circle cx="640" cy="340" r="240"/><circle cx="640" cy="340" r="280"/></g>
<ellipse cx="640" cy="497" rx="207" ry="28" fill="#100d19" opacity=".5"/>
<path d="M515 225h250q48 0 65 61l36 134q14 61-33 63-27 0-58-50l-15-25H520l-15 25q-31 50-58 50-47-2-33-63l36-134q17-61 65-61z" fill="url(#pad)" stroke="#e5d8ff" stroke-width="4"/>
<g fill="#302047"><rect x="490" y="300" width="85" height="25" rx="7"/><rect x="520" y="270" width="25" height="85" rx="7"/><rect x="610" y="345" width="25" height="9" rx="4"/><rect x="647" y="345" width="25" height="9" rx="4"/></g>
<circle cx="746" cy="291" r="15" fill="#f4c97f"/><circle cx="781" cy="325" r="15" fill="#87e4d3"/><circle cx="712" cy="325" r="15" fill="#b7a0eb"/><circle cx="746" cy="359" r="15" fill="#ec9fbe"/>
<g fill="#ceb7ff"><path d="m320 215 9 24 24 9-24 9-9 24-9-24-24-9 24-9z"/><path d="m938 425 7 18 18 7-18 7-7 18-7-18-18-7 18-7z"/><circle cx="918" cy="204" r="6"/><circle cx="353" cy="466" r="5"/></g>
<text x="640" y="582" fill="#e5d8ff" font-family="system-ui,sans-serif" font-size="24" letter-spacing="6" text-anchor="middle">MADE WITH SPAWNKIT</text></svg>\n`
