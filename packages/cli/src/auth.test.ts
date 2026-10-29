import { createHash } from "node:crypto"
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { authenticationStatus, login, logout, readCredentials, trustedUrl } from "./auth"

const nativeFetch = globalThis.fetch
let directory: string
let challenge: string
let exchanged: URLSearchParams
let callbackResult: Promise<void>
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "spawn-auth-"))
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/cli/auth"))
        return Response.json({ clientId: "client", issuer: "https://identity.example" })
      if (url.includes(".well-known"))
        return Response.json({
          issuer: "https://identity.example",
          authorization_endpoint: "https://identity.example/authorize",
          token_endpoint: "https://identity.example/token"
        })
      const params = init!.body as URLSearchParams
      exchanged = params
      return Response.json({ access_token: "private-token", token_type: "Bearer", expires_in: 3600 })
    })
  )
})
afterEach(async () => {
  vi.unstubAllGlobals()
  if (dirname(directory) !== tmpdir() || !directory.includes("spawn-auth-")) throw new Error("Unsafe fixture cleanup")
  await rm(directory, { recursive: true, force: true })
})
it("uses the website, rejects a wrong state, exchanges PKCE and clears local credentials", async () => {
  const result = await login(
    "https://spawn.example",
    (link) => {
      const url = new URL(link)
      expect(url.origin + url.pathname).toBe("https://spawn.example/cli/login")
      challenge = url.searchParams.get("code_challenge")!
      callbackResult = (async () => {
        const invalid = await nativeFetch("http://127.0.0.1:43819/callback?state=wrong&code=test-code")
        expect(invalid.status).toBe(400)
        await nativeFetch(`http://127.0.0.1:43819/callback?state=${url.searchParams.get("state")}&code=test-code`)
      })()
    },
    directory
  )
  await callbackResult
  expect(result.status).toBe("signed-in")
  const saved = await readFile(join(directory, "credentials.json"), "utf8")
  expect(saved.includes("private-token")).toBe(process.platform !== "win32")
  expect(await readCredentials(directory)).toEqual({ site: "https://spawn.example", accessToken: "private-token" })
  expect(createHash("sha256").update(exchanged.get("code_verifier")!).digest("base64url")).toBe(challenge)
  expect(exchanged.get("code")).toBe("test-code")
  expect(await logout(directory)).toBe("signed-out")
  expect(await logout(directory)).toBe("already-signed-out")
})
it("reports missing, valid and expired local auth without exposing credentials or fetching", async () => {
  expect((await authenticationStatus(directory)).status).toBe("sign-in-required")
  await writeFile(
    join(directory, "credentials.json"),
    JSON.stringify({
      version: 1,
      site: "https://spawn.example",
      accessToken: "never-output-this",
      expiresAt: Date.now() + 60000
    })
  )
  expect(await authenticationStatus(directory)).toEqual({
    status: "signed-in",
    site: "https://spawn.example",
    checked: "local",
    serverVerified: false
  })
  await writeFile(
    join(directory, "credentials.json"),
    JSON.stringify({ version: 1, site: "https://spawn.example", accessToken: "never-output-this", expiresAt: 1 })
  )
  expect((await authenticationStatus(directory)).status).toBe("sign-in-required")
  expect(fetch).not.toHaveBeenCalled()
})
it("handles denied access without saving credentials", async () => {
  const pending = login(
    "https://spawn.example",
    (link) => {
      callbackResult = nativeFetch(
        `http://127.0.0.1:43819/callback?state=${new URL(link).searchParams.get("state")}&error=access_denied`
      ).then(() => {})
    },
    directory
  )
  await expect(pending).rejects.toThrow("declined")
  await callbackResult
  expect(await readdir(directory)).toEqual([])
})
it("rejects insecure remote websites and embedded credentials", () => {
  expect(() => trustedUrl("http://example.com", true)).toThrow("HTTPS")
  expect(() => trustedUrl("https://user:password@example.com")).toThrow("HTTPS")
  expect(trustedUrl("http://127.0.0.1:5173", true).hostname).toBe("127.0.0.1")
})

it("rejects missing, expired and malformed platform credentials without echoing values", async () => {
  await expect(readCredentials(directory)).rejects.toThrow("Sign in first")
  await writeFile(
    join(directory, "credentials.json"),
    JSON.stringify({ version: 1, site: "https://spawn.example", accessToken: "fixture-private", expiresAt: 1 })
  )
  await expect(readCredentials(directory)).rejects.toThrow("expired or unreadable")
  await writeFile(join(directory, "credentials.json"), "fixture-private")
  await expect(readCredentials(directory)).rejects.toThrow("expired or unreadable")
})
