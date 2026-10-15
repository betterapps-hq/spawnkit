import { clerkMiddleware } from "@clerk/tanstack-react-start/server"
import { createStart, createCsrfMiddleware } from "@tanstack/react-start"
import { authConfigured, authorizedParties } from "./lib/auth-config"

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({ filter: (context) => context.handlerType === "serverFn" }),
    ...(import.meta.env.SSR && authConfigured(process.env)
      ? [clerkMiddleware({ signInUrl: "/sign-in", authorizedParties: authorizedParties(process.env) })]
      : [])
  ]
}))
