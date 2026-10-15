import { TaskChooseOrganization, TaskResetPassword, TaskSetupMFA, useClerk } from "@clerk/tanstack-react-start"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { authDestination } from "@/lib/auth-flow"
import { getSession } from "@/lib/server"
export const Route = createFileRoute("/session-tasks")({
  beforeLoad: async () => {
    if (!(await getSession()).configured) throw redirect({ to: "/sign-in" })
  },
  component: SessionTasks
})
function SessionTasks() {
  const clerk = useClerk()
  const task = clerk.session?.currentTask?.key
  useEffect(() => {
    if (clerk.loaded && !task)
      window.location.assign(clerk.session?.status === "active" ? authDestination() : "/sign-in")
  }, [clerk.loaded, clerk.session?.status, task])
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="flex flex-col items-center gap-5">
        {task === "choose-organization" && <TaskChooseOrganization redirectUrlComplete="/session-tasks" />}
        {task === "reset-password" && <TaskResetPassword redirectUrlComplete="/session-tasks" />}
        {task === "setup-mfa" && <TaskSetupMFA redirectUrlComplete="/session-tasks" />}
        <Button variant="ghost" onClick={() => void clerk.signOut({ redirectUrl: "/sign-in" })}>
          Back to sign in
        </Button>
      </div>
    </main>
  )
}
