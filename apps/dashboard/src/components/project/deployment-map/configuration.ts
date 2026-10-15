export type DeploymentPreset = "multiplayer" | "frontend" | "frontend-assets" | "neon" | "multiplayer-neon" | "global"
export type DeploymentConfiguration = {
  servers: boolean
  api: boolean
  database: "managed" | "neon" | null
  assets: boolean
}
export type ResourceSettings = { regions: Record<string, number>; size: string; database: string }
export const configurations: Record<DeploymentPreset, DeploymentConfiguration> = {
  multiplayer: { servers: true, api: false, database: "managed", assets: true },
  frontend: { servers: false, api: false, database: null, assets: false },
  "frontend-assets": { servers: false, api: false, database: null, assets: true },
  neon: { servers: false, api: true, database: "neon", assets: true },
  "multiplayer-neon": { servers: true, api: false, database: "neon", assets: true },
  global: { servers: true, api: false, database: "neon", assets: true }
}
export function initialResources(production: boolean, preset: DeploymentPreset = "multiplayer"): ResourceSettings {
  const config = configurations[preset]
  return {
    regions: !config.servers
      ? {}
      : production
        ? preset === "global"
          ? { "Los Angeles": 3, Frankfurt: 3, Singapore: 2, Tokyo: 2, Sydney: 2, London: 2, "São Paulo": 2, Toronto: 2 }
          : { "Los Angeles": 2, Frankfurt: 2, Singapore: 2 }
        : { Singapore: 1 },
    size: "2 vCPU · 4 GB",
    database: config.database === "neon" ? "0.5 CU" : "1 vCPU · 2 GB"
  }
}
