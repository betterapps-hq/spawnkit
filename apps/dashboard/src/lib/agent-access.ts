import { auth } from "@clerk/tanstack-react-start/server"
import { createServerFn } from "@tanstack/react-start"

export type ClaimDetails = {
  projectId: string
  projectName: string
  scopes: string[]
  expiresAt: number
  durationSeconds: number
}
export type AgentGrant = { id: string; projectId: string; scopes: string; expiresAt: number }

async function request(path: string, method = "GET", body?: unknown) {
  const session = await auth()
  if (!session.userId) throw new Error("Sign in to manage agent access.")
  const origin = process.env.SPAWN_CONTROL_API_URL
  if (!origin) throw new Error("The project service is not configured.")
  const response = await fetch(`${origin}/api/platform/v1/agent${path}`, {
    method,
    headers: { authorization: `Bearer ${await session.getToken()}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000)
  })
  if (response.status >= 300 && response.status < 400)
    throw new Error("The project service returned an unexpected redirect. Try again later.")
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message ?? "Could not complete this access request.")
  return data
}
function claimToken(value: unknown) {
  if (typeof value !== "string" || !/^cla_[A-Za-z0-9_-]{43}$/.test(value))
    throw new Error("Start a new access request from your agent.")
  return value
}
export const getAgentClaim = createServerFn({ method: "GET" })
  .validator(claimToken)
  .handler(async ({ data }): Promise<ClaimDetails> => request(`/claim?claim_attempt_token=${encodeURIComponent(data)}`))
export const decideAgentClaim = createServerFn({ method: "POST" })
  .validator((value: { token: string; decision: "approve" | "deny"; code: string }) => {
    claimToken(value.token)
    if (!["approve", "deny"].includes(value.decision)) throw new Error("Choose approve or deny.")
    return value
  })
  .handler(async ({ data }): Promise<{ status: string }> =>
    request("/claim", "POST", { claim_attempt_token: data.token, decision: data.decision, user_code: data.code })
  )
export const getAgentGrants = createServerFn({ method: "GET" }).handler(async (): Promise<{ grants: AgentGrant[] }> =>
  request("/grants")
)
export const revokeAgentGrant = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (id !== "all" && !/^reg_[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid agent access.")
    return id
  })
  .handler(({ data }) => request(`/grants${data === "all" ? "" : `/${data}`}`, "DELETE"))
