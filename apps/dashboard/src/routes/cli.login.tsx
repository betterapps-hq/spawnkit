import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Terminal } from "lucide-react"
import { useEffect, useState } from "react"
import { ClerkAuth } from "@/components/clerk-auth"
import { cliAuthConfiguration, validateCliRequest } from "@/lib/cli-auth"
import { getSession } from "@/lib/server"

const authorize = createServerFn({ method: "GET" })
  .validator(validateCliRequest)
  .handler(async ({ data }) => {
    if (!(await getSession()).user) throw new Error("Sign in before authorizing the CLI.")
    const config = cliAuthConfiguration(process.env)
    // OAuthConsent validates and submits this request through Clerk's browser SDK.
    // Stay on our origin so the existing development session is preserved.
    return `/cli/authorize?${new URLSearchParams({ ...data, client_id: config.clientId })}`
  })

export const Route = createFileRoute("/cli/login")({
  validateSearch: validateCliRequest,
  loader: () => getSession(),
  component: CliLogin,
  head: () => ({
    meta: [{ title: "Connect your CLI · SpawnKit" }, { name: "referrer", content: "strict-origin-when-cross-origin" }]
  })
})

function CliLogin() {
  const session = Route.useLoaderData()
  const search = Route.useSearch()
  const [error, setError] = useState("")
  useEffect(() => {
    if (!session.user) {
      sessionStorage.setItem("spawn-cli-return", window.location.pathname + window.location.search)
      return
    }
    sessionStorage.removeItem("spawn-cli-return")
    let active = true
    void authorize({ data: search })
      .then((url) => {
        if (active) window.location.assign(url)
      })
      .catch(() => {
        if (active) setError("We couldn’t start authorization. Return to your terminal and run spawn login again.")
      })
    return () => {
      active = false
    }
  }, [session.user, search])
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 text-xl font-bold">
          <Terminal className="size-6 text-primary" /> SpawnKit
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Developer tools</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Connect your CLI</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sign in to review the terminal’s access request. You’ll return to your terminal when you’re done.
          </p>
        </div>
        {!session.configured ? (
          <output>Authentication setup is required.</output>
        ) : !session.user ? (
          <ClerkAuth />
        ) : (
          <output>{error || "Preparing your authorization request…"}</output>
        )}
      </section>
    </main>
  )
}
