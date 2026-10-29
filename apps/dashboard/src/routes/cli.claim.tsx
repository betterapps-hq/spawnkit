import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { ClerkAuth } from "@/components/clerk-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { decideAgentClaim, getAgentClaim, type ClaimDetails } from "@/lib/agent-access"
import { getSession } from "@/lib/server"

export const Route = createFileRoute("/cli/claim")({
  validateSearch: (search: Record<string, unknown>) => ({
    claim_attempt_token: typeof search.claim_attempt_token === "string" ? search.claim_attempt_token : ""
  }),
  loader: () => getSession(),
  head: () => ({
    meta: [
      { title: "Approve agent access · SpawnKit" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" }
    ]
  }),
  headers: () => ({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY" }),
  component: AgentClaim
})
function AgentClaim() {
  const session = Route.useLoaderData()
  const { claim_attempt_token: token } = Route.useSearch()
  const [details, setDetails] = useState<ClaimDetails | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!session.user) {
      sessionStorage.setItem("spawn-cli-return", `/cli/claim?claim_attempt_token=${encodeURIComponent(token)}`)
      return
    }
    sessionStorage.removeItem("spawn-cli-return")
    let active = true
    void getAgentClaim({ data: token })
      .then((value) => {
        if (active) setDetails(value)
      })
      .catch((reason) => {
        if (active) setError(reason.message)
      })
    return () => {
      active = false
    }
  }, [session.user, token])
  async function decide(decision: "approve" | "deny") {
    setBusy(true)
    setError("")
    try {
      const result = await decideAgentClaim({ data: { token, code, decision } })
      setStatus(result.status)
      window.history.replaceState(null, "", "/cli/claim")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete this request.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <Link to="/" className="text-lg font-semibold">
        SpawnKit
      </Link>
      <section className="space-y-6 rounded-xl border bg-card p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Approve agent access</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Only approve a request you started. Your agent will receive access after you enter its code and confirm.
        </p>
        {!session.configured ? (
          <p>Sign-in is not configured.</p>
        ) : !session.user ? (
          <ClerkAuth />
        ) : status ? (
          <div aria-live="polite">
            <h2 className="text-lg font-semibold">{status === "approved" ? "Access approved" : "Request declined"}</h2>
            <p className="mt-2 text-sm">
              {status === "approved"
                ? "Return to your agent to continue. Access ends in one hour."
                : "No access was granted. You can close this page."}
            </p>
            <Link to="/cli/access" className="mt-4 inline-block underline">
              Manage agent access
            </Link>
          </div>
        ) : details ? (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              void decide("approve")
            }}
          >
            <dl className="space-y-3 rounded-lg border p-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Signed in as</dt>
                <dd className="mt-1 break-all font-medium">{session.user.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Project</dt>
                <dd className="mt-1 font-medium">{details.projectName}</dd>
                <dd className="mt-1 break-all font-mono text-xs text-muted-foreground">{details.projectId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Permissions</dt>
                <dd className="mt-1">
                  Read project details, releases, and build logs
                  {details.scopes.includes("deployments:write")
                    ? "; upload source, deploy, promote, and roll back releases in this project's environments."
                    : "."}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Access duration</dt>
                <dd className="mt-1">One hour. Revoke it at any time.</dd>
              </div>
            </dl>
            <p className="text-sm text-muted-foreground">
              Deployments may use your project's hosting and build allowance. Account settings, project deletion, other
              projects, and secrets are excluded.
            </p>
            <label htmlFor="agent-code" className="block space-y-2 text-sm font-medium">
              Code shown by your agent
              <Input
                id="agent-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="off"
                required
                placeholder="6-digit code"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy || code.length !== 6}>
                Approve access
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void decide("deny")}>
                Deny
              </Button>
            </div>
          </form>
        ) : !error ? (
          <output>Loading access request…</output>
        ) : null}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}
