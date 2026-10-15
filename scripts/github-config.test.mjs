import assert from "node:assert/strict"
import { generateKeyPairSync } from "node:crypto"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { test } from "node:test"
import { githubConfiguration } from "./github-config.mjs"

const work = resolve(import.meta.dirname, "../work")
mkdirSync(work, { recursive: true })
const privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({
  type: "pkcs8",
  format: "pem"
})

function fixture(t, enabled = true) {
  const root = mkdtempSync(resolve(work, "github-config-test-"))
  assert.equal(dirname(root), work)
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(resolve(root, "deploy"))
  writeFileSync(
    resolve(root, "deploy/github.json"),
    JSON.stringify({ production: { enabled }, staging: { enabled }, local: { enabled } })
  )
  return root
}

function credentials(root, environment, key = privateKey) {
  writeFileSync(
    resolve(root, `deploy/.env.github.${environment}`),
    `GITHUB_APP_ID=1234\nGITHUB_CLIENT_ID=test-client\nGITHUB_CLIENT_SECRET=test-secret\nGITHUB_WEBHOOK_SECRET=${"x".repeat(64)}\nGITHUB_APP_PRIVATE_KEY="${key}"\nUNRELATED_SECRET=must-not-forward\n`
  )
}

test("disabled GitHub needs no secrets and never forwards credentials", (t) => {
  const root = fixture(t, false)
  credentials(root, "production")
  assert.deepEqual(githubConfiguration(root, "production"), { enabled: false, secrets: {} })
})

test("enabled environments fail closed instead of borrowing another environment's credentials", (t) => {
  const root = fixture(t)
  credentials(root, "staging")
  assert.throws(() => githubConfiguration(root, "production"), /production could not be read/)
  assert.throws(() => githubConfiguration(root, "local"), /local could not be read/)
  assert.throws(() => githubConfiguration(root, ".."), /Invalid GitHub environment/)
})

test("multiline PEM credentials survive parsing and unrelated secrets are excluded", (t) => {
  const root = fixture(t)
  credentials(root, "production")
  const result = githubConfiguration(root, "production")
  assert.equal(result.enabled, true)
  assert.equal(result.secrets.GITHUB_APP_PRIVATE_KEY, privateKey)
  assert.equal(Object.keys(result.secrets).length, 5)
  assert.equal(result.secrets.UNRELATED_SECRET, undefined)
})

test("invalid or partial credentials fail without including secret values in errors", (t) => {
  const root = fixture(t)
  credentials(root, "production", "private-invalid-value")
  assert.throws(() => githubConfiguration(root, "production"), {
    message: "GITHUB_APP_PRIVATE_KEY must be a valid RSA private key in PEM format"
  })
  writeFileSync(resolve(root, "deploy/.env.github.production"), "GITHUB_APP_ID=1234\n")
  assert.throws(() => githubConfiguration(root, "production"), /Missing production GitHub credentials/)
})
