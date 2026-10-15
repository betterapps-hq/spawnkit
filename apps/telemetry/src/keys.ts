import { requireValue, TelemetryError } from "./http"
export interface KeyScope {
  project: string
  environment: "production" | "sandbox"
  generation: string
}
export function validProject(project: string) {
  requireValue(/^[A-Za-z0-9_-]{1,128}$/.test(project), "Invalid project.")
}
export function validEnvironment(environment: string): asserts environment is KeyScope["environment"] {
  requireValue(environment === "production" || environment === "sandbox", "Invalid environment.")
}
async function signingKey(secret: string) {
  if (!secret || secret.length < 32) throw new Error("Telemetry signing is not configured")
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify"
  ])
}
function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
export async function signScope(scope: KeyScope, secret: string) {
  const payload = `${scope.project}.${scope.environment}.${scope.generation}`
  return `${payload}.${hex(await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(payload)))}`
}
export async function verifyScope(token: string, secret: string): Promise<KeyScope> {
  if (token.length > 512) throw new TelemetryError(401, "Invalid write key.")
  const match = /^([A-Za-z0-9_-]{1,128})\.(production|sandbox)\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token)
  if (!match) throw new TelemetryError(401, "Invalid write key.")
  const project = match[1]!
  const environment = match[2]!
  validEnvironment(environment)
  const generation = match[3]!
  const signature = match[4]!
  const bytes = Uint8Array.from(signature.match(/../g)!, (part) => Number.parseInt(part, 16))
  if (
    !(await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      bytes,
      new TextEncoder().encode(`${project}.${environment}.${generation}`)
    ))
  )
    throw new TelemetryError(401, "Invalid write key.")
  return { project, environment, generation }
}
