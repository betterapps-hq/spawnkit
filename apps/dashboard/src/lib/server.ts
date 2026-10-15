import { auth, clerkClient } from "@clerk/tanstack-react-start/server"
import { templates, addons } from "@spawn/templates/catalog"
import { createServerFn } from "@tanstack/react-start"
import { authConfigured } from "./auth-config"

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  if (!authConfigured(process.env)) return { configured: false, user: null }
  const { userId } = await auth()
  if (!userId) return { configured: true, user: null }
  const user = await clerkClient().users.getUser(userId)
  return {
    configured: true,
    user: { id: user.id, email: user.primaryEmailAddress?.emailAddress ?? "", firstName: user.firstName }
  }
})
export const getCatalog = createServerFn({ method: "GET" }).handler(() => ({ templates, addons }))
