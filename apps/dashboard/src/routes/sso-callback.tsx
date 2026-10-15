import { HandleSSOCallback } from "@clerk/tanstack-react-start"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { LoaderCircle } from "lucide-react"
import { navigateAfterAuth } from "@/lib/auth-flow"
import { getSession } from "@/lib/server"
export const Route = createFileRoute("/sso-callback")({
  beforeLoad: async () => {
    if (!(await getSession()).configured) throw redirect({ to: "/sign-in" })
  },
  component: () => (
    <main className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
        <HandleSSOCallback
          navigateToApp={navigateAfterAuth}
          navigateToSignIn={() => window.location.assign("/sign-in")}
          navigateToSignUp={() => window.location.assign("/sign-in?flow=sign-up")}
        />
      </div>
    </main>
  )
})
