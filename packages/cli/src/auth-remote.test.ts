import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { authenticationStatus, logout, readCredentials, saveCredentials, storedCredentials } from "./auth"
import { remoteLogin } from "./auth-remote"

const id = "reg_11111111-1111-4111-8111-111111111111"
let directory: string
let poll: ReturnType<typeof vi.fn<() => Response>>
let transport: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Response | Promise<Response>>>
const token = () => ({
  access_token: "sat_private-token",
  token_type: "Bearer",
  expires_in: 900,
  identity_assertion: "private-assertion",
  assertion_expires: new Date(Date.now() + 3600_000).toISOString()
})
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "spawn-remote-auth-"))
  poll = vi.fn<() => Response>().mockImplementation(() => Response.json(token()))
  transport = vi
    .fn<(url: string, init?: RequestInit) => Response | Promise<Response>>()
    .mockImplementation((url: string) => {
      if (url.endsWith("/agent/identity"))
        return Response.json({
          registration_id: id,
          claim_token: "private-claim",
          claim: {
            user_code: "123456",
            expires_in: 600,
            interval: 5,
            verification_uri: `https://spawn.example/cli/claim?claim_attempt_token=cla_${"a".repeat(43)}`
          }
        })
      if (url.endsWith("/oauth2/revoke")) return new Response(null, { status: 200 })
      return poll()
    })
  vi.stubGlobal("fetch", transport)
})
afterEach(async () => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  if (dirname(directory) !== tmpdir() || !directory.includes("spawn-remote-auth-"))
    throw new Error("Unsafe fixture cleanup")
  await rm(directory, { recursive: true, force: true })
})
const run = (notify = vi.fn<() => void>(), sleep = async (_ms: number) => {}) =>
  remoteLogin("https://spawn.example", "user@example.com", "project", notify, directory, sleep)
it("polls without a localhost callback and protects credentials without printing them", async () => {
  const notify = vi.fn<() => void>()
  const result = await run(notify)
  expect(result).toMatchObject({ status: "signed-in", projectId: "project", scope: "project" })
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ code: "123456", expiresIn: 600 }))
  expect(JSON.stringify([result, notify.mock.calls])).not.toMatch(/private-token|private-assertion|private-claim/)
  expect(await readCredentials(directory)).toEqual({ site: "https://spawn.example", accessToken: "sat_private-token" })
  const content = await readFile(join(directory, "credentials.json"), "utf8")
  expect(content.includes("private-token")).toBe(process.platform !== "win32")
  expect(transport.mock.calls.every((call) => String(call[0]).startsWith("https://api.spawn.example/"))).toBe(true)
})
it("honors pending and slow_down responses", async () => {
  poll
    .mockImplementationOnce(() => Response.json({ error: "authorization_pending" }, { status: 400 }))
    .mockImplementationOnce(() => Response.json({ error: "slow_down" }, { status: 400 }))
  const waits: number[] = []
  await run(vi.fn<() => void>(), async (ms) => {
    waits.push(ms)
  })
  expect(waits).toEqual([5000, 5000, 10000])
})
it("denial saves no credentials", async () => {
  poll.mockImplementation(() => Response.json({ error: "access_denied" }, { status: 400 }))
  await expect(run()).rejects.toThrow("declined")
  await expect(readCredentials(directory)).rejects.toThrow("Sign in")
})
it("never replaces an existing credential file", async () => {
  await writeFile(join(directory, "credentials.json"), "existing")
  await expect(run()).rejects.toThrow("Already signed in")
  expect(await readFile(join(directory, "credentials.json"), "utf8")).toBe("existing")
  expect(transport).not.toHaveBeenCalled()
})
it("refreshes expired remote tokens while status stays local", async () => {
  await run()
  const stored = await storedCredentials(directory)
  await saveCredentials({ ...stored, expiresAt: 1 }, directory, true)
  transport.mockClear()
  expect((await authenticationStatus(directory)).status).toBe("sign-in-required")
  expect(transport).not.toHaveBeenCalled()
  expect((await readCredentials(directory)).accessToken).toBe("sat_private-token")
  expect(transport).toHaveBeenCalledTimes(1)
  expect((transport.mock.calls[0]![1] as RequestInit).body?.toString()).toContain("jwt-bearer")
})
it("revokes the grant on logout and retains credentials if the server cannot be reached", async () => {
  await run()
  transport.mockRejectedValueOnce(new Error("offline"))
  await expect(logout(directory)).rejects.toThrow("offline")
  expect((await storedCredentials(directory)).remote?.registrationId).toBe(id)
  expect(await logout(directory)).toBe("signed-out")
  const revoke = transport.mock.calls.findLast((call) => String(call[0]).endsWith("/oauth2/revoke"))!
  expect((revoke[1] as RequestInit).body?.toString()).toContain("token_type_hint=identity_assertion")
})
it("rejects a claim link on another website", async () => {
  transport.mockResolvedValueOnce(
    Response.json({
      registration_id: id,
      claim_token: "private-claim",
      claim: { user_code: "123456", expires_in: 600, interval: 5, verification_uri: "https://evil.example/cli/claim" }
    })
  )
  await expect(run()).rejects.toThrow("Invalid claim website")
})
it("rejects invalid input before contacting the service", async () => {
  await expect(
    remoteLogin("https://spawn.example", "invalid", "project", vi.fn<() => void>(), directory)
  ).rejects.toThrow("--email")
  await expect(
    remoteLogin("https://spawn.example", "user@example.com", "../other", vi.fn<() => void>(), directory)
  ).rejects.toThrow("--project")
  expect(transport).not.toHaveBeenCalled()
})
