export const root: string
export function checkoutName(directory?: string): string
export function developmentEnvironment(name?: string): {
  root: string
  name: string
  app: string
  api: string
  stories: string
  telemetry: string
  e2e: string
  "e2e-stories": string
}
export function testOrigins(): { app: string; stories: string }
