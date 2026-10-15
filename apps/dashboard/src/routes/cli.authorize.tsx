import { OAuthConsent } from "@clerk/tanstack-react-start"
import { createFileRoute } from "@tanstack/react-router"
import { Terminal } from "lucide-react"
import { getSession } from "@/lib/server"

export const Route = createFileRoute("/cli/authorize")({
  loader: () => getSession(),
  head: () => ({
    meta: [{ title: "Authorize CLI · SpawnKit" }, { name: "referrer", content: "strict-origin-when-cross-origin" }]
  }),
  headers: () => ({
    "X-Frame-Options": "DENY",
    "Cache-Control": "no-store",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  }),
  component: CliAuthorize
})
function CliAuthorize() {
  const session = Route.useLoaderData()
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3 text-xl font-bold">
          <Terminal className="size-6 text-primary" /> spawn
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Developer tools</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Authorize your CLI</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Review the app, account, and permissions below. Only continue if you started this request in your terminal.
          </p>
        </div>
        {session.user ? (
          <OAuthConsent appearance={{ elements: { rootBox: "w-full", cardBox: "w-full shadow-sm" } }} />
        ) : (
          <output>Start with spawn login in your terminal to sign in and review access.</output>
        )}
      </section>
    </main>
  )
}
