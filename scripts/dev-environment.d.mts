export const root: string
export function developmentEnvironment(): {
  root: string
  app: string
  api: string
  stories: string
  telemetry: string
  e2e: string
  "e2e-stories": string
}
export function testOrigins(): { app: string; stories: string }
