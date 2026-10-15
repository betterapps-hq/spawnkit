export { hostingRegions, hostingPlans, hostingSystems } from "./hosting-catalog"
export const templates = [
  {
    id: "pixi",
    name: "PixiJS",
    dimension: "2d",
    description: "Fast 2D graphics for sprite-based games, with freedom to choose your game systems.",
    renderer: "pixi",
    modules: ["base", "pixi"],
    status: "available"
  },
  {
    id: "phaser",
    name: "Phaser",
    dimension: "2d",
    description: "A complete 2D game engine with scenes, input, animation, and built-in physics options.",
    renderer: "phaser",
    modules: ["base", "phaser"],
    status: "available"
  },
  {
    id: "babylon",
    name: "Babylon.js",
    dimension: "3d",
    description: "A complete 3D engine with rendering, cameras, animation, and game development tools.",
    renderer: "babylon",
    modules: ["base", "babylon"],
    status: "available"
  },
  {
    id: "three",
    name: "Three.js",
    dimension: "3d",
    description: "Flexible 3D rendering for custom game worlds, with your choice of physics and game systems.",
    renderer: "three",
    modules: ["base", "three"],
    status: "available"
  }
] as const

export type TemplateId = (typeof templates)[number]["id"]
export type AddonId = "vitest" | "koota" | "bitecs" | "storybook" | "playwright"

export const physicsOptions = [
  { id: "none", name: "None", renderers: ["pixi", "phaser", "babylon", "three"] },
  { id: "rapier2d", name: "Rapier 2D", renderers: ["pixi"] },
  { id: "arcade", name: "Arcade Physics", renderers: ["phaser"] },
  { id: "matter", name: "Matter.js", renderers: ["phaser"] },
  { id: "havok", name: "Havok", renderers: ["babylon"] },
  { id: "rapier3d", name: "Rapier 3D", renderers: ["three"] }
] as const
export const uiOptions = [
  { id: "none", name: "None", renderers: ["pixi", "phaser", "babylon", "three"] },
  { id: "html", name: "HTML / CSS", renderers: ["pixi", "phaser", "babylon", "three"] },
  { id: "pixi", name: "Pixi UI", renderers: ["pixi"] },
  { id: "babylon", name: "Babylon GUI", renderers: ["babylon"] }
] as const
export const telemetryOptions = [
  { id: "none", name: "None" },
  {
    id: "platform",
    name: "SpawnKit telemetry",
    description: "Events, errors and logs in your project dashboard. Requires setup and consent."
  },
  { id: "sentry", name: "Sentry", description: "Error reporting with your own DSN." }
] as const
export type PhysicsId = (typeof physicsOptions)[number]["id"]
export type UiId = (typeof uiOptions)[number]["id"]
export type TelemetryId = (typeof telemetryOptions)[number]["id"]

export const addons = [
  { id: "playwright", name: "Playwright", description: "Test your game in a real browser." },
  { id: "storybook", name: "Storybook", description: "Develop game interface components in isolation." },
  { id: "vitest", name: "Vitest", description: "Unit tests for your game logic." },
  { id: "koota", name: "Koota", description: "Run movement through a trait-based entity simulation." },
  { id: "bitecs", name: "bitECS", description: "Run movement through an entity/component simulation." }
] as const

export const plannedArchitectureAddons = [
  { id: "xstate", name: "XState", description: "State machines for game flow and transitions." },
  { id: "zustand", name: "Zustand", description: "Shared state for scores, settings, and progression." }
] as const

export function isTemplateId(value: string): value is TemplateId {
  return templates.some((template) => template.id === value)
}

export function isAddonId(value: string): value is AddonId {
  return addons.some((addon) => addon.id === value)
}

export function validateProjectName(name: string): string | undefined {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) {
    return "Use 1–64 lowercase letters, numbers, and single hyphens, starting with a letter."
  }
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(name)) {
    return "Choose a name that is not reserved by Windows."
  }
  return undefined
}

// Service inventory verified against https://docs.colyseus.io/database/services and /auth/module, 2026-10-13.
export const colyseusServices = [
  {
    id: "auth",
    name: "Player authentication",
    description: "Player accounts and sign-in.",
    why: "Use it to identify players across sessions.",
    source: "https://docs.colyseus.io/auth/module"
  },
  {
    id: "saves",
    name: "Cloud saves",
    description: "Versioned player saves and save slots.",
    why: "Use it to restore progress after a player returns.",
    source: "https://docs.colyseus.io/database/services#cloud-saves"
  },
  {
    id: "leaderboards",
    name: "Leaderboards",
    description: "Scores, rankings, and seasons.",
    why: "Use it to compare player performance.",
    source: "https://docs.colyseus.io/database/services#leaderboards"
  },
  {
    id: "configs",
    name: "Live configuration",
    description: "Validated settings updated at runtime.",
    why: "Use it to adjust game settings without rebuilding.",
    source: "https://docs.colyseus.io/database/services#live-configs"
  },
  {
    id: "analytics",
    name: "Game analytics",
    description: "Game and player event records.",
    why: "Use it to understand game activity. Hosting telemetry is separate.",
    source: "https://docs.colyseus.io/database/services#analytics-moderation--notes"
  },
  {
    id: "moderation",
    name: "Moderation",
    description: "Player roles and scoped permissions.",
    why: "Use it to control moderator access to game data.",
    source: "https://docs.colyseus.io/database/services#analytics-moderation--notes"
  },
  {
    id: "notes",
    name: "Player notes",
    description: "Internal notes associated with players.",
    why: "Use it to keep support context for your team.",
    source: "https://docs.colyseus.io/database/services#analytics-moderation--notes"
  }
] as const
export type ServiceId = (typeof colyseusServices)[number]["id"]

export const platformOptions = [
  { id: "web", name: "Web", disabled: false },
  { id: "desktop", name: "Desktop (cross-platform)", disabled: true },
  { id: "mobile", name: "Mobile", disabled: true }
] as const
