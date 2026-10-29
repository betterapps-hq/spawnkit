import { useUser } from "@clerk/tanstack-react-start"
import { useMutation } from "@tanstack/react-query"
import { Check, Users } from "lucide-react"
import { useSyncExternalStore } from "react"
import { communityRequest } from "../../lib/community"
import { PublicShell } from "../public/shell"
import { Button } from "../ui/button"
import { Notice } from "./design/safety-shared"
import "./community-pages.css"

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback)
  return () => window.removeEventListener("hashchange", callback)
}
export function TeamInvitationPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const token = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => ""
  )
  const accept = useMutation({ mutationFn: () => communityRequest("team/accept", { token }) })
  return (
    <PublicShell active="">
      <section className="community-invitation">
        <span className="community-invitation-icon">{accept.isSuccess ? <Check /> : <Users />}</span>
        <h1>{accept.isSuccess ? "You’re on the team" : "Join the SpawnKit team"}</h1>
        {accept.isSuccess ? (
          <Button asChild>
            <a href="/dashboard/team">Open team</a>
          </Button>
        ) : !isLoaded ? (
          <p>Loading account…</p>
        ) : !/^[a-f0-9]{64}$/.test(token) ? (
          <p>This invitation link is incomplete.</p>
        ) : (
          <>
            <p>
              {isSignedIn
                ? `Signed in as ${user.primaryEmailAddress?.emailAddress ?? user.username ?? "your account"}`
                : "Sign in with the email address that received this invitation."}
            </p>
            {accept.error && <Notice tone="red">{accept.error.message}</Notice>}
            {isSignedIn ? (
              <Button disabled={accept.isPending} onClick={() => accept.mutate()}>
                {accept.isPending ? "Joining…" : "Accept invitation"}
              </Button>
            ) : (
              <Button asChild>
                <a
                  href="/sign-in"
                  onClick={() => {
                    try {
                      window.sessionStorage.setItem("spawn-team-return", `/team/invitation#${token}`)
                    } catch {
                      /* The invitation remains usable after signing in and reopening it. */
                    }
                  }}
                >
                  Sign in
                </a>
              </Button>
            )}
          </>
        )}
      </section>
    </PublicShell>
  )
}
