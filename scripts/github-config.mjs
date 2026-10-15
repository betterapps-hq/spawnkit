import { createPrivateKey } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseEnv } from "node:util"

const secretNames = [
  "GITHUB_APP_ID",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_WEBHOOK_SECRET"
]

export function githubConfiguration(root, environment) {
  if (!["production", "staging", "local"].includes(environment)) throw new Error("Invalid GitHub environment")
  const registry = JSON.parse(readFileSync(resolve(root, "deploy/github.json"), "utf8"))
  if (typeof registry[environment]?.enabled !== "boolean") throw new Error("GitHub enablement must be explicit")
  if (!registry[environment].enabled) return { enabled: false, secrets: {} }
  let values
  try {
    values = parseEnv(readFileSync(resolve(root, `deploy/.env.github.${environment}`), "utf8"))
  } catch {
    throw new Error(`GitHub is enabled but deploy/.env.github.${environment} could not be read`)
  }
  const missing = secretNames.filter((name) => !values[name]?.trim())
  if (missing.length) throw new Error(`Missing ${environment} GitHub credentials: ${missing.join(", ")}`)
  if (!/^[1-9]\d*$/.test(values.GITHUB_APP_ID)) throw new Error("GITHUB_APP_ID must be a numeric App ID")
  if (values.GITHUB_WEBHOOK_SECRET.length < 32) throw new Error("Use a GitHub webhook secret of at least 32 characters")
  try {
    if (createPrivateKey(values.GITHUB_APP_PRIVATE_KEY).asymmetricKeyType !== "rsa") throw new Error()
  } catch {
    throw new Error("GITHUB_APP_PRIVATE_KEY must be a valid RSA private key in PEM format")
  }
  return { enabled: true, secrets: Object.fromEntries(secretNames.map((name) => [name, values[name]])) }
}
