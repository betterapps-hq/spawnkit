import type { EnvironmentName } from "@/components/project/model"

export interface DomainConfiguration {
  hostname: string
  environment: EnvironmentName
}

export function normalizeHostname(input: unknown): string {
  const value = typeof input === "string" ? input.trim().toLowerCase().replace(/\.$/, "") : ""
  const labels = value.split(".")
  if (
    value.length > 253 ||
    labels.length < 2 ||
    !labels.every((part) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part)) ||
    !/^[a-z]{2,63}$/.test(labels.at(-1) ?? "")
  )
    throw new Error("Enter a hostname such as play.yourgame.com, without https://, a path, or a wildcard.")
  return value
}

export function readDomainConfigurations(input: unknown): DomainConfiguration[] {
  if (input === undefined) return []
  if (!Array.isArray(input)) throw new Error("Invalid domain configuration.")
  const seen = new Set<string>()
  return input.map((item: unknown) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("hostname" in item) ||
      !("environment" in item) ||
      (item.environment !== "production" && item.environment !== "sandbox")
    )
      throw new Error("Invalid domain configuration.")
    const hostname = normalizeHostname(item.hostname)
    if (seen.has(hostname)) throw new Error("This domain is already configured.")
    seen.add(hostname)
    return { hostname, environment: item.environment }
  })
}
