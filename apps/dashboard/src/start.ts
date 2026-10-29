import { clerkMiddleware } from "@clerk/tanstack-react-start/server"
import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start"
import { authConfigured, authorizedParties } from "./lib/auth-config"
import { authFailureResponse } from "./lib/auth-failure"

const authErrors = createMiddleware().server(async ({ request, next }) => {
  try {
    const result = await next()
    const failure = authFailureResponse(result.response, request, import.meta.env.DEV)
    if (failure) throw failure
    return result
  } catch (error) {
    if (error instanceof Response) throw authFailureResponse(error, request, import.meta.env.DEV) ?? error
    throw error
  }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    authErrors,
    createCsrfMiddleware({ filter: (context) => context.handlerType === "serverFn" }),
    ...(import.meta.env.SSR && authConfigured(process.env)
      ? [clerkMiddleware({ signInUrl: "/sign-in", authorizedParties: authorizedParties(process.env) })]
      : [])
  ]
}))
