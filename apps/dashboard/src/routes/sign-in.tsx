import { createFileRoute, redirect } from "@tanstack/react-router"
import { LockKeyhole } from "lucide-react"
import { Brand } from "@/components/brand"
import { ClerkAuth } from "@/components/clerk-auth"
import { LoginScene } from "@/components/login-scene"
import { getSession } from "@/lib/server"
import { Route as RootRoute } from "./__root"

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { flow?: "sign-up" } =>
    search.flow === "sign-up" ? { flow: "sign-up" } : {},
  beforeLoad: async () => {
    if ((await getSession()).user) throw redirect({ to: "/dashboard" })
  },
  component: SignInPage
})
function SignInPage() {
  const session = RootRoute.useLoaderData()
  const search = Route.useSearch()
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="flex min-h-screen min-w-0 flex-col p-6 sm:p-12">
        <Brand />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {session.configured ? (
            <ClerkAuth continueSignUp={search.flow === "sign-up"} />
          ) : (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">Sign in to SpawnKit</h1>
              <div className="mt-6 flex gap-3 rounded-lg border bg-card p-4 text-sm">
                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">Authentication setup required</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Clerk is not connected yet. The platform administrator needs to complete sign-in setup.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <LoginScene />
    </main>
  )
}
