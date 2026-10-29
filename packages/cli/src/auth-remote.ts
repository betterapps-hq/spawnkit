import { access } from "node:fs/promises"
import { join } from "node:path"
import { credentialDirectory, saveCredentials, trustedUrl, type StoredCredentials } from "./auth"

const claimGrant = "urn:workos:agent-auth:grant-type:claim"
const assertionGrant = "urn:ietf:params:oauth:grant-type:jwt-bearer"
function issuer(site: string) {
  const url = trustedUrl(site)
  url.hostname = `api.${url.hostname}`
  return url.origin
}
async function exchange(site: string, form: URLSearchParams) {
  const response = await fetch(`${issuer(site)}/oauth2/token`, {
    method: "POST",
    body: form,
    redirect: "error",
    signal: AbortSignal.timeout(15_000)
  })
  const value = (await response.json()) as Record<string, unknown>
  return { ok: response.ok, value }
}
function validToken(value: Record<string, unknown>) {
  if (
    typeof value.access_token !== "string" ||
    !value.access_token.startsWith("sat_") ||
    value.token_type !== "Bearer" ||
    typeof value.expires_in !== "number" ||
    !Number.isFinite(value.expires_in) ||
    value.expires_in <= 0 ||
    value.expires_in > 3600
  )
    throw new Error("Invalid agent token response. No credentials were saved.")
  return { accessToken: value.access_token, expiresAt: Date.now() + value.expires_in * 1000 }
}
export async function refreshRemote(data: StoredCredentials): Promise<StoredCredentials> {
  if (!data.remote || data.remote.expiresAt <= Date.now())
    throw new Error("Agent access expired. Start spawn login --remote again.")
  const { ok, value } = await exchange(
    data.site,
    new URLSearchParams({
      grant_type: assertionGrant,
      assertion: data.remote.assertion,
      resource: `${data.site}/api/platform/v1`
    })
  )
  if (!ok) throw new Error("Agent access expired or was revoked. Start spawn login --remote again.")
  return { ...data, ...validToken(value) }
}
export async function revokeRemote(data: StoredCredentials) {
  const response = await fetch(`${issuer(data.site)}/oauth2/revoke`, {
    method: "POST",
    body: new URLSearchParams({ token: data.remote!.assertion, token_type_hint: "identity_assertion" }),
    redirect: "error",
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok)
    throw new Error(
      "Could not revoke agent access. Credentials were kept so you can retry logout. You can also revoke access at /cli/access."
    )
}
export async function remoteLogin(
  site: string,
  email: string,
  projectId: string,
  notify: (request: { url: string; code: string; expiresIn: number }) => void,
  directory = credentialDirectory(),
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
) {
  const origin = trustedUrl(site).origin
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error("Use --email with your SpawnKit account email.")
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(projectId))
    throw new Error("Use --project with an existing project ID from the dashboard.")
  try {
    await access(join(directory, "credentials.json"))
    throw new Error("Already signed in. Run spawn logout before connecting another session.")
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
  }
  const response = await fetch(`${issuer(origin)}/agent/identity`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "service_auth", login_hint: email, project_id: projectId }),
    redirect: "error",
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok)
    throw new Error(
      `Could not start agent authorization (${response.status}). Check your email and project ID, or retry later.`
    )
  const value = (await response.json()) as {
    claim_token?: string
    registration_id?: string
    claim?: { verification_uri: string; user_code: string; expires_in: number; interval: number }
  }
  const claim = value.claim
  if (
    !claim ||
    typeof value.claim_token !== "string" ||
    !/^reg_[a-f0-9-]{36}$/.test(value.registration_id ?? "") ||
    !/^\d{6}$/.test(claim.user_code) ||
    claim.expires_in <= 0 ||
    claim.expires_in > 600 ||
    !Number.isFinite(claim.expires_in) ||
    !Number.isFinite(claim.interval) ||
    claim.interval < 5 ||
    claim.interval > 60
  )
    throw new Error("Invalid agent authorization response.")
  const url = trustedUrl(claim.verification_uri)
  if (url.origin !== origin || url.pathname !== "/cli/claim")
    throw new Error("Invalid claim website. Authorization stopped.")
  notify({ url: url.href, code: claim.user_code, expiresIn: claim.expires_in })
  let interval = claim.interval * 1000
  const deadline = Date.now() + claim.expires_in * 1000
  while (Date.now() < deadline) {
    await sleep(interval)
    const result = await exchange(
      origin,
      new URLSearchParams({ grant_type: claimGrant, claim_token: value.claim_token })
    )
    if (!result.ok) {
      if (result.value.error === "authorization_pending") continue
      if (result.value.error === "slow_down") {
        interval += 5000
        continue
      }
      throw new Error(
        result.value.error === "access_denied"
          ? "Agent access was declined."
          : "Agent authorization expired or failed. Run spawn login --remote again."
      )
    }
    const token = validToken(result.value)
    const expiresAt = Date.parse(String(result.value.assertion_expires))
    if (
      typeof result.value.identity_assertion !== "string" ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now() ||
      expiresAt > Date.now() + 3_660_000
    )
      throw new Error("Invalid agent assertion response.")
    const data: StoredCredentials = {
      version: 1,
      site: origin,
      ...token,
      remote: {
        registrationId: value.registration_id!,
        assertion: result.value.identity_assertion,
        expiresAt,
        projectId
      }
    }
    try {
      await saveCredentials(data, directory)
    } catch (error) {
      await revokeRemote(data).catch(() => undefined)
      throw error
    }
    return {
      status: "signed-in",
      site: origin,
      projectId,
      expiresAt: new Date(expiresAt).toISOString(),
      scope: "project"
    }
  }
  throw new Error("Agent authorization timed out. Start again with spawn login --remote.")
}
