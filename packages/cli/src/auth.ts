import { execFile } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { chmod, lstat, mkdir, readFile, link, unlink, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { homedir } from "node:os"
import { join } from "node:path"

const callback = "http://127.0.0.1:43819/callback"
async function protectCredentials(content: string) {
  if (process.platform !== "win32") return content
  const encrypted = await new Promise<string>((resolve, reject) => {
    const child = execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Add-Type -AssemblyName System.Security; $bytes = [Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser))"
      ],
      { windowsHide: true },
      (error, stdout) => {
        if (error) reject(new Error("Windows could not protect the login credentials. Nothing was saved."))
        else resolve(stdout.trim())
      }
    )
    child.stdin?.on("error", () => {})
    child.stdin?.end(content)
  })
  return JSON.stringify({ version: 1, protection: "windows-dpapi", data: encrypted }) + "\n"
}
export function trustedUrl(value: string, local = false) {
  const url = new URL(value)
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:" && url.hostname === "127.0.0.1"))
  )
    throw new Error("Use an HTTPS website URL (HTTP is supported only on 127.0.0.1 for local development).")
  return url
}
async function jsonRequest(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15_000) })
  if (response.status === 503 && new URL(url).pathname === "/api/cli/auth")
    throw new Error(
      "CLI sign-in is not configured on this website. Configure its Clerk public OAuth application (CLERK_OAUTH_CLIENT_ID and CLERK_OAUTH_ISSUER), then restart the website. For local setup, see docs/development.md."
    )
  if (!response.ok)
    throw new Error(
      `Authentication request failed (${response.status}). Check the website's CLI authentication configuration.`
    )
  return response.json() as Promise<Record<string, unknown>>
}
function credentialDirectory() {
  return join(homedir(), ".spawn")
}

async function credentialFile(directory: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  if ((await lstat(directory)).isSymbolicLink()) throw new Error("Credential directory must not be a symbolic link.")
  if (process.platform !== "win32") await chmod(directory, 0o700)
  const path = join(directory, "credentials.json")
  try {
    const info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink() || info.nlink > 1)
      throw new Error("Credentials must be a regular private file.")
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
  }
  return path
}

export async function logout(directory = credentialDirectory()) {
  const path = await credentialFile(directory)
  try {
    await unlink(path)
    return "signed-out"
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return "already-signed-out"
    throw error
  }
}

export async function readCredentials(directory = credentialDirectory()) {
  let content: string
  try {
    content = await readFile(await credentialFile(directory), "utf8")
  } catch {
    throw new Error("Sign in first with spawn login.")
  }
  try {
    let data = JSON.parse(content)
    if (data.protection === "windows-dpapi") {
      if (process.platform !== "win32" || typeof data.data !== "string") throw new Error("Unsupported credentials")
      const encrypted = data.data
      content = await new Promise<string>((resolve, reject) => {
        const child = execFile(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Add-Type -AssemblyName System.Security; $bytes = [Convert]::FromBase64String([Console]::In.ReadToEnd()); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser))"
          ],
          { windowsHide: true, timeout: 10_000 },
          (error, stdout) => {
            if (error) reject(new Error("Cannot decrypt credentials"))
            else resolve(stdout)
          }
        )
        child.stdin?.on("error", () => {})
        child.stdin?.end(encrypted)
      })
      data = JSON.parse(content)
    }
    if (
      data.version !== 1 ||
      typeof data.site !== "string" ||
      typeof data.accessToken !== "string" ||
      !data.accessToken ||
      typeof data.expiresAt !== "number" ||
      !Number.isFinite(data.expiresAt)
    )
      throw new Error("Invalid credentials")
    const site = trustedUrl(data.site, true).origin
    if (data.expiresAt <= Date.now()) throw new Error("Expired credentials")
    return { site, accessToken: data.accessToken as string }
  } catch {
    throw new Error("Login credentials are expired or unreadable. Run spawn logout, then spawn login.")
  }
}

export async function login(site: string, notify: (url: string) => void, directory = credentialDirectory()) {
  const origin = trustedUrl(site, true).origin
  const config = await jsonRequest(`${origin}/api/cli/auth`)
  if (typeof config.clientId !== "string" || !config.clientId || typeof config.issuer !== "string")
    throw new Error("CLI login is not configured on this website.")
  const issuer = trustedUrl(config.issuer).origin
  const metadata = await jsonRequest(`${issuer}/.well-known/oauth-authorization-server`)
  if (
    typeof metadata.authorization_endpoint !== "string" ||
    typeof metadata.token_endpoint !== "string" ||
    metadata.issuer !== issuer
  )
    throw new Error("Invalid authorization server metadata.")
  for (const endpoint of [metadata.authorization_endpoint, metadata.token_endpoint]) {
    if (trustedUrl(endpoint).origin !== issuer)
      throw new Error("Authentication endpoint does not match the configured issuer.")
  }
  const path = await credentialFile(directory)
  try {
    await readFile(path)
    throw new Error("Already signed in locally. Run spawn logout before switching accounts.")
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
  }
  const verifier = randomBytes(32).toString("base64url")
  const state = randomBytes(32).toString("base64url")
  const authorize = new URL("/cli/login", origin)
  authorize.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callback,
    response_type: "code",
    scope: "openid",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256"
  }).toString()
  let server: ReturnType<typeof createServer> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let interrupt: (() => void) | undefined
  try {
    const code = await new Promise<string>((resolve, reject) => {
      server = createServer((request, response) => {
        response.setHeader("Cache-Control", "no-store")
        response.setHeader("Content-Type", "text/plain; charset=utf-8")
        const url = new URL(request.url ?? "/", callback)
        if (
          request.method !== "GET" ||
          url.pathname !== "/callback" ||
          request.headers.host !== "127.0.0.1:43819" ||
          url.searchParams.get("state") !== state
        ) {
          response.writeHead(400).end("Invalid sign-in request. Return to your terminal.")
          return
        }
        if (url.searchParams.has("error")) {
          response.end("Authorization declined. You can close this tab.")
          reject(new Error("Sign-in was declined. No credentials were saved."))
        } else if (url.searchParams.get("code")) {
          response.end("Authorization received. Return to your terminal to finish signing in.")
          resolve(url.searchParams.get("code")!)
        } else response.writeHead(400).end("Missing authorization code.")
      })
      server.once("error", () =>
        reject(
          new Error("Cannot start the local sign-in callback on port 43819. Close another login session and retry.")
        )
      )
      server.listen(43819, "127.0.0.1", () => notify(authorize.href))
      timer = setTimeout(
        () => reject(new Error("Sign-in timed out after five minutes. Run spawn login again.")),
        300_000
      )
      interrupt = () => reject(new Error("Sign-in cancelled. No credentials were saved."))
      process.once("SIGINT", interrupt)
    })
    const token = await jsonRequest(metadata.token_endpoint, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code,
        redirect_uri: callback,
        code_verifier: verifier
      })
    })
    if (
      typeof token.access_token !== "string" ||
      typeof token.token_type !== "string" ||
      token.token_type.toLowerCase() !== "bearer" ||
      typeof token.expires_in !== "number" ||
      token.expires_in <= 0
    )
      throw new Error("Authorization server returned an invalid token. No credentials were saved.")
    const temporary = join(directory, `credentials-${randomBytes(8).toString("hex")}.tmp`)
    try {
      await writeFile(
        temporary,
        await protectCredentials(
          JSON.stringify({
            version: 1,
            site: origin,
            accessToken: token.access_token,
            expiresAt: Date.now() + token.expires_in * 1000
          }) + "\n"
        ),
        { flag: "wx", mode: 0o600 }
      )
      await link(temporary, path)
    } finally {
      await unlink(temporary).catch(() => undefined)
    }
    return { status: "signed-in", site: origin }
  } finally {
    if (timer) clearTimeout(timer)
    if (interrupt) process.removeListener("SIGINT", interrupt)
    server?.closeAllConnections()
    if (server?.listening) await new Promise<void>((resolve) => server!.close(() => resolve()))
  }
}
