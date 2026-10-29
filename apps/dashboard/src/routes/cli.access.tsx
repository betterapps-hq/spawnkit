import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { ClerkAuth } from "@/components/clerk-auth"
import { Button } from "@/components/ui/button"
import { getAgentGrants, revokeAgentGrant, type AgentGrant } from "@/lib/agent-access"
import { getSession } from "@/lib/server"

export const Route = createFileRoute("/cli/access")({
  loader: () => getSession(),
  head: () => ({ meta: [{ title: "Agent access · SpawnKit" }, { name: "robots", content: "noindex, nofollow" }] }),
  headers: () => ({ "Cache-Control": "no-store" }),
  component: AgentAccess
})
function AgentAccess() {
  const session = Route.useLoaderData()
  const [grants, setGrants] = useState<AgentGrant[] | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!session.user) {
      sessionStorage.setItem("spawn-cli-return", "/cli/access")
      return
    }
    sessionStorage.removeItem("spawn-cli-return")
    let active = true
    void getAgentGrants()
      .then((result) => {
        if (active) setGrants(result.grants)
      })
      .catch(() => {
        if (active) setError("Could not load agent access. Refresh to try again.")
      })
    return () => {
      active = false
    }
  }, [session.user])
  async function revoke(id: string) {
    setBusy(true)
    setError("")
    try {
      await revokeAgentGrant({ data: id })
      setGrants((current) => (id === "all" ? [] : (current?.filter((grant) => grant.id !== id) ?? null)))
    } catch {
      setError("Could not revoke access. Try again.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-6 py-12">
      <Link to="/dashboard" className="text-sm underline">
        Back to dashboard
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Agent access</h1>
      <p className="leading-7 text-muted-foreground">
        Manage the remote agents you approved. Revoking access prevents new API requests and token renewals. Builds
        already submitted continue.
      </p>
      {!session.configured ? (
        <p>Sign-in is not configured.</p>
      ) : !session.user ? (
        <ClerkAuth />
      ) : grants === null ? (
        <output>Loading agent access…</output>
      ) : grants.length === 0 ? (
        <output>You have no active agent access.</output>
      ) : (
        <>
          <div className="space-y-4">
            {grants.map((grant) => (
              <section key={grant.id} className="space-y-3 rounded-xl border p-5">
                <h2 className="break-all font-semibold">Project {grant.projectId}</h2>
                <p className="text-sm text-muted-foreground">
                  {grant.scopes.includes("deployments:write") ? "Read and publish" : "Read only"} · Expires{" "}
                  {new Date(grant.expiresAt * 1000).toLocaleString()}
                </p>
                <Button variant="outline" disabled={busy} onClick={() => void revoke(grant.id)}>
                  Revoke access
                </Button>
              </section>
            ))}
          </div>
          <Button variant="destructive" disabled={busy} onClick={() => void revoke("all")}>
            Revoke all agent access
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </main>
  )
}
